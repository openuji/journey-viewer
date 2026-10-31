import {
  entryInto,
  exitFrom,
  journeyTouchpoints,
} from "@journey-viewer/ujg-jsonld";
import type {
  Journey,
  JourneyGraph,
  Transition,
} from "@journey-viewer/ujg-jsonld";
import {
  createViewerInteraction,
  resolveSelection,
  sameSelection,
  selectNode,
} from "@/interaction";
import type {
  SelectedNode,
  ViewerInteraction,
  ViewerSelection,
} from "@/interaction";
import {
  childOccurrence,
  getOccurrenceTrail,
  journeyOccurrences,
  sameOccurrence,
} from "@/occurrence";
import type { ViewerOccurrence } from "@/occurrence";
import { getOccurrenceLabels } from "@/occurrence-presentation";
import type { ViewerLightbox } from "@/screens";

export type ViewerMode = "tree" | "columns";

export interface ViewerNavigation {
  readonly mode: ViewerMode;
  /**
   * Column occurrences, in display order: the selection's explicit call path plus the children of
   * a selected composite. Updated on navigation while in columns mode and when switching to it.
   */
  readonly lanes: readonly ViewerOccurrence[];
  readonly occurrence: ViewerOccurrence | null;
  readonly query: string;
  /** At most one touchpoint; empty matches every journey. */
  readonly touchpointIds: readonly string[];
  readonly hover: ViewerSelection | null;
  readonly hoverOccurrence: ViewerOccurrence | null;
}

/** Change selection through navigateViewer/pickSearchResult to retain matching occurrence context. */
export interface ViewerSnapshot {
  readonly interaction: ViewerInteraction;
  readonly navigation: ViewerNavigation;
  readonly lightbox: ViewerLightbox | null;
}

export interface ViewerTarget {
  readonly selection: ViewerSelection;
  readonly occurrence: ViewerOccurrence;
}

export interface ViewerNavigationItem extends ViewerTarget {
  readonly label: string;
  readonly context: string;
}

/** Relation of a state row to the active (hovered, else selected) state of the same journey. */
export interface ViewerRowHighlight {
  readonly tone: "active" | "incoming" | "outgoing" | "both" | "dim";
  /** Transitions from the row to the active state. */
  readonly incoming: number;
  /** Transitions from the active state to the row. */
  readonly outgoing: number;
}

const selectionFor = (
  journey: Journey,
  node: SelectedNode,
  kind: ViewerSelection["kind"],
): ViewerSelection => ({
  kind,
  journeyId: journey.id,
  nodeId: node.id,
});
const sameLanes = (
  left: readonly ViewerOccurrence[],
  right: readonly ViewerOccurrence[],
) =>
  left.length === right.length &&
  left.every((lane, index) => sameOccurrence(lane, right[index] ?? null));

/** The occurrence's explicit call path, plus every resolvable child of a selected composite when opened. */
export function getLanePath(
  graph: JourneyGraph,
  occurrence: ViewerOccurrence,
  selection: ViewerSelection | null,
  openComposite: boolean,
): readonly ViewerOccurrence[] {
  const trail = getOccurrenceTrail(graph, occurrence);
  const journey = trail.at(-1)?.journey;
  const lanes = trail.map((crumb) => crumb.occurrence);
  if (
    !openComposite ||
    !journey ||
    selection?.kind !== "state" ||
    selection.journeyId !== journey.id
  )
    return lanes;
  const stateIndex = journey.states.findIndex(
    (state) => state.id === selection.nodeId && state.kind === "composite",
  );
  const composite = journey.states[stateIndex];
  if (composite?.kind !== "composite") return lanes;
  return [
    ...lanes,
    ...composite.children
      .map((_, childIndex) =>
        childOccurrence(occurrence, stateIndex, childIndex),
      )
      .filter((path) => getOccurrenceTrail(graph, path).length > 0),
  ];
}

export function createViewerSnapshot(graph: JourneyGraph): ViewerSnapshot {
  const interaction = createViewerInteraction(graph);
  const start = journeyOccurrences(graph).next().value;
  const occurrence = start?.occurrence ?? null;
  return {
    interaction,
    navigation: {
      mode: "tree",
      lanes: occurrence
        ? getLanePath(graph, occurrence, interaction.selection, false)
        : [],
      occurrence,
      query: "",
      touchpointIds: [],
      hover: null,
      hoverOccurrence: null,
    },
    lightbox: null,
  };
}

