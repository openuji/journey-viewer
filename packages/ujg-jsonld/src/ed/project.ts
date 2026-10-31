import {
  getChildJourneys,
  getJourneyEntries,
  getJourneyExits,
  getJourneyStates,
  getJourneyTransitions,
  getNodesByType,
} from "@/ed/queries";
import type { UjgDocument, UjgNode } from "@/ed/types";
import { journeyStarts } from "@/graph";
import type {
  CompositeState,
  Entry,
  Exit,
  Journey,
  JourneyGraph,
  State,
  Transition,
} from "@/graph";

const label = (node: UjgNode): string =>
  typeof node.label === "string" ? node.label : node["@id"];
const tags = (node: UjgNode): readonly string[] =>
  Array.isArray(node.tags)
    ? node.tags.filter((tag): tag is string => typeof tag === "string")
    : [];
const labeled = <Kind extends string>(kind: Kind, node: UjgNode) => ({
  kind,
  id: node["@id"],
  label: label(node),
  tags: tags(node),
});
const resolve = <Node>(
  map: ReadonlyMap<UjgNode, Node>,
  nodes: readonly UjgNode[],
): readonly Node[] => nodes.flatMap((node) => map.get(node) ?? []);

/** One graph node per source node; references resolve through the ED queries, unchanged. */
export function projectEd(document: UjgDocument): JourneyGraph {
  const entries = new Map<UjgNode, Entry>(
    getNodesByType(document, "JourneyEntry").map((node) => [
      node,
      { ...labeled("entry", node), target: node.stateRef },
    ]),
  );
  const exits = new Map<UjgNode, Exit>(
    getNodesByType(document, "JourneyExit").map((node) => [
      node,
      labeled("exit", node),
    ]),
  );
  const transitions = new Map<UjgNode, Transition>(
    getNodesByType(document, "Transition").map((node) => [
      node,
      {
        ...labeled("transition", node),
        from: node.from,
        to: node.to,
        ...(node.toEntryRef === undefined ? {} : { toEntry: node.toEntryRef }),
        ...(node.fromExitRef === undefined
          ? {}
          : { fromExit: node.fromExitRef }),
      },
    ]),
  );
  // Child lists are filled once every journey exists, since a journey can contain itself.
  const composites = new Set<UjgNode>(
    getNodesByType(document, "CompositeState"),
  );
  const stateNodes = new Set<UjgNode>([
    ...getNodesByType(document, "State"),
    ...composites,
  ]);
  const childLists = new Map<UjgNode, Journey[]>();
  const states = new Map<UjgNode, State>(
    (document.nodes ?? [])
      .filter((node) => stateNodes.has(node))
      .map((node): [UjgNode, State] => {
        if (!composites.has(node)) return [node, labeled("state", node)];
        const children: Journey[] = [];
        childLists.set(node, children);
        const composite: CompositeState = {
          ...labeled("composite", node),
          children,
        };
        return [node, composite];
      }),
  );
  const journeys = new Map<UjgNode, Journey>(
    getNodesByType(document, "Journey").map((node) => [
      node,
      {
        ...labeled("journey", node),
        entries: resolve(entries, getJourneyEntries(document, node)),
        ...(node.defaultEntryRef === undefined
          ? {}
          : { defaultEntry: node.defaultEntryRef }),
        states: resolve(states, getJourneyStates(document, node)),
        exits: resolve(exits, getJourneyExits(document, node)),
        transitions: resolve(
          transitions,
          getJourneyTransitions(document, node),
        ),
      },
    ]),
  );
  for (const node of getNodesByType(document, "CompositeState"))
    childLists
      .get(node)
      ?.push(...resolve(journeys, getChildJourneys(document, node)));
  const all = [...journeys.values()];
  return {
    id: document["@id"],
    ...(typeof document.label === "string" ? { label: document.label } : {}),
    journeys: all,
    ...journeyStarts(all),
    states: [...states.values()],
    entries: [...entries.values()],
    exits: [...exits.values()],
    transitions: [...transitions.values()],
    touchpoints: getNodesByType(document, "Touchpoint").map((node) => ({
      kind: "touchpoint",
      id: node["@id"],
      label: label(node),
      journeys: node.journeyRefs ?? [],
    })),
    surfaces: getNodesByType(document, "Surface").map((node) => ({
      kind: "surface",
      id: node["@id"],
      node: node.graphNodeRef,
    })),
  };
}
