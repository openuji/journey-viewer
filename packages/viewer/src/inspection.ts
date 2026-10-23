import {
  getChildJourneys, getJourneyEntries, getJourneyExits, getJourneyStates,
  getJourneyTouchpoints, getJourneyTransitions, getNodesByType,
} from "@journey-viewer/ujg-jsonld";
import type { UjgDocument, UjgJourney, UjgNode, UjgTransition } from "@journey-viewer/ujg-jsonld";
import type {
  InspectorDetail, InspectorDirection, InspectorPanelProps, InspectorTransitionGroup, InspectorTransitionItem,
} from "@journey-viewer/design-system";
import { resolveSelection } from "./interaction.js";
import type { ViewerSelection } from "./interaction.js";
import type { ViewerTarget } from "./navigation.js";
import { childOccurrence, getOccurrenceTrail } from "./occurrence.js";
import type { ViewerOccurrence } from "./occurrence.js";
import { getOccurrenceLabels } from "./occurrence-presentation.js";
import type { TouchpointPresentation } from "./presentation.js";
import { touchpointColor, touchpointLabel } from "./presentation.js";

/** A navigable inspector entry; the target is null when no explicit occurrence is known. */
export type InspectorDetailModel = Omit<InspectorDetail, "onSelect"> & Readonly<{ target: ViewerTarget | null }>;
export type InspectorGroupModel = Omit<InspectorTransitionGroup, "onSelect"> & Readonly<{ target: ViewerTarget | null }>;
export interface InspectorSectionModel {
  readonly title: string;
  readonly direction?: InspectorDirection;
  readonly count?: number;
  readonly empty?: string;
  readonly details?: readonly InspectorDetailModel[];
  readonly groups?: readonly InspectorGroupModel[];
}
export type InspectorModel = Omit<InspectorPanelProps, "sections" | "level" | "media" | "children"> & Readonly<{
  sections: readonly InspectorSectionModel[];
}>;

const label = (node: UjgNode): string => typeof node.label === "string" ? node.label : node["@id"];
const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;
const tags = (edge: UjgTransition): readonly string[] => (
  Array.isArray(edge.tags) ? edge.tags.filter((tag): tag is string => typeof tag === "string" && tag.length > 0) : []
);
const kindFor = (journey: UjgJourney, document: UjgDocument, ref: string): ViewerSelection["kind"] | undefined => (
  getJourneyStates(document, journey).some((node) => node["@id"] === ref) ? "state"
    : getJourneyExits(document, journey).some((node) => node["@id"] === ref) ? "exit"
      : getJourneyEntries(document, journey).some((node) => node["@id"] === ref) ? "entry" : undefined
);

function childrenOf(document: UjgDocument, journey: UjgJourney, stateRef: string): readonly UjgJourney[] {
  const composite = getNodesByType(document, "CompositeState").find((node) => (
    node["@id"] === stateRef && journey.stateRefs.includes(stateRef)
  ));
  return composite ? getChildJourneys(document, composite) : [];
}

/** Boundary wording for a transition that enters or leaves a composite's child journey. */
function annotation(document: UjgDocument, journey: UjgJourney, edge: UjgTransition): string | undefined {
  const entered = childrenOf(document, journey, edge.to);
  const entry = entered.flatMap((child) => getJourneyEntries(document, child).filter((node) => (
    edge.toEntryRef ? node["@id"] === edge.toEntryRef : node["@id"] === child.defaultEntryRef
  )))[0];
  const enters = entered.length === 0 ? undefined
    : `enters at ${entry ? label(entry) : edge.toEntryRef ?? "default entry"}${edge.toEntryRef ? "" : " (default)"}`;
  const exit = edge.fromExitRef
    ? childrenOf(document, journey, edge.from).flatMap((child) => getJourneyExits(document, child)).find((node) => node["@id"] === edge.fromExitRef)
    : undefined;
  const leaves = edge.fromExitRef ? `on child exit: ${exit ? label(exit) : edge.fromExitRef}` : undefined;
  return [enters, leaves].filter(Boolean).join(" · ") || undefined;
}

