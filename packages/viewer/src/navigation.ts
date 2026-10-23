import {
  getChildJourneys, getJourneyEntries, getJourneyExits, getJourneyStates,
  getJourneyTouchpoints, getJourneyTransitions, getNode, getNodesByType,
} from "@journey-viewer/ujg-jsonld";
import type { UjgDocument, UjgJourney, UjgNode, UjgTransition } from "@journey-viewer/ujg-jsonld";
import { createViewerInteraction, resolveSelection, sameSelection, selectNode } from "./interaction.js";
import type { ViewerInteraction, ViewerSelection } from "./interaction.js";
import { childOccurrence, getOccurrenceTrail, journeyOccurrences, sameOccurrence } from "./occurrence.js";
import type { ViewerOccurrence } from "./occurrence.js";
import { getOccurrenceLabels } from "./occurrence-presentation.js";
import type { ViewerLightbox } from "./screens.js";

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
  readonly touchpointRefs: readonly string[];
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

const label = (node: UjgNode) => typeof node.label === "string" ? node.label : node["@id"];
const selectionFor = (journey: UjgJourney, node: UjgNode, kind: ViewerSelection["kind"]): ViewerSelection => (
  { kind, journeyRef: journey["@id"], nodeRef: node["@id"] }
);
const sameLanes = (left: readonly ViewerOccurrence[], right: readonly ViewerOccurrence[]) => (
  left.length === right.length && left.every((lane, index) => sameOccurrence(lane, right[index] ?? null))
);

/** The occurrence's explicit call path, plus every resolvable child of a selected composite when opened. */
export function getLanePath(
  document: UjgDocument, occurrence: ViewerOccurrence, selection: ViewerSelection | null, openComposite: boolean,
): readonly ViewerOccurrence[] {
  const trail = getOccurrenceTrail(document, occurrence);
  const journey = trail.at(-1)?.journey;
  const lanes = trail.map((crumb) => crumb.occurrence);
  if (!openComposite || !journey || selection?.kind !== "state" || selection.journeyRef !== journey["@id"]) return lanes;
  const states = getJourneyStates(document, journey);
  const composites = getNodesByType(document, "CompositeState");
  const stateIndex = states.findIndex((state) => state["@id"] === selection.nodeRef && composites.some((node) => node === state));
  const composite = composites.find((node) => node === states[stateIndex]);
  if (!composite) return lanes;
  return [...lanes, ...getChildJourneys(document, composite)
    .map((_, childIndex) => childOccurrence(occurrence, stateIndex, childIndex))
    .filter((path) => getOccurrenceTrail(document, path).length > 0)];
}

export function createViewerSnapshot(document: UjgDocument): ViewerSnapshot {
  const interaction = createViewerInteraction(document);
  const start = journeyOccurrences(document).next().value;
  const occurrence = start?.occurrence ?? null;
  return {
    interaction,
    navigation: {
      mode: "tree", lanes: occurrence ? getLanePath(document, occurrence, interaction.selection, false) : [],
      occurrence, query: "", touchpointRefs: [], hover: null, hoverOccurrence: null,
    },
    lightbox: null,
  };
}

function navigate(
  document: UjgDocument, current: ViewerSnapshot, target: ViewerTarget, query: string,
): ViewerSnapshot {
  const journey = getOccurrenceTrail(document, target.occurrence).at(-1)?.journey;
  if (journey?.["@id"] !== target.selection.journeyRef || !resolveSelection(document, target.selection)) return current;
  const interaction = selectNode(document, current.interaction, target.selection);
  const navigation = current.navigation;
  const lanes = navigation.mode === "columns" ? getLanePath(document, target.occurrence, target.selection, true) : navigation.lanes;
  const unchangedLanes = sameLanes(lanes, navigation.lanes);
  if (interaction === current.interaction && sameOccurrence(navigation.occurrence, target.occurrence) && unchangedLanes
    && navigation.query === query && navigation.hover === null && current.lightbox === null) return current;
  return {
    ...current, interaction,
    navigation: { ...navigation, occurrence: target.occurrence, lanes: unchangedLanes ? navigation.lanes : lanes, query, hover: null, hoverOccurrence: null },
    lightbox: null,
  };
}

