import {
  getChildJourneys, getJourneyEntries, getJourneyExits, getJourneyStates,
  getJourneyTouchpoints, getJourneyTransitions, getNodesByType,
} from "@journey-viewer/ujg-jsonld";
import type { UjgDocument, UjgJourney, UjgNode } from "@journey-viewer/ujg-jsonld";
import { createViewerInteraction, resolveSelection, sameSelection, selectNode } from "./interaction.js";
import type { ViewerInteraction, ViewerSelection } from "./interaction.js";
import { childOccurrence, getOccurrenceTrail, journeyOccurrences, sameOccurrence } from "./occurrence.js";
import type { ViewerOccurrence } from "./occurrence.js";
import { getOccurrenceLabels } from "./occurrence-presentation.js";

export interface ViewerNavigation {
  readonly focus: ViewerOccurrence | null;
  readonly occurrence: ViewerOccurrence | null;
  readonly query: string;
  readonly touchpointRefs: readonly string[];
  readonly hover: ViewerSelection | null;
}

/** Change selection through navigateViewer/pickSearchResult to retain matching occurrence context. */
export interface ViewerSnapshot {
  readonly interaction: ViewerInteraction;
  readonly navigation: ViewerNavigation;
}

export interface ViewerTarget {
  readonly selection: ViewerSelection;
  readonly occurrence: ViewerOccurrence;
}

export interface ViewerNavigationItem extends ViewerTarget {
  readonly label: string;
  readonly context: string;
}

const label = (node: UjgNode) => typeof node.label === "string" ? node.label : node["@id"];
const selectionFor = (journey: UjgJourney, node: UjgNode, kind: ViewerSelection["kind"]): ViewerSelection => (
  { kind, journeyRef: journey["@id"], nodeRef: node["@id"] }
);

export function createViewerSnapshot(document: UjgDocument): ViewerSnapshot {
  const interaction = createViewerInteraction(document);
  const start = journeyOccurrences(document).next().value;
  return { interaction, navigation: { focus: null, occurrence: start?.occurrence ?? null, query: "", touchpointRefs: [], hover: null } };
}

function navigate(
  document: UjgDocument, current: ViewerSnapshot, target: ViewerTarget, query: string,
): ViewerSnapshot {
  const journey = getOccurrenceTrail(document, target.occurrence).at(-1)?.journey;
  if (journey?.["@id"] !== target.selection.journeyRef || !resolveSelection(document, target.selection)) return current;
  const interaction = selectNode(document, current.interaction, target.selection);
  const navigation = current.navigation;
  const focus = navigation.focus === null ? null : target.occurrence;
  if (interaction === current.interaction && sameOccurrence(navigation.occurrence, target.occurrence)
    && sameOccurrence(navigation.focus, focus) && navigation.query === query && navigation.hover === null) return current;
  return { interaction, navigation: { ...navigation, occurrence: target.occurrence, focus, query, hover: null } };
}

/** Selection and occurrence update together; ordinary navigation preserves search text. */
export function navigateViewer(document: UjgDocument, current: ViewerSnapshot, target: ViewerTarget): ViewerSnapshot {
  return navigate(document, current, target, current.navigation.query);
}

/** A search pick clears the query only after the target and its occurrence resolve. */
export function pickSearchResult(document: UjgDocument, current: ViewerSnapshot, target: ViewerTarget): ViewerSnapshot {
  return navigate(document, current, target, "");
}

export function focusJourney(document: UjgDocument, current: ViewerSnapshot, occurrence: ViewerOccurrence): ViewerSnapshot {
  if (getOccurrenceTrail(document, occurrence).length === 0 || sameOccurrence(current.navigation.focus, occurrence)) return current;
  return { ...current, navigation: { ...current.navigation, focus: occurrence, hover: null } };
}

export function showOverview(current: ViewerSnapshot): ViewerSnapshot {
  return current.navigation.focus === null ? current : { ...current, navigation: { ...current.navigation, focus: null, hover: null } };
}

export function setSearchQuery(current: ViewerSnapshot, query: string): ViewerSnapshot {
  return query === current.navigation.query ? current : { ...current, navigation: { ...current.navigation, query } };
}

/** Multiple selected touchpoints use OR; assignments are explicit and never inherited. */
export function toggleTouchpoint(document: UjgDocument, current: ViewerSnapshot, ref: string): ViewerSnapshot {
  if (!getNodesByType(document, "Touchpoint").some((node) => node["@id"] === ref)) return current;
  const refs = current.navigation.touchpointRefs;
  return { ...current, navigation: { ...current.navigation, touchpointRefs: refs.includes(ref) ? refs.filter((value) => value !== ref) : [...refs, ref] } };
}

export function hoverNode(document: UjgDocument, current: ViewerSnapshot, hover: ViewerSelection | null): ViewerSnapshot {
  if ((hover && !resolveSelection(document, hover)) || sameSelection(current.navigation.hover, hover)) return current;
  return { ...current, navigation: { ...current.navigation, hover: hover ? { ...hover } : null } };
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

/** Only local, explicitly listed transitions produce row highlights. Hover takes precedence. */
export function getRowRelation(document: UjgDocument, interaction: ViewerInteraction, navigation: ViewerNavigation | undefined, journeyRef: string, stateRef: string): "incoming" | "outgoing" | "both" | undefined {
  const active = navigation?.hover ?? interaction.selection;
  if (!active || active.journeyRef !== journeyRef || active.kind === "journey") return undefined;
  const journey = resolveSelection(document, active)?.journey;
  if (!journey) return undefined;
  const transitions = getJourneyTransitions(document, journey);
  const incoming = transitions.some((edge) => edge.to === active.nodeRef && edge.from === stateRef);
  const outgoing = transitions.some((edge) => edge.from === active.nodeRef && edge.to === stateRef);
  return incoming && outgoing ? "both" : incoming ? "incoming" : outgoing ? "outgoing" : undefined;
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