/** Transitions grouped by the node at their other end, in first-appearance order. */
function groupTransitions(
  document: UjgDocument, journey: UjgJourney, edges: readonly UjgTransition[], direction: InspectorDirection,
  occurrence: ViewerOccurrence | null,
): readonly InspectorGroupModel[] {
  const other = (edge: UjgTransition) => direction === "incoming" ? edge.from : edge.to;
  const refs = edges.map(other).filter((ref, index, all) => all.indexOf(ref) === index);
  return refs.map((ref) => {
    const kind = kindFor(journey, document, ref);
    const node = [...getJourneyStates(document, journey), ...getJourneyExits(document, journey), ...getJourneyEntries(document, journey)]
      .find((candidate) => candidate["@id"] === ref);
    const items: readonly InspectorTransitionItem[] = edges.filter((edge) => other(edge) === ref).map((edge) => {
      const note = annotation(document, journey, edge);
      return { id: edge["@id"], label: label(edge), tags: tags(edge), ...(note ? { annotation: note } : {}) };
    });
    return {
      id: ref, label: node ? label(node) : ref, exit: kind === "exit", items,
      target: kind && occurrence ? { selection: { kind, journeyRef: journey["@id"], nodeRef: ref }, occurrence } : null,
    };
  });
}

const touchpointNames = (document: UjgDocument, journey: UjgJourney, presentation: TouchpointPresentation) => (
  getJourneyTouchpoints(document, journey["@id"]).map((node) => touchpointLabel(node, presentation)).join(", ")
);