/** Selection and occurrence update together; ordinary navigation preserves search text. */
export function navigateViewer(document: UjgDocument, current: ViewerSnapshot, target: ViewerTarget): ViewerSnapshot {
  return navigate(document, current, target, current.navigation.query);
}

/** A search pick clears the query only after the target and its occurrence resolve. */
export function pickSearchResult(document: UjgDocument, current: ViewerSnapshot, target: ViewerTarget): ViewerSnapshot {
  return navigate(document, current, target, "");
}

/** Switching to columns derives lanes from the current selection and occurrence; tree keeps expansion. */
export function setViewMode(document: UjgDocument, current: ViewerSnapshot, mode: ViewerMode): ViewerSnapshot {
  const navigation = current.navigation;
  if (mode !== "tree" && mode !== "columns") return current;
  const lanes = mode === "columns" && navigation.occurrence
    ? getLanePath(document, navigation.occurrence, current.interaction.selection, true) : navigation.lanes;
  if (navigation.mode === mode && sameLanes(lanes, navigation.lanes)) return current;
  return { ...current, navigation: { ...navigation, mode, lanes: sameLanes(lanes, navigation.lanes) ? navigation.lanes : lanes, hover: null, hoverOccurrence: null } };
}

export function setSearchQuery(current: ViewerSnapshot, query: string): ViewerSnapshot {
  return query === current.navigation.query ? current : { ...current, navigation: { ...current.navigation, query } };
}

/** Single-select touchpoint filter; null shows every journey. Assignments are explicit and never inherited. */
export function selectTouchpoint(document: UjgDocument, current: ViewerSnapshot, ref: string | null): ViewerSnapshot {
  if (ref !== null && !getNodesByType(document, "Touchpoint").some((node) => node["@id"] === ref)) return current;
  const refs = current.navigation.touchpointRefs;
  if (ref === null ? refs.length === 0 : refs.length === 1 && refs[0] === ref) return current;
  return { ...current, navigation: { ...current.navigation, touchpointRefs: ref === null ? [] : [ref] } };
}

export function hoverNode(document: UjgDocument, current: ViewerSnapshot, hover: ViewerSelection | null, occurrence: ViewerOccurrence | null = null): ViewerSnapshot {
  if (hover && (!resolveSelection(document, hover) || (occurrence && getOccurrenceTrail(document, occurrence).at(-1)?.journey["@id"] !== hover.journeyRef))) return current;
  const hoverOccurrence = hover ? occurrence : null;
  if (sameSelection(current.navigation.hover, hover) && sameOccurrence(current.navigation.hoverOccurrence, hoverOccurrence)) return current;
  return { ...current, navigation: { ...current.navigation, hover: hover ? { ...hover } : null, hoverOccurrence } };
}

/** Only local, explicitly listed transitions produce row highlights. Hover takes precedence over selection. */
export function getRowHighlight(
  document: UjgDocument, interaction: ViewerInteraction, navigation: ViewerNavigation | undefined, journeyRef: string, stateRef: string,
): ViewerRowHighlight | undefined {
  const active = navigation?.hover ?? interaction.selection;
  if (!active || active.kind !== "state" || active.journeyRef !== journeyRef) return undefined;
  const journey = resolveSelection(document, active)?.journey;
  if (!journey) return undefined;
  if (active.nodeRef === stateRef) return { tone: "active", incoming: 0, outgoing: 0 };
  const transitions = getJourneyTransitions(document, journey);
  const incoming = transitions.filter((edge) => edge.from === stateRef && edge.to === active.nodeRef).length;
  const outgoing = transitions.filter((edge) => edge.from === active.nodeRef && edge.to === stateRef).length;
  return { tone: incoming && outgoing ? "both" : incoming ? "incoming" : outgoing ? "outgoing" : "dim", incoming, outgoing };
}