function navigate(
  graph: JourneyGraph,
  current: ViewerSnapshot,
  target: ViewerTarget,
  query: string,
): ViewerSnapshot {
  const journey = getOccurrenceTrail(graph, target.occurrence).at(-1)?.journey;
  if (
    journey?.id !== target.selection.journeyId ||
    !resolveSelection(graph, target.selection)
  )
    return current;
  const interaction = selectNode(graph, current.interaction, target.selection);
  const navigation = current.navigation;
  const lanes =
    navigation.mode === "columns"
      ? getLanePath(graph, target.occurrence, target.selection, true)
      : navigation.lanes;
  const unchangedLanes = sameLanes(lanes, navigation.lanes);
  if (
    interaction === current.interaction &&
    sameOccurrence(navigation.occurrence, target.occurrence) &&
    unchangedLanes &&
    navigation.query === query &&
    navigation.hover === null &&
    current.lightbox === null
  )
    return current;
  return {
    ...current,
    interaction,
    navigation: {
      ...navigation,
      occurrence: target.occurrence,
      lanes: unchangedLanes ? navigation.lanes : lanes,
      query,
      hover: null,
      hoverOccurrence: null,
    },
    lightbox: null,
  };
}

/** Selection and occurrence update together; ordinary navigation preserves search text. */
export function navigateViewer(
  graph: JourneyGraph,
  current: ViewerSnapshot,
  target: ViewerTarget,
): ViewerSnapshot {
  return navigate(graph, current, target, current.navigation.query);
}

/** A search pick clears the query only after the target and its occurrence resolve. */
export function pickSearchResult(
  graph: JourneyGraph,
  current: ViewerSnapshot,
  target: ViewerTarget,
): ViewerSnapshot {
  return navigate(graph, current, target, "");
}

/** Switching to columns derives lanes from the current selection and occurrence; tree keeps expansion. */
export function setViewMode(
  graph: JourneyGraph,
  current: ViewerSnapshot,
  mode: ViewerMode,
): ViewerSnapshot {
  const navigation = current.navigation;
  if (mode !== "tree" && mode !== "columns") return current;
  const lanes =
    mode === "columns" && navigation.occurrence
      ? getLanePath(
          graph,
          navigation.occurrence,
          current.interaction.selection,
          true,
        )
      : navigation.lanes;
  if (navigation.mode === mode && sameLanes(lanes, navigation.lanes))
    return current;
  return {
    ...current,
    navigation: {
      ...navigation,
      mode,
      lanes: sameLanes(lanes, navigation.lanes) ? navigation.lanes : lanes,
      hover: null,
      hoverOccurrence: null,
    },
  };
}

export function setSearchQuery(
  current: ViewerSnapshot,
  query: string,
): ViewerSnapshot {
  return query === current.navigation.query
    ? current
    : { ...current, navigation: { ...current.navigation, query } };
}

/** Single-select touchpoint filter; null shows every journey. Assignments are explicit and never inherited. */
export function selectTouchpoint(
  graph: JourneyGraph,
  current: ViewerSnapshot,
  id: string | null,
): ViewerSnapshot {
  if (id !== null && !graph.touchpoints.some((node) => node.id === id))
    return current;
  const ids = current.navigation.touchpointIds;
  if (id === null ? ids.length === 0 : ids.length === 1 && ids[0] === id)
    return current;
  return {
    ...current,
    navigation: {
      ...current.navigation,
      touchpointIds: id === null ? [] : [id],
    },
  };
}

export function hoverNode(
  graph: JourneyGraph,
  current: ViewerSnapshot,
  hover: ViewerSelection | null,
  occurrence: ViewerOccurrence | null = null,
): ViewerSnapshot {
  if (
    hover &&
    (!resolveSelection(graph, hover) ||
      (occurrence &&
        getOccurrenceTrail(graph, occurrence).at(-1)?.journey.id !==
          hover.journeyId))
  )
    return current;
  const hoverOccurrence = hover ? occurrence : null;
  if (
    sameSelection(current.navigation.hover, hover) &&
    sameOccurrence(current.navigation.hoverOccurrence, hoverOccurrence)
  )
    return current;
  return {
    ...current,
    navigation: {
      ...current.navigation,
      hover: hover ? { ...hover } : null,
      hoverOccurrence,
    },
  };
}

