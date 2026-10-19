import type { Finding, Rule } from "../index.js";
import { finding, hasAnyType, hasType, isObject, nodesOf } from "./data.js";
import type { ObjectValue } from "./data.js";

const ruleId = "ujg/document-shape";
const issue = (path: Finding["path"], message: string): Finding => finding(ruleId, path, message);

const stringField = (
  owner: ObjectValue, key: string, path: Finding["path"], required = false,
): readonly Finding[] => (
  owner[key] === undefined && !required || typeof owner[key] === "string"
    ? [] : [issue([...path, key], "Expected a string.")]
);

const stringList = (
  owner: ObjectValue, key: string, path: Finding["path"], required = false, minimum = 0,
): readonly Finding[] => {
  const value = owner[key];
  if (value === undefined && !required) return [];
  if (!Array.isArray(value)) return [issue([...path, key], "Expected an array of strings.")];
  return [
    ...(value.length < minimum ? [issue([...path, key], "Expected a non-empty array.")] : []),
    ...value.flatMap((item, index) => typeof item === "string" ? [] : [issue([...path, key, index], "Expected a string.")]),
  ];
};

const booleanField = (owner: ObjectValue, key: string, path: Finding["path"]): readonly Finding[] => (
  owner[key] === undefined || typeof owner[key] === "boolean"
    ? [] : [issue([...path, key], "Expected a boolean.")]
);

const extensions = (owner: ObjectValue, path: Finding["path"]): readonly Finding[] => {
  if (owner.extensions === undefined) return [];
  if (!isObject(owner.extensions)) return [issue([...path, "extensions"], "Expected an object of extension payloads.")];
  return Object.entries(owner.extensions).flatMap(([key, payload]) => (
    isObject(payload) ? [] : [issue([...path, "extensions", key], "Expected an object payload.")]
  ));
};

const typeField = (owner: ObjectValue, path: Finding["path"]): readonly Finding[] => (
  owner["@type"] === undefined || typeof owner["@type"] === "string"
    ? [] : stringList(owner, "@type", path)
);

const nodeShape = (value: unknown, index: number): readonly Finding[] => {
  const path = ["nodes", index] as const;
  if (!isObject(value)) return [issue(path, "Expected a node object.")];
  const state = hasAnyType(value, ["State", "CompositeState"]);
  const labeled = hasAnyType(value, [
    "Journey", "JourneyEntryIndex", "JourneyEntry", "State", "CompositeState",
    "JourneyExit", "Transition", "Command", "OutgoingTransition",
    "OutgoingTransitionGroup", "Touchpoint", "Persona",
  ]);
  return [
    ...stringField(value, "@id", path, true), ...typeField(value, path), ...extensions(value, path),
    ...(labeled ? [
      ...stringField(value, "label", path, state || hasType(value, "Touchpoint")),
      ...stringList(value, "tags", path),
    ] : []),
    ...(state ? booleanField(value, "multiInstance", path) : []),
    ...(hasAnyType(value, ["Journey", "JourneyEntryIndex"]) ? stringList(value, "entryRefs", path, true, 1) : []),
    ...(hasType(value, "Journey") ? [
      ...stringList(value, "stateRefs", path, true, 1), ...stringField(value, "defaultEntryRef", path),
      ...stringList(value, "transitionRefs", path), ...stringList(value, "exitRefs", path),
      ...stringList(value, "outgoingTransitionGroupRefs", path),
    ] : []),
    ...(hasType(value, "JourneyEntry") ? stringField(value, "stateRef", path, true) : []),
    ...(hasType(value, "CompositeState") ? stringList(value, "subjourneyRefs", path, true, 1) : []),
    ...(hasType(value, "Transition") ? [
      ...stringField(value, "from", path, true), ...stringField(value, "to", path, true),
      ...stringField(value, "toEntryRef", path), ...stringField(value, "fromExitRef", path),
    ] : []),
    ...(hasAnyType(value, ["Transition", "OutgoingTransition"]) ? stringField(value, "commandRef", path) : []),
    ...(hasType(value, "OutgoingTransition") ? [
      ...stringField(value, "to", path), ...booleanField(value, "toCurrentState", path),
    ] : []),
    ...(hasType(value, "State") ? stringList(value, "outgoingTransitionRefs", path) : []),
    ...(hasType(value, "OutgoingTransitionGroup") ? stringList(value, "outgoingTransitionRefs", path, true, 1) : []),
    ...(hasType(value, "Surface") ? stringField(value, "graphNodeRef", path, true) : []),
    ...(hasType(value, "SurfaceInstance") ? stringField(value, "surfaceRef", path, true) : []),
    ...(hasType(value, "Touchpoint") ? [
      ...stringField(value, "channel", path), ...stringList(value, "journeyRefs", path),
    ] : []),
    ...(hasType(value, "Persona") ? stringList(value, "touchpointRefs", path) : []),
  ];
};

/** Checks supported compact data fields; does not resolve or interpret graph references. */
export const documentShape: Rule = (value) => {
  if (!isObject(value)) return [issue([], "Expected a document object.")];
  return [
    ...stringField(value, "@id", [], true),
    ...(typeof value["@context"] === "string" ? [] : stringList(value, "@context", [], true, 1)),
    ...typeField(value, []),
    ...(hasType(value, "UJGDocument") ? [] : [issue(["@type"], "Expected UJGDocument among the declared types.")]),
    ...stringList(value, "imports", []), ...extensions(value, []),
    ...(value.nodes !== undefined && !Array.isArray(value.nodes) ? [issue(["nodes"], "Expected an array of nodes.")] : []),
    ...nodesOf(value).flatMap(nodeShape),
  ];
};