/** Plain-text explanation of the routes behind a row's marks, relative to the active state. */
export function getRouteDescription(document: UjgDocument, navigation: ViewerNavigation | undefined, interaction: ViewerInteraction, journeyRef: string, stateRef: string): string {
  const active = navigation?.hover ?? interaction.selection;
  const journey = active?.kind === "state" && active.journeyRef === journeyRef ? resolveSelection(document, active)?.journey : undefined;
  if (!active || !journey) return "";
  const nodeLabel = (ref: string) => { const node = getNode(document, ref); return node ? label(node) : ref; };
  const describe = (heading: string, edges: readonly UjgTransition[]) => edges.length
    ? [heading, ...edges.map((edge) => `• ${label(edge)}`)] : [];
  const transitions = getJourneyTransitions(document, journey);
  return [
    ...describe(`${nodeLabel(stateRef)} → ${nodeLabel(active.nodeRef)}:`, transitions.filter((edge) => edge.from === stateRef && edge.to === active.nodeRef)),
    ...describe(`${nodeLabel(active.nodeRef)} → ${nodeLabel(stateRef)}:`, transitions.filter((edge) => edge.from === active.nodeRef && edge.to === stateRef)),
  ].join("\n");
}

export function matchesTouchpoints(document: UjgDocument, journeyRef: string, refs: readonly string[]): boolean {
  return refs.length === 0 || getJourneyTouchpoints(document, journeyRef).some((node) => refs.includes(node["@id"]));
}

export function getViewerSummary(document: UjgDocument, refs: readonly string[] = []) {
  const journeys = getNodesByType(document, "Journey");
  return {
    journeys: journeys.length,
    states: new Set([...getNodesByType(document, "State"), ...getNodesByType(document, "CompositeState")]).size,
    entries: getNodesByType(document, "JourneyEntry").length,
    exits: getNodesByType(document, "JourneyExit").length,
    transitions: getNodesByType(document, "Transition").length,
    matchingJourneys: journeys.filter((journey) => matchesTouchpoints(document, journey["@id"], refs)).length,
  } as const;
}

export function occurrenceLabel(document: UjgDocument, occurrence: ViewerOccurrence): string {
  return getOccurrenceLabels(document, occurrence).map((crumb) => (
    crumb.viaLabel ? `via ${crumb.viaLabel} / ${crumb.label}` : crumb.label
  )).join(" / ");
}

/** Bounded results, computed in display order; no results for a blank query. */
export function searchViewer(document: UjgDocument, query: string, touchpointRefs: readonly string[] = []): readonly ViewerNavigationItem[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  const results: ViewerNavigationItem[] = [];
  for (const { journey, occurrence } of journeyOccurrences(document)) {
    if (!matchesTouchpoints(document, journey["@id"], touchpointRefs)) continue;
    const candidates = [
      { node: journey, kind: "journey" },
      ...getJourneyStates(document, journey).map((node) => ({ node, kind: "state" } as const)),
      ...getJourneyEntries(document, journey).map((node) => ({ node, kind: "entry" } as const)),
      ...getJourneyExits(document, journey).map((node) => ({ node, kind: "exit" } as const)),
    ] as const;
    for (const { node, kind } of candidates) {
      if (![label(node), node["@id"], ...(Array.isArray(node.tags) ? node.tags : [])].join(" ").toLowerCase().includes(needle)) continue;
      results.push({ selection: selectionFor(journey, node, kind), occurrence, label: label(node), context: occurrenceLabel(document, occurrence) });
      if (results.length === 18) return results;
    }
  }
  return results;
}

