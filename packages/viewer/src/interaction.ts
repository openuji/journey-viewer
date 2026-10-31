import type {
  Entry,
  Exit,
  Journey,
  JourneyGraph,
  State,
} from "@journey-viewer/ujg-jsonld";

export interface ViewerSelection {
  readonly kind: "journey" | "state" | "entry" | "exit";
  readonly journeyId: string;
  readonly nodeId: string;
}

/** What a selection can name: a journey or one of its states, entries or exits. */
export type SelectedNode = Journey | State | Entry | Exit;

export interface ViewerInteraction {
  readonly selection: ViewerSelection | null;
  readonly expandedJourneys: readonly string[];
  /** Journeys whose entry/exit lists are shown; selecting an entry or exit opens its journey's list. */
  readonly openContracts: readonly string[];
}

/** Resolves only the selected journey's own members of the selected kind. */
export function resolveSelection(
  graph: JourneyGraph,
  selection: ViewerSelection,
): Readonly<{ journey: Journey; node: SelectedNode }> | undefined {
  const journey = graph.journeys.find(
    (node) => node.id === selection.journeyId,
  );
  if (!journey) return undefined;
  const candidates: readonly SelectedNode[] =
    selection.kind === "journey"
      ? [journey]
      : selection.kind === "state"
        ? journey.states
        : selection.kind === "entry"
          ? journey.entries
          : journey.exits;
  const node = candidates.find(
    (candidate) => candidate.id === selection.nodeId,
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
      left.journeyId === right.journeyId &&
      left.nodeId === right.nodeId)
  );
}

const mergeIds = (
  existing: readonly string[],
  additions: readonly string[],
): readonly string[] =>
  additions.reduce<readonly string[]>(
    (ids, id) => (ids.includes(id) ? ids : [...ids, id]),
    existing,
  );

/** The child journeys of the journey's own composite with this id. */
function childJourneys(journey: Journey, stateId: string) {
  const state = journey.states.find(
    (node) => node.id === stateId && node.kind === "composite",
  );
  return state?.kind === "composite" ? state.children : [];
}

function ancestorIds(
  graph: JourneyGraph,
  id: string,
  path: readonly string[] = [],
): readonly string[] {
  if (path.includes(id)) return [];
  const parents = graph.journeys.filter((journey) =>
    journey.states.some(
      (state) =>
        state.kind === "composite" &&
        state.children.some((child) => child.id === id),
    ),
  );
  return [
    id,
    ...parents.flatMap((parent) =>
      ancestorIds(graph, parent.id, [...path, id]),
    ),
  ];
}

export function createViewerInteraction(
  graph: JourneyGraph,
): ViewerInteraction {
  const journey = graph.roots[0] ?? graph.rootless[0];
  const states = journey?.states ?? [];
  const entry = journey?.entries.find(
    (node) => node.id === journey.defaultEntry,
  );
  const state = states.find((node) => node.id === entry?.target) ?? states[0];
  return {
    selection: journey
      ? {
          kind: state ? "state" : "journey",
          journeyId: journey.id,
          nodeId: state?.id ?? journey.id,
        }
      : null,
    expandedJourneys: [],
    openContracts: [],
  };
}

/** Selection reveals every explicit ancestry and all children of a selected composite. */
function select(
  graph: JourneyGraph,
  current: ViewerInteraction,
  selection: ViewerSelection,
  openChildren: boolean,
): ViewerInteraction {
  const resolved = resolveSelection(graph, selection);
  if (!resolved) return current;
  const children =
    selection.kind === "state" && openChildren
      ? childJourneys(resolved.journey, selection.nodeId).map((node) => node.id)
      : [];
  const expandedJourneys = mergeIds(current.expandedJourneys, [
    ...ancestorIds(graph, selection.journeyId),
    ...children,
  ]);
  const openContracts =
    selection.kind === "entry" || selection.kind === "exit"
      ? mergeIds(current.openContracts, [selection.journeyId])
      : current.openContracts;
  return sameSelection(current.selection, selection) &&
    expandedJourneys === current.expandedJourneys &&
    openContracts === current.openContracts
    ? current
    : { selection: { ...selection }, expandedJourneys, openContracts };
}

export function selectNode(
  graph: JourneyGraph,
  current: ViewerInteraction,
  selection: ViewerSelection,
): ViewerInteraction {
  return select(graph, current, selection, true);
}

/** Private screen-selection operation; preserves child disclosure state. */
export function selectScreenNode(
  graph: JourneyGraph,
  current: ViewerInteraction,
  selection: ViewerSelection,
): ViewerInteraction {
  return select(graph, current, selection, false);
}

/** A composite's complete child group is expanded or collapsed as one explicit action. */
export function toggleChildJourneys(
  graph: JourneyGraph,
  current: ViewerInteraction,
  journeyId: string,
  stateId: string,
): ViewerInteraction {
  const journey = graph.journeys.find((node) => node.id === journeyId);
  const ids = journey
    ? childJourneys(journey, stateId).map((node) => node.id)
    : [];
  if (ids.length === 0) return current;
  return {
    ...current,
    expandedJourneys: ids.some((id) => current.expandedJourneys.includes(id))
      ? current.expandedJourneys.filter((id) => !ids.includes(id))
      : mergeIds(current.expandedJourneys, ids),
  };
}

export function expandAllJourneys(
  graph: JourneyGraph,
  current: ViewerInteraction,
): ViewerInteraction {
  const ids = graph.journeys.map((node) => node.id);
  return ids.length === current.expandedJourneys.length &&
    ids.every((id) => current.expandedJourneys.includes(id))
    ? current
    : { ...current, expandedJourneys: ids };
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
  graph: JourneyGraph,
  current: ViewerInteraction,
  journeyId: string,
): ViewerInteraction {
  if (!graph.journeys.some((node) => node.id === journeyId)) return current;
  return {
    ...current,
    openContracts: current.openContracts.includes(journeyId)
      ? current.openContracts.filter((id) => id !== journeyId)
      : [...current.openContracts, journeyId],
  };
}
