import {
  getChildJourneys,
  getJourneyEntries,
  getJourneyExits,
  getJourneyStates,
  getNodesByType,
} from "@journey-viewer/ujg-jsonld";
import type {
  UjgDocument,
  UjgJourney,
  UjgNode,
} from "@journey-viewer/ujg-jsonld";
import { getJourneyStarts } from "@/journey-starts";

export interface ViewerSelection {
  readonly kind: "journey" | "state" | "entry" | "exit";
  readonly journeyRef: string;
  readonly nodeRef: string;
}

export interface ViewerInteraction {
  readonly selection: ViewerSelection | null;
  readonly expandedJourneys: readonly string[];
  /** Journeys whose entry/exit lists are shown; selecting an entry or exit opens its journey's list. */
  readonly openContracts: readonly string[];
}

/** Resolves only the selected journey's explicit, correctly typed members. */
export function resolveSelection(
  document: UjgDocument,
  selection: ViewerSelection,
): Readonly<{ journey: UjgJourney; node: UjgNode }> | undefined {
  const journey = getNodesByType(document, "Journey").find(
    (node) => node["@id"] === selection.journeyRef,
  );
  if (!journey) return undefined;
  const candidates =
    selection.kind === "journey"
      ? [journey]
      : selection.kind === "state"
        ? getJourneyStates(document, journey)
        : selection.kind === "entry"
          ? getJourneyEntries(document, journey)
          : getJourneyExits(document, journey);
  const node = candidates.find(
    (candidate) => candidate["@id"] === selection.nodeRef,
  );
  return node ? { journey, node } : undefined;
}

export function sameSelection(
  left: ViewerSelection | null,
  right: ViewerSelection | null,
): boolean {
  return (
    left === right ||
    (left !== null &&
      right !== null &&
      left.kind === right.kind &&
      left.journeyRef === right.journeyRef &&
      left.nodeRef === right.nodeRef)
  );
}

const mergeRefs = (
  existing: readonly string[],
  additions: readonly string[],
): readonly string[] =>
  additions.reduce<readonly string[]>(
    (refs, ref) => (refs.includes(ref) ? refs : [...refs, ref]),
    existing,
  );

function childJourneys(
  document: UjgDocument,
  journey: UjgJourney,
  stateRef: string,
) {
  const composite = getNodesByType(document, "CompositeState").find(
    (state) =>
      state["@id"] === stateRef && journey.stateRefs.includes(stateRef),
  );
  return composite ? getChildJourneys(document, composite) : [];
}

function ancestorRefs(
  document: UjgDocument,
  ref: string,
  path: readonly string[] = [],
): readonly string[] {
  if (path.includes(ref)) return [];
  const parents = getNodesByType(document, "Journey").filter((journey) =>
    getJourneyStates(document, journey).some((state) =>
      childJourneys(document, journey, state["@id"]).some(
        (child) => child["@id"] === ref,
      ),
    ),
  );
  return [
    ref,
    ...parents.flatMap((parent) =>
      ancestorRefs(document, parent["@id"], [...path, ref]),
    ),
  ];
}

export function createViewerInteraction(
  document: UjgDocument,
): ViewerInteraction {
  const { roots, rootless } = getJourneyStarts(document);
  const journey = roots[0] ?? rootless[0];
  const states = journey ? getJourneyStates(document, journey) : [];
  const entry = journey
    ? getJourneyEntries(document, journey).find(
        (node) => node["@id"] === journey.defaultEntryRef,
      )
    : undefined;
  const state =
    states.find((node) => node["@id"] === entry?.stateRef) ?? states[0];
  return {
    selection: journey
      ? {
          kind: state ? "state" : "journey",
          journeyRef: journey["@id"],
          nodeRef: state?.["@id"] ?? journey["@id"],
        }
      : null,
    expandedJourneys: getNodesByType(document, "Journey").map(
      (node) => node["@id"],
    ),
    openContracts: [],
  };
}

/** Selection reveals every explicit ancestry and all children of a selected composite. */
function select(
  document: UjgDocument,
  current: ViewerInteraction,
  selection: ViewerSelection,
  openChildren: boolean,
): ViewerInteraction {
  const resolved = resolveSelection(document, selection);
  if (!resolved) return current;
  const children =
    selection.kind === "state" && openChildren
      ? childJourneys(document, resolved.journey, selection.nodeRef).map(
          (node) => node["@id"],
        )
      : [];
  const expandedJourneys = mergeRefs(current.expandedJourneys, [
    ...ancestorRefs(document, selection.journeyRef),
    ...children,
  ]);
  const openContracts =
    selection.kind === "entry" || selection.kind === "exit"
      ? mergeRefs(current.openContracts, [selection.journeyRef])
      : current.openContracts;
  return sameSelection(current.selection, selection) &&
    expandedJourneys === current.expandedJourneys &&
    openContracts === current.openContracts
    ? current
    : { selection: { ...selection }, expandedJourneys, openContracts };
}

export function selectNode(
  document: UjgDocument,
  current: ViewerInteraction,
  selection: ViewerSelection,
): ViewerInteraction {
  return select(document, current, selection, true);
}

/** Private screen-selection operation; preserves child disclosure state. */
export function selectScreenNode(
  document: UjgDocument,
  current: ViewerInteraction,
  selection: ViewerSelection,
): ViewerInteraction {
  return select(document, current, selection, false);
}

/** A composite's complete child group is expanded or collapsed as one explicit action. */
export function toggleChildJourneys(
  document: UjgDocument,
  current: ViewerInteraction,
  journeyRef: string,
  stateRef: string,
): ViewerInteraction {
  const journey = getNodesByType(document, "Journey").find(
    (node) => node["@id"] === journeyRef,
  );
  const refs = journey
    ? childJourneys(document, journey, stateRef).map((node) => node["@id"])
    : [];
  if (refs.length === 0) return current;
  return {
    ...current,
    expandedJourneys: refs.some((ref) => current.expandedJourneys.includes(ref))
      ? current.expandedJourneys.filter((ref) => !refs.includes(ref))
      : mergeRefs(current.expandedJourneys, refs),
  };
}

export function expandAllJourneys(
  document: UjgDocument,
  current: ViewerInteraction,
): ViewerInteraction {
  const refs = getNodesByType(document, "Journey").map((node) => node["@id"]);
  return refs.length === current.expandedJourneys.length &&
    refs.every((ref) => current.expandedJourneys.includes(ref))
    ? current
    : { ...current, expandedJourneys: refs };
}

export function collapseAllJourneys(
  current: ViewerInteraction,
): ViewerInteraction {
  return current.expandedJourneys.length === 0
    ? current
    : { ...current, expandedJourneys: [] };
}

/** Shows or hides one journey's entry/exit list. Unknown journeys are no-ops. */
export function toggleContracts(
  document: UjgDocument,
  current: ViewerInteraction,
  journeyRef: string,
): ViewerInteraction {
  if (
    !getNodesByType(document, "Journey").some(
      (node) => node["@id"] === journeyRef,
    )
  )
    return current;
  return {
    ...current,
    openContracts: current.openContracts.includes(journeyRef)
      ? current.openContracts.filter((ref) => ref !== journeyRef)
      : [...current.openContracts, journeyRef],
  };
}
