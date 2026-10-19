import type {
  UjgCompositeState,
  UjgDocument,
  UjgJourney,
  UjgJourneyEntry,
  UjgJourneyEntryIndex,
  UjgJourneyExit,
  UjgNode,
  UjgNodeTypes,
  UjgState,
  UjgSurface,
  UjgTouchpoint,
  UjgTransition,
} from "./types.js";

const hasType = (node: UjgNode, type: string): boolean => (
  typeof node["@type"] === "string"
    ? node["@type"] === type
    : node["@type"]?.includes(type) ?? false
);

const nodesOfType = <Type extends keyof UjgNodeTypes>(
  nodes: readonly UjgNode[],
  type: Type,
): readonly UjgNodeTypes[Type][] => (
  nodes.filter((node): node is UjgNodeTypes[Type] => hasType(node, type))
);

/** Exact IRI lookup; returns the original node, or undefined. */
export function getNode(document: UjgDocument, ref: string): UjgNode | undefined {
  return document.nodes?.find((node) => node["@id"] === ref);
}

/** Selects explicitly declared types, without expansion or subclass inference. */
export function getNodesByType<Type extends keyof UjgNodeTypes>(
  document: UjgDocument,
  type: Type,
): readonly UjgNodeTypes[Type][];
export function getNodesByType(document: UjgDocument, type: string): readonly UjgNode[];
export function getNodesByType(document: UjgDocument, type: string): readonly UjgNode[] {
  return (document.nodes ?? []).filter((node) => hasType(node, type));
}

const referencedNodes = (document: UjgDocument, refs: readonly string[]): readonly UjgNode[] => (
  refs.flatMap((ref) => {
    const node = getNode(document, ref);
    return node ? [node] : [];
  })
);

/** Journeys explicitly listing the node; does not infer ancestor membership. */
export function getJourneysContaining(document: UjgDocument, ref: string): readonly UjgJourney[] {
  return getNodesByType(document, "Journey").filter((journey) => (
    journey.entryRefs.includes(ref)
    || journey.stateRefs.includes(ref)
    || journey.transitionRefs?.includes(ref)
    || journey.exitRefs?.includes(ref)
    || journey.outgoingTransitionGroupRefs?.includes(ref)
  ));
}

/** Explicit entries of a journey or entry index; never chooses a default. */
export function getJourneyEntries(
  document: UjgDocument,
  owner: UjgJourney | UjgJourneyEntryIndex,
): readonly UjgJourneyEntry[] {
  return nodesOfType(referencedNodes(document, owner.entryRefs), "JourneyEntry");
}

export function getJourneyStates(
  document: UjgDocument,
  journey: UjgJourney,
): readonly (UjgState | UjgCompositeState)[] {
  return referencedNodes(document, journey.stateRefs).filter(
    (node): node is UjgState | UjgCompositeState => hasType(node, "State") || hasType(node, "CompositeState"),
  );
}

export function getJourneyTransitions(
  document: UjgDocument,
  journey: UjgJourney,
): readonly UjgTransition[] {
  return nodesOfType(referencedNodes(document, journey.transitionRefs ?? []), "Transition");
}

export function getJourneyExits(
  document: UjgDocument,
  journey: UjgJourney,
): readonly UjgJourneyExit[] {
  return nodesOfType(referencedNodes(document, journey.exitRefs ?? []), "JourneyExit");
}

/** One-hop child references; no recursion, parent assignment, or traversal inference. */
export function getChildJourneys(
  document: UjgDocument,
  composite: UjgCompositeState,
): readonly UjgJourney[] {
  return nodesOfType(referencedNodes(document, composite.subjourneyRefs), "Journey");
}

/** Touchpoints explicitly naming this journey; no inherited assignments. */
export function getJourneyTouchpoints(document: UjgDocument, journeyRef: string): readonly UjgTouchpoint[] {
  return getNodesByType(document, "Touchpoint").filter((touchpoint) => touchpoint.journeyRefs?.includes(journeyRef));
}

/** All surfaces explicitly naming this graph node, without choosing a screenshot. */
export function getNodeSurfaces(document: UjgDocument, nodeRef: string): readonly UjgSurface[] {
  return getNodesByType(document, "Surface").filter((surface) => surface.graphNodeRef === nodeRef);
}
