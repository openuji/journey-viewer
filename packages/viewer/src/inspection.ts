import {
  getChildJourneys, getJourneyEntries, getJourneyExits, getJourneyStates,
  getJourneyTouchpoints, getJourneyTransitions, getNode, getNodesByType,
} from "@journey-viewer/ujg-jsonld";
import type { UjgDocument, UjgJourney, UjgNode, UjgTransition } from "@journey-viewer/ujg-jsonld";
import type { InspectorItem, InspectorPanelProps, InspectorSection } from "@journey-viewer/design-system";
import { resolveSelection } from "./interaction.js";
import type { ViewerSelection } from "./interaction.js";

const label = (node: UjgNode): string => typeof node.label === "string" ? node.label : node["@id"];
const refLabel = (document: UjgDocument, ref: string): string => {
  const node = getNode(document, ref);
  return node ? `${label(node)} (${ref})` : ref;
};
const item = (node: UjgNode, details: readonly string[] = []): InspectorItem => ({ id: node["@id"], label: label(node), details });

function transitionItem(document: UjgDocument, transition: UjgTransition, owner: UjgJourney): InspectorItem {
  return item(transition, [
    `Journey: ${label(owner)}`,
    `From: ${refLabel(document, transition.from)}`,
    `To: ${refLabel(document, transition.to)}`,
    ...(transition.toEntryRef ? [`Entry boundary: ${refLabel(document, transition.toEntryRef)}`] : []),
    ...(transition.fromExitRef ? [`Exit boundary: ${refLabel(document, transition.fromExitRef)}`] : []),
    ...(transition.commandRef ? [`Command: ${refLabel(document, transition.commandRef)}`] : []),
  ]);
}

/** Explicit callers only, including every parent of a reused journey. */
function boundaryItems(
  document: UjgDocument, journeyRef: string, contractRef: string, direction: "entry" | "exit",
): readonly InspectorItem[] {
  const composites = getNodesByType(document, "CompositeState");
  return getNodesByType(document, "Journey").flatMap((parent) => (
    getJourneyTransitions(document, parent).filter((transition) => {
      const stateRef = direction === "entry" ? transition.to : transition.from;
      const composite = composites.find((node) => node["@id"] === stateRef && parent.stateRefs.includes(stateRef));
      return composite !== undefined
        && getChildJourneys(document, composite).some((child) => child["@id"] === journeyRef)
        && (direction === "entry" ? transition.toEntryRef : transition.fromExitRef) === contractRef;
    }).map((transition) => transitionItem(document, transition, parent))
  ));
}

/** Builds ephemeral design-system presentation data; source nodes are never normalized or stored. */
export function getInspectorProps(document: UjgDocument, selection: ViewerSelection | null): InspectorPanelProps | undefined {
  const resolved = selection ? resolveSelection(document, selection) : undefined;
  if (!resolved || !selection) return undefined;
  const { journey, node } = resolved;
  const entries = getJourneyEntries(document, journey);
  const exits = getJourneyExits(document, journey);
  const states = getJourneyStates(document, journey);
  const transitions = getJourneyTransitions(document, journey);
  const incoming = (ref: string) => transitions.filter((edge) => edge.to === ref).map((edge) => transitionItem(document, edge, journey));
  const outgoing = (ref: string) => transitions.filter((edge) => edge.from === ref).map((edge) => transitionItem(document, edge, journey));
  const sections: readonly InspectorSection[] = selection.kind === "journey" ? [
    { title: "States", items: states.map((state) => item(state)) },
    { title: "Entries", items: entries.map((entry) => item(entry, [
      entry["@id"] === journey.defaultEntryRef ? "Default entry" : "Explicit entry",
      `Starts at: ${refLabel(document, entry.stateRef)}`,
    ])) },
    { title: "Exits", items: exits.map((exit) => item(exit)) },
    { title: "Transitions", items: transitions.map((edge) => transitionItem(document, edge, journey)) },
  ] : selection.kind === "entry" ? [
    { title: "Starts at", items: entries.filter((entry) => entry["@id"] === node["@id"]).map((entry) => ({
      id: entry.stateRef,
      label: refLabel(document, entry.stateRef),
      details: [entry["@id"] === journey.defaultEntryRef ? "Default entry" : "Explicit entry"],
    })) },
    { title: "Call sites", items: boundaryItems(document, journey["@id"], node["@id"], "entry") },
  ] : selection.kind === "exit" ? [
    { title: "Produced by", items: incoming(node["@id"]) },
    { title: "Parent continuation handlers", items: boundaryItems(document, journey["@id"], node["@id"], "exit") },
  ] : [
    { title: "Journey entries", items: entries.filter((entry) => entry.stateRef === node["@id"]).map((entry) => item(entry)) },
    { title: "Nested journeys", items: getNodesByType(document, "CompositeState")
      .filter((state) => state === node)
      .flatMap((state) => getChildJourneys(document, state)).map((child) => item(child)) },
    { title: "Incoming transitions", items: incoming(node["@id"]) },
    { title: "Outgoing transitions", items: outgoing(node["@id"]) },
  ];
  return {
    title: label(node), kind: selection.kind, identity: node["@id"], context: label(journey),
    touchpoints: getJourneyTouchpoints(document, journey["@id"]).map((touchpoint) => touchpoint.label),
    sections,
  };
}
