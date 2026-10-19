import type { Finding, Rule } from "../index.js";
import { finding, hasAnyType, hasType, isObject, nodesOf } from "./data.js";
import type { ObjectValue } from "./data.js";

const ruleId = "ujg/reference-targets";

const target = (
  nodes: readonly unknown[], ref: string, types: readonly string[], path: Finding["path"],
): readonly Finding[] => {
  const matches = nodes.filter((node): node is ObjectValue => isObject(node) && node["@id"] === ref);
  if (matches.length === 0) return [finding(ruleId, path, `Unresolved reference ${JSON.stringify(ref)}.`)];
  if (matches.length > 1) return [finding(ruleId, path, `Ambiguous reference ${JSON.stringify(ref)}: multiple nodes declare this @id.`)];
  return matches.some((node) => hasAnyType(node, types)) ? [] : [finding(
    ruleId, path, `Reference ${JSON.stringify(ref)} must target ${types.join(" or ")}.`,
  )];
};

const references = (
  nodes: readonly unknown[], node: ObjectValue, index: number,
  key: string, types: readonly string[], many = false,
): readonly Finding[] => {
  const value = node[key];
  const path = ["nodes", index, key] as const;
  if (many) return Array.isArray(value) ? value.flatMap((ref, position) => (
    typeof ref === "string" ? target(nodes, ref, types, [...path, position]) : []
  )) : [];
  return typeof value === "string" ? target(nodes, value, types, path) : [];
};

/** Checks declared reference targets in this document; skips malformed reference slots. */
export const referenceTargets: Rule = (value) => {
  const nodes = nodesOf(value);
  return nodes.flatMap((node, index) => {
    if (!isObject(node)) return [];
    const check = (key: string, types: readonly string[], many = false) => references(nodes, node, index, key, types, many);
    return [
      ...(hasAnyType(node, ["Journey", "JourneyEntryIndex"]) ? check("entryRefs", ["JourneyEntry"], true) : []),
      ...(hasType(node, "Journey") ? [
        ...check("stateRefs", ["State", "CompositeState"], true),
        ...check("transitionRefs", ["Transition"], true), ...check("exitRefs", ["JourneyExit"], true),
        ...check("defaultEntryRef", ["JourneyEntry"]),
        ...check("outgoingTransitionGroupRefs", ["OutgoingTransitionGroup"], true),
      ] : []),
      ...(hasType(node, "JourneyEntry") ? check("stateRef", ["State", "CompositeState"]) : []),
      ...(hasType(node, "CompositeState") ? check("subjourneyRefs", ["Journey"], true) : []),
      ...(hasType(node, "Transition") ? [
        ...check("from", ["State", "CompositeState"]), ...check("to", ["State", "CompositeState", "JourneyExit"]),
        ...check("toEntryRef", ["JourneyEntry"]), ...check("fromExitRef", ["JourneyExit"]),
      ] : []),
      ...(hasAnyType(node, ["Transition", "OutgoingTransition"]) ? check("commandRef", ["Command"]) : []),
      ...(hasType(node, "OutgoingTransition") ? check("to", ["State", "CompositeState"]) : []),
      ...(hasAnyType(node, ["State", "OutgoingTransitionGroup"]) ? check("outgoingTransitionRefs", ["OutgoingTransition"], true) : []),
      ...(hasType(node, "Surface") ? check("graphNodeRef", ["State", "CompositeState", "Command"]) : []),
      ...(hasType(node, "SurfaceInstance") ? check("surfaceRef", ["Surface"]) : []),
      ...(hasType(node, "Touchpoint") ? check("journeyRefs", ["Journey"], true) : []),
      ...(hasType(node, "Persona") ? check("touchpointRefs", ["Touchpoint"], true) : []),
    ];
  });
};
