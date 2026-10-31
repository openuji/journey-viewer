import type { Journey, JourneyGraph } from "@journey-viewer/ujg-jsonld";

/** Indices address the graph's lists, including repeated state/child references. */
export interface ViewerOccurrence {
  readonly startJourneyId: string;
  readonly steps: readonly Readonly<{
    stateIndex: number;
    childIndex: number;
  }>[];
}

export interface OccurrenceCrumb {
  readonly journey: Journey;
  readonly occurrence: ViewerOccurrence;
  readonly viaStateId?: string;
}

export function childOccurrence(
  parent: ViewerOccurrence,
  stateIndex: number,
  childIndex: number,
): ViewerOccurrence {
  return {
    startJourneyId: parent.startJourneyId,
    steps: [...parent.steps, { stateIndex, childIndex }],
  };
}

/** Stable text identity of an occurrence, for DOM markers and React keys. */
export function occurrenceKey(occurrence: ViewerOccurrence): string {
  return [
    occurrence.startJourneyId,
    ...occurrence.steps.map((step) => `${step.stateIndex}.${step.childIndex}`),
  ].join(" ");
}

export function sameOccurrence(
  left: ViewerOccurrence | null,
  right: ViewerOccurrence | null,
): boolean {
  return (
    left === right ||
    (left !== null &&
      right !== null &&
      left.startJourneyId === right.startJourneyId &&
      left.steps.length === right.steps.length &&
      left.steps.every(
        (step, index) =>
          step.stateIndex === right.steps[index]?.stateIndex &&
          step.childIndex === right.steps[index]?.childIndex,
      ))
  );
}

/** Resolves a finite rendered occurrence, never choosing a parent for a shared journey. */
export function getOccurrenceTrail(
  graph: JourneyGraph,
  occurrence: ViewerOccurrence,
): readonly OccurrenceCrumb[] {
  const start = [...graph.roots, ...graph.rootless].find(
    (journey) => journey.id === occurrence.startJourneyId,
  );
  if (!start) return [];
  let trail: readonly OccurrenceCrumb[] = [
    {
      journey: start,
      occurrence: { startJourneyId: start.id, steps: [] },
    },
  ];
  for (const step of occurrence.steps) {
    if (
      !Number.isInteger(step.stateIndex) ||
      !Number.isInteger(step.childIndex) ||
      step.stateIndex < 0 ||
      step.childIndex < 0
    )
      return [];
    const parent = trail.at(-1)!;
    const state = parent.journey.states[step.stateIndex];
    const child =
      state?.kind === "composite" ? state.children[step.childIndex] : undefined;
    if (
      !state ||
      !child ||
      trail.some(({ journey }) => journey.id === child.id)
    )
      return [];
    trail = [
      ...trail,
      {
        journey: child,
        occurrence: childOccurrence(
          parent.occurrence,
          step.stateIndex,
          step.childIndex,
        ),
        viaStateId: state.id,
      },
    ];
  }
  return trail;
}

/** Ephemeral traversal of the graph; recursion ends at the current ancestry. */
export function* journeyOccurrences(
  graph: JourneyGraph,
): Generator<OccurrenceCrumb> {
  function* visit(
    journey: Journey,
    occurrence: ViewerOccurrence,
    ancestors: readonly string[],
  ): Generator<OccurrenceCrumb> {
    if (ancestors.includes(journey.id)) return;
    yield { journey, occurrence };
    for (const [stateIndex, state] of journey.states.entries()) {
      if (state.kind !== "composite") continue;
      for (const [childIndex, child] of state.children.entries()) {
        yield* visit(
          child,
          childOccurrence(occurrence, stateIndex, childIndex),
          [...ancestors, journey.id],
        );
      }
    }
  }
  for (const journey of [...graph.roots, ...graph.rootless]) {
    yield* visit(journey, { startJourneyId: journey.id, steps: [] }, []);
  }
}