/** Only local, explicitly listed transitions produce row highlights. Hover takes precedence over selection. */
export function getRowHighlight(
  graph: JourneyGraph,
  interaction: ViewerInteraction,
  navigation: ViewerNavigation | undefined,
  journeyId: string,
  stateId: string,
): ViewerRowHighlight | undefined {
  const active = navigation?.hover ?? interaction.selection;
  if (!active || active.kind !== "state" || active.journeyId !== journeyId)
    return undefined;
  const journey = resolveSelection(graph, active)?.journey;
  if (!journey) return undefined;
  if (active.nodeId === stateId)
    return { tone: "active", incoming: 0, outgoing: 0 };
  const incoming = journey.transitions.filter(
    (edge) => edge.from === stateId && edge.to === active.nodeId,
  ).length;
  const outgoing = journey.transitions.filter(
    (edge) => edge.from === active.nodeId && edge.to === stateId,
  ).length;
  return {
    tone:
      incoming && outgoing
        ? "both"
        : incoming
          ? "incoming"
          : outgoing
            ? "outgoing"
            : "dim",
    incoming,
    outgoing,
  };
}

/** Plain-text explanation of the routes behind a row's marks, relative to the active state. */
export function getRouteDescription(
  graph: JourneyGraph,
  navigation: ViewerNavigation | undefined,
  interaction: ViewerInteraction,
  journeyId: string,
  stateId: string,
): string {
  const active = navigation?.hover ?? interaction.selection;
  const journey =
    active?.kind === "state" && active.journeyId === journeyId
      ? resolveSelection(graph, active)?.journey
      : undefined;
  if (!active || !journey) return "";
  const nodeLabel = (id: string) =>
    graph.states.find((node) => node.id === id)?.label ?? id;
  const describe = (heading: string, edges: readonly Transition[]) =>
    edges.length ? [heading, ...edges.map((edge) => `• ${edge.label}`)] : [];
  return [
    ...describe(
      `${nodeLabel(stateId)} → ${nodeLabel(active.nodeId)}:`,
      journey.transitions.filter(
        (edge) => edge.from === stateId && edge.to === active.nodeId,
      ),
    ),
    ...describe(
      `${nodeLabel(active.nodeId)} → ${nodeLabel(stateId)}:`,
      journey.transitions.filter(
        (edge) => edge.from === active.nodeId && edge.to === stateId,
      ),
    ),
  ].join("\n");
}

export function matchesTouchpoints(
  graph: JourneyGraph,
  journeyId: string,
  ids: readonly string[],
): boolean {
  return (
    ids.length === 0 ||
    journeyTouchpoints(graph, journeyId).some((node) => ids.includes(node.id))
  );
}

export function getViewerSummary(
  graph: JourneyGraph,
  ids: readonly string[] = [],
) {
  return {
    journeys: graph.journeys.length,
    states: graph.states.length,
    entries: graph.entries.length,
    exits: graph.exits.length,
    transitions: graph.transitions.length,
    matchingJourneys: graph.journeys.filter((journey) =>
      matchesTouchpoints(graph, journey.id, ids),
    ).length,
  } as const;
}

export function occurrenceLabel(
  graph: JourneyGraph,
  occurrence: ViewerOccurrence,
): string {
  return getOccurrenceLabels(graph, occurrence)
    .map((crumb) =>
      crumb.viaLabel ? `via ${crumb.viaLabel} / ${crumb.label}` : crumb.label,
    )
    .join(" / ");
}

/** Bounded results, computed in display order; no results for a blank query. */
export function searchViewer(
  graph: JourneyGraph,
  query: string,
  touchpointIds: readonly string[] = [],
): readonly ViewerNavigationItem[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  const results: ViewerNavigationItem[] = [];
  for (const { journey, occurrence } of journeyOccurrences(graph)) {
    if (!matchesTouchpoints(graph, journey.id, touchpointIds)) continue;
    const candidates = [
      { node: journey, kind: "journey" },
      ...journey.states.map((node) => ({ node, kind: "state" }) as const),
      ...journey.entries.map((node) => ({ node, kind: "entry" }) as const),
      ...journey.exits.map((node) => ({ node, kind: "exit" }) as const),
    ] as const;
    for (const { node, kind } of candidates) {
      if (
        ![node.label, node.id, ...node.tags]
          .join(" ")
          .toLowerCase()
          .includes(needle)
      )
        continue;
      results.push({
        selection: selectionFor(journey, node, kind),
        occurrence,
        label: node.label,
        context: occurrenceLabel(graph, occurrence),
      });
      if (results.length === 18) return results;
    }
  }
  return results;
}