/** Builds ephemeral design-system presentation data; source nodes are never normalized or stored. */
export function getInspectorModel(
  document: UjgDocument, selection: ViewerSelection | null, occurrence: ViewerOccurrence | null,
  presentation: TouchpointPresentation = {},
): InspectorModel | undefined {
  const resolved = selection ? resolveSelection(document, selection) : undefined;
  if (!resolved || !selection) return undefined;
  const { journey, node } = resolved;
  const trail = occurrence ? getOccurrenceTrail(document, occurrence) : [];
  const context = trail.at(-1)?.journey["@id"] === journey["@id"] ? occurrence : null;
  const parent = context ? trail.at(-2) : undefined;
  const via = context ? trail.at(-1)?.viaStateRef : undefined;
  const entries = getJourneyEntries(document, journey);
  const exits = getJourneyExits(document, journey);
  const states = getJourneyStates(document, journey);
  const transitions = getJourneyTransitions(document, journey);
  const target = (kind: ViewerSelection["kind"], owner: UjgJourney, ref: string, path: ViewerOccurrence | null): ViewerTarget | null => (
    path ? { selection: { kind, journeyRef: owner["@id"], nodeRef: ref }, occurrence: path } : null
  );
  const transitionSections = (ref: string, incomingTitle: string, outgoingTitle: string) => {
    const incoming = transitions.filter((edge) => edge.to === ref);
    const outgoing = transitions.filter((edge) => edge.from === ref);
    return [
      { title: incomingTitle, direction: "incoming", count: incoming.length, groups: groupTransitions(document, journey, incoming, "incoming", context) },
      { title: outgoingTitle, direction: "outgoing", count: outgoing.length, groups: groupTransitions(document, journey, outgoing, "outgoing", context) },
    ] as const satisfies readonly InspectorSectionModel[];
  };
  const parentSection = (title: string, direction: InspectorDirection, edges: readonly UjgTransition[], empty: string): readonly InspectorSectionModel[] => (
    parent ? [{
      title, direction, count: edges.length, empty,
      groups: groupTransitions(document, parent.journey, edges, direction, parent.occurrence),
    }] : []
  );
  const parentEdges = parent && via ? getJourneyTransitions(document, parent.journey) : [];
  const composite = selection.kind === "state" ? childrenOf(document, journey, node["@id"]) : [];
  const stateIndex = states.findIndex((state) => state["@id"] === node["@id"]);
  const sections: readonly InspectorSectionModel[] = selection.kind === "journey" ? [
    { title: "Entries", count: entries.length, details: entries.map((entry) => ({
      id: entry["@id"], label: label(entry),
      sub: entry["@id"] === journey.defaultEntryRef ? "Default entry" : "Explicit entry",
      target: target("entry", journey, entry["@id"], context),
    })) },
    { title: "Exits", count: exits.length, details: exits.map((exit) => ({
      id: exit["@id"], label: label(exit), sub: "Exported exit", target: target("exit", journey, exit["@id"], context),
    })) },
  ] : selection.kind === "entry" ? [
    { title: "Starts at", details: entries.filter((entry) => entry["@id"] === node["@id"]).map((entry) => {
      const start = states.find((state) => state["@id"] === entry.stateRef);
      return {
        id: entry.stateRef, label: start ? label(start) : entry.stateRef,
        sub: entry["@id"] === journey.defaultEntryRef ? "Default entry" : "Explicit entry",
        target: start ? target("state", journey, start["@id"], context) : null,
      };
    }) },
    ...parentSection(`Invoked from ${parent ? label(parent.journey) : ""}`, "incoming", parentEdges.filter((edge) => (
      edge.to === via && (edge.toEntryRef === node["@id"] || (!edge.toEntryRef && node["@id"] === journey.defaultEntryRef))
    )), "No matching parent call sites"),
  ] : selection.kind === "exit" ? [
    { ...transitionSections(node["@id"], "Produced by", "")[0] },
    ...parentSection("Handled by parent", "outgoing", parentEdges.filter((edge) => (
      edge.from === via && edge.fromExitRef === node["@id"]
    )), "No explicit parent handling"),
  ] : [
    ...(composite.length ? [{ title: composite.length === 1 ? "Nested journey" : "Nested journeys", details: composite.map((child, childIndex): InspectorDetailModel => {
      const childStates = getJourneyStates(document, child);
      const childTouchpoint = getJourneyTouchpoints(document, child["@id"])[0];
      const color = childTouchpoint ? touchpointColor(childTouchpoint, presentation) : undefined;
      const path = context && stateIndex >= 0 ? childOccurrence(context, stateIndex, childIndex) : null;
      const valid = path && getOccurrenceTrail(document, path).length > 0 ? path : null;
      const from = touchpointNames(document, journey, presentation);
      const to = touchpointNames(document, child, presentation);
      return {
        id: child["@id"], label: label(child),
        sub: [plural(childStates.length, "state", "states"), plural(getJourneyEntries(document, child).length, "entry", "entries"),
          plural(getJourneyExits(document, child).length, "exit", "exits")].join(" · "),
        ...(childTouchpoint ? { touchpoint: { label: touchpointLabel(childTouchpoint, presentation), ...(color ? { color } : {}) } } : {}),
        ...(from !== to && to ? { note: `Touchpoint change: ${from || "none"} → ${to}` } : {}),
        target: childStates[0] ? target("state", child, childStates[0]["@id"], valid) : target("journey", child, child["@id"], valid),
      };
    }) }] : []),
    ...transitionSections(node["@id"], "Incoming", "Outgoing"),
  ];
  const labels = context ? getOccurrenceLabels(document, context).map((crumb) => crumb.label) : [label(journey)];
  return {
    title: label(node),
    typeLabel: selection.kind === "journey" ? "Journey" : selection.kind === "entry" ? "Journey entry"
      : selection.kind === "exit" ? "Journey exit" : composite.length ? "Composite state" : "State",
    identity: node["@id"],
    crumb: labels.join(" / "),
    touchpoints: getJourneyTouchpoints(document, journey["@id"]).map((touchpoint) => {
      const color = touchpointColor(touchpoint, presentation);
      return { id: touchpoint["@id"], label: label(touchpoint), ...(color ? { color } : {}) };
    }),
    footnote: [label(journey), plural(entries.length, "entry", "entries"), plural(exits.length, "exported exit", "exported exits")].join(" · "),
    sections,
  };
}