/** Navigation follows explicit local targets and explicit boundary mappings only. */
export function getNavigationItems(document: UjgDocument, selection: ViewerSelection | null, occurrence: ViewerOccurrence | null): readonly ViewerNavigationItem[] {
  if (!selection || !occurrence) return [];
  const journey = getOccurrenceTrail(document, occurrence).at(-1)?.journey;
  if (journey?.["@id"] !== selection.journeyRef || !resolveSelection(document, selection)) return [];
  const states = getJourneyStates(document, journey);
  const entries = getJourneyEntries(document, journey);
  const exits = getJourneyExits(document, journey);
  const transitions = getJourneyTransitions(document, journey);
  const composites = getNodesByType(document, "CompositeState");
  const target = (owner: UjgJourney, path: ViewerOccurrence, ref: string, prefix: string): readonly ViewerNavigationItem[] => {
    const state = getJourneyStates(document, owner).find((node) => node["@id"] === ref);
    const entry = getJourneyEntries(document, owner).find((node) => node["@id"] === ref);
    const exit = getJourneyExits(document, owner).find((node) => node["@id"] === ref);
    const node = state ?? entry ?? exit;
    return node ? [{ selection: selectionFor(owner, node, state ? "state" : entry ? "entry" : "exit"), occurrence: path, label: `${prefix}: ${label(node)}`, context: occurrenceLabel(document, path) }] : [];
  };
  const boundaryTargets = (stateRef: string, contractRef: string, direction: "entry" | "exit") => states.flatMap((state, stateIndex) => {
    const composite = composites.find((node) => node === state && node["@id"] === stateRef);
    return composite ? getChildJourneys(document, composite).flatMap((child, childIndex) => {
      const path = childOccurrence(occurrence, stateIndex, childIndex);
      if (getOccurrenceTrail(document, path).length === 0) return [];
      const contracts = direction === "entry" ? getJourneyEntries(document, child) : getJourneyExits(document, child);
      return contracts.some((node) => node["@id"] === contractRef) ? target(child, path, contractRef, direction === "entry" ? "Enter child" : "Child exit") : [];
    }) : [];
  });
  if (selection.kind === "journey") return [
    ...states.flatMap((node) => target(journey, occurrence, node["@id"], "State")),
    ...entries.flatMap((node) => target(journey, occurrence, node["@id"], "Entry")),
    ...exits.flatMap((node) => target(journey, occurrence, node["@id"], "Exit")),
  ];
  const local = [
    ...(selection.kind === "entry" ? entries.filter((entry) => entry["@id"] === selection.nodeRef).flatMap((entry) => target(journey, occurrence, entry.stateRef, "Starts at")) : []),
    ...transitions.flatMap((edge) => [
      ...(edge.to === selection.nodeRef ? [
        ...target(journey, occurrence, edge.from, `Incoming · ${label(edge)}`),
        ...(edge.fromExitRef ? boundaryTargets(edge.from, edge.fromExitRef, "exit") : []),
        ...(edge.toEntryRef ? boundaryTargets(edge.to, edge.toEntryRef, "entry") : []),
      ] : []),
      ...(edge.from === selection.nodeRef ? [
        ...target(journey, occurrence, edge.to, `Outgoing · ${label(edge)}`),
        ...(edge.toEntryRef ? boundaryTargets(edge.to, edge.toEntryRef, "entry") : []),
        ...(edge.fromExitRef ? boundaryTargets(edge.from, edge.fromExitRef, "exit") : []),
      ] : []),
    ]),
    ...(selection.kind === "state" ? states.flatMap((state, stateIndex) => {
      const composite = composites.find((node) => node === state && node["@id"] === selection.nodeRef);
      return composite ? getChildJourneys(document, composite).flatMap((child, childIndex) => {
        const path = childOccurrence(occurrence, stateIndex, childIndex);
        return getOccurrenceTrail(document, path).length ? [{ selection: selectionFor(child, child, "journey"), occurrence: path, label: `Nested journey: ${label(child)}`, context: occurrenceLabel(document, path) }] : [];
      }) : [];
    }) : []),
  ];
  if (selection.kind !== "entry" && selection.kind !== "exit") return local;
  // Enumerate every caller occurrence. Shared journeys never acquire a preferred parent.
  const callers: ViewerNavigationItem[] = [];
  for (const { journey: parent, occurrence: parentPath } of journeyOccurrences(document)) {
    for (const edge of getJourneyTransitions(document, parent)) {
      const stateRef = selection.kind === "entry" ? edge.to : edge.from;
      const contractRef = selection.kind === "entry" ? edge.toEntryRef : edge.fromExitRef;
      const composite = composites.find((state) => state["@id"] === stateRef && parent.stateRefs.includes(stateRef));
      if (contractRef !== selection.nodeRef || !composite || !getChildJourneys(document, composite).some((child) => child["@id"] === journey["@id"])) continue;
      callers.push(...target(parent, parentPath, selection.kind === "entry" ? edge.from : edge.to, `${selection.kind === "entry" ? "Call site" : "Parent continuation"} · ${label(edge)}`));
    }
  }
  return [...local, ...callers];
}
