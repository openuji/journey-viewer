import { getChildJourneys, getJourneyStates, getNodesByType } from "@journey-viewer/ujg-jsonld";
import type { UjgDocument, UjgJourney } from "@journey-viewer/ujg-jsonld";
import { getJourneyStarts } from "./journey-starts.js";

/** Indices address the query results, including repeated state/child references. */
export interface ViewerOccurrence {
  readonly startJourneyRef: string;
  readonly steps: readonly Readonly<{ stateIndex: number; childIndex: number }>[];
}

export interface OccurrenceCrumb {
  readonly journey: UjgJourney;
  readonly occurrence: ViewerOccurrence;
  readonly viaStateRef?: string;
}

export function childOccurrence(parent: ViewerOccurrence, stateIndex: number, childIndex: number): ViewerOccurrence {
  return { startJourneyRef: parent.startJourneyRef, steps: [...parent.steps, { stateIndex, childIndex }] };
}

/** Stable text identity of an occurrence, for DOM markers and React keys. */
export function occurrenceKey(occurrence: ViewerOccurrence): string {
  return [occurrence.startJourneyRef, ...occurrence.steps.map((step) => `${step.stateIndex}.${step.childIndex}`)].join(" ");
}

export function sameOccurrence(left: ViewerOccurrence | null, right: ViewerOccurrence | null): boolean {
  return left === right || (left !== null && right !== null && left.startJourneyRef === right.startJourneyRef
    && left.steps.length === right.steps.length && left.steps.every((step, index) => (
      step.stateIndex === right.steps[index]?.stateIndex && step.childIndex === right.steps[index]?.childIndex
    )));
}

/** Resolves a finite rendered occurrence, never choosing a parent for a shared journey. */
export function getOccurrenceTrail(document: UjgDocument, occurrence: ViewerOccurrence): readonly OccurrenceCrumb[] {
  const { roots, rootless } = getJourneyStarts(document);
  const start = [...roots, ...rootless].find((journey) => journey["@id"] === occurrence.startJourneyRef);
  if (!start) return [];
  const composites = getNodesByType(document, "CompositeState");
  let trail: readonly OccurrenceCrumb[] = [{ journey: start, occurrence: { startJourneyRef: start["@id"], steps: [] } }];
  for (const step of occurrence.steps) {
    if (!Number.isInteger(step.stateIndex) || !Number.isInteger(step.childIndex) || step.stateIndex < 0 || step.childIndex < 0) return [];
    const parent = trail.at(-1)!;
    const state = getJourneyStates(document, parent.journey)[step.stateIndex];
    const composite = composites.find((node) => node === state);
    const child = composite ? getChildJourneys(document, composite)[step.childIndex] : undefined;
    if (!child || trail.some(({ journey }) => journey["@id"] === child["@id"])) return [];
    trail = [...trail, { journey: child, occurrence: childOccurrence(parent.occurrence, step.stateIndex, step.childIndex), viaStateRef: composite!["@id"] }];
  }
  return trail;
}

/** Ephemeral traversal of original nodes; recursion ends at the current ancestry. */
export function* journeyOccurrences(document: UjgDocument): Generator<OccurrenceCrumb> {
  const { roots, rootless } = getJourneyStarts(document);
  const composites = getNodesByType(document, "CompositeState");
  function* visit(journey: UjgJourney, occurrence: ViewerOccurrence, ancestors: readonly string[]): Generator<OccurrenceCrumb> {
    if (ancestors.includes(journey["@id"])) return;
    yield { journey, occurrence };
    const states = getJourneyStates(document, journey);
    for (const [stateIndex, state] of states.entries()) {
      const composite = composites.find((node) => node === state);
      if (!composite) continue;
      for (const [childIndex, child] of getChildJourneys(document, composite).entries()) {
        yield* visit(child, childOccurrence(occurrence, stateIndex, childIndex), [...ancestors, journey["@id"]]);
      }
    }
  }
  for (const journey of [...roots, ...rootless]) {
    yield* visit(journey, { startJourneyRef: journey["@id"], steps: [] }, []);
  }
}