/** Navigation follows explicit local targets and explicit boundary mappings only. */
export function getNavigationItems(
  graph: JourneyGraph,
  selection: ViewerSelection | null,
  occurrence: ViewerOccurrence | null,
): readonly ViewerNavigationItem[] {
  if (!selection || !occurrence) return [];
  const journey = getOccurrenceTrail(graph, occurrence).at(-1)?.journey;
  if (
    journey?.id !== selection.journeyId ||
    !resolveSelection(graph, selection)
  )
    return [];
  const target = (
    owner: Journey,
    path: ViewerOccurrence,
    id: string,
    prefix: string,
  ): readonly ViewerNavigationItem[] => {
    const state = owner.states.find((node) => node.id === id);
    const entry = owner.entries.find((node) => node.id === id);
    const exit = owner.exits.find((node) => node.id === id);
    const node = state ?? entry ?? exit;
    return node
      ? [
          {
            selection: selectionFor(
              owner,
              node,
              state ? "state" : entry ? "entry" : "exit",
            ),
            occurrence: path,
            label: `${prefix}: ${node.label}`,
            context: occurrenceLabel(graph, path),
          },
        ]
      : [];
  };
  // The child contract an explicit mapping names, at every occurrence of the composite's children.
  const boundaryTargets = (edge: Transition, direction: "entry" | "exit") =>
    journey.states.flatMap((state, stateIndex) =>
      state.kind === "composite" &&
      state.id === (direction === "entry" ? edge.to : edge.from)
        ? state.children.flatMap((child, childIndex) => {
            const path = childOccurrence(occurrence, stateIndex, childIndex);
            if (getOccurrenceTrail(graph, path).length === 0) return [];
            const contract =
              direction === "entry"
                ? entryInto(edge, child)
                : exitFrom(edge, child);
            return contract
              ? target(
                  child,
                  path,
                  contract.id,
                  direction === "entry" ? "Enter child" : "Child exit",
                )
              : [];
          })
        : [],
    );
  if (selection.kind === "journey")
    return [
      ...journey.states.flatMap((node) =>
        target(journey, occurrence, node.id, "State"),
      ),
      ...journey.entries.flatMap((node) =>
        target(journey, occurrence, node.id, "Entry"),
      ),
      ...journey.exits.flatMap((node) =>
        target(journey, occurrence, node.id, "Exit"),
      ),
    ];
  const local = [
    ...(selection.kind === "entry"
      ? journey.entries
          .filter((entry) => entry.id === selection.nodeId)
          .flatMap((entry) =>
            target(journey, occurrence, entry.target, "Starts at"),
          )
      : []),
    ...journey.transitions.flatMap((edge) => [
      ...(edge.to === selection.nodeId
        ? [
            ...target(
              journey,
              occurrence,
              edge.from,
              `Incoming · ${edge.label}`,
            ),
            ...(edge.fromExit ? boundaryTargets(edge, "exit") : []),
            ...(edge.toEntry ? boundaryTargets(edge, "entry") : []),
          ]
        : []),
      ...(edge.from === selection.nodeId
        ? [
            ...target(journey, occurrence, edge.to, `Outgoing · ${edge.label}`),
            ...(edge.toEntry ? boundaryTargets(edge, "entry") : []),
            ...(edge.fromExit ? boundaryTargets(edge, "exit") : []),
          ]
        : []),
    ]),
    ...(selection.kind === "state"
      ? journey.states.flatMap((state, stateIndex) =>
          state.kind === "composite" && state.id === selection.nodeId
            ? state.children.flatMap((child, childIndex) => {
                const path = childOccurrence(
                  occurrence,
                  stateIndex,
                  childIndex,
                );
                return getOccurrenceTrail(graph, path).length
                  ? [
                      {
                        selection: selectionFor(child, child, "journey"),
                        occurrence: path,
                        label: `Nested journey: ${child.label}`,
                        context: occurrenceLabel(graph, path),
                      },
                    ]
                  : [];
              })
            : [],
        )
      : []),
  ];
  if (selection.kind !== "entry" && selection.kind !== "exit") return local;
  // Enumerate every caller occurrence. Shared journeys never acquire a preferred parent.
  const callers: ViewerNavigationItem[] = [];
  for (const { journey: parent, occurrence: parentPath } of journeyOccurrences(
    graph,
  )) {
    for (const edge of parent.transitions) {
      const stateId = selection.kind === "entry" ? edge.to : edge.from;
      const contractId =
        selection.kind === "entry" ? edge.toEntry : edge.fromExit;
      const composite = parent.states.find(
        (state) => state.id === stateId && state.kind === "composite",
      );
      if (
        contractId !== selection.nodeId ||
        composite?.kind !== "composite" ||
        !composite.children.some((child) => child.id === journey.id)
      )
        continue;
      callers.push(
        ...target(
          parent,
          parentPath,
          selection.kind === "entry" ? edge.from : edge.to,
          `${selection.kind === "entry" ? "Call site" : "Parent continuation"} · ${edge.label}`,
        ),
      );
    }
  }
  return [...local, ...callers];
}
