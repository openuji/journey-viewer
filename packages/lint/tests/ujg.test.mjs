import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { lint } from "@journey-viewer/lint";
import { documentShape, referenceTargets, uniqueNodeIds } from "@journey-viewer/lint/ujg";

const freeze = (value) => {
  if (value !== null && typeof value === "object") {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
};
const document = (nodes = []) => ({
  "@context": [
    "https://ujg.specs.openuji.org/ed/ns/core.context.jsonld",
    "https://ujg.specs.openuji.org/ed/ns/graph.context.jsonld",
    "https://ujg.specs.openuji.org/ed/ns/surface.context.jsonld",
  ],
  "@id": "urn:test:document", "@type": "UJGDocument", nodes,
});
const paths = (findings) => findings.map((item) => item.path);
const rules = Object.freeze([documentShape, uniqueNodeIds, referenceTargets]);

test("runs each rule directly against malformed roots and node collections", () => {
  for (const value of [null, true, 42, "not JSON", [], { nodes: null }, { nodes: 1 }, { nodes: "bad" }]) {
    assert.ok(documentShape(value).length > 0);
    assert.deepEqual(uniqueNodeIds(value), []);
    assert.deepEqual(referenceTargets(value), []);
  }
  for (const node of [null, false, 42, "bad", [], {}, { "@id": [] }, { "@type": [42, null] }]) {
    const value = freeze(document([node]));
    assert.ok(documentShape(value).length > 0);
    assert.deepEqual(uniqueNodeIds(value), []);
    assert.deepEqual(referenceTargets(value), []);
  }
});

test("accepts Core-only documents, untyped nodes, and opaque unknown data", () => {
  const value = freeze({
    ...document(),
    nodes: [
      { "@id": "urn:untyped", extensions: { "org.example.notes": { ref: "urn:not-loaded", nested: [true, null] } } },
      { "@id": "urn:custom", "@type": "urn:example:Custom", stateRefs: 42, label: false },
    ],
    extensions: { "org.example.notes": { "@id": "urn:custom", stateRef: "urn:absent" } },
  });
  assert.deepEqual(lint(value, rules), []);
  const coreOnly = freeze({ "@context": value["@context"][0], "@id": "urn:core", "@type": "UJGDocument" });
  assert.deepEqual(lint(coreOnly, rules), []);
  assert.equal(Object.hasOwn(coreOnly, "nodes"), false);
});

test("checks root field shapes and preserves precise property/index paths", () => {
  const value = freeze({
    "@id": null, "@context": ["https://example.test/context", false], "@type": "Other",
    imports: [42], extensions: { "org.example.notes": [] }, nodes: [null],
  });
  assert.deepEqual(paths(documentShape(value)), [
    ["@id"], ["@context", 1], ["@type"], ["imports", 0],
    ["extensions", "org.example.notes"], ["nodes", 0],
  ]);
  assert.deepEqual(paths(documentShape({ ...document(), "@context": [] })), [["@context"]]);
  assert.deepEqual(paths(documentShape({ ...document(), nodes: {} })), [["nodes"]]);
  assert.deepEqual(paths(documentShape({ ...document(), extensions: null })), [["extensions"]]);
});

test("checks required known-node fields without a preceding reference or identity rule", () => {
  const cases = [
    ["Journey", ["entryRefs", "stateRefs"]],
    ["JourneyEntryIndex", ["entryRefs"]],
    ["JourneyEntry", ["stateRef"]],
    ["State", ["label"]],
    ["CompositeState", ["label", "subjourneyRefs"]],
    ["Transition", ["from", "to"]],
    ["OutgoingTransitionGroup", ["outgoingTransitionRefs"]],
    ["Surface", ["graphNodeRef"]],
    ["SurfaceInstance", ["surfaceRef"]],
    ["Touchpoint", ["label"]],
  ];
  for (const [type, properties] of cases) {
    const findings = documentShape(freeze(document([{ "@id": "urn:node", "@type": type }])));
    assert.deepEqual(paths(findings), properties.map((key) => ["nodes", 0, key]), type);
  }
  assert.deepEqual(paths(documentShape(document([{ "@id": "urn:journey", "@type": "Journey", entryRefs: [], stateRefs: [] }]))), [
    ["nodes", 0, "entryRefs"], ["nodes", 0, "stateRefs"],
  ]);
});

test("checks malformed optional fields while other rules independently skip malformed reference slots", () => {
  const value = freeze(document([
    { "@id": "urn:state", "@type": "State", label: "State", tags: ["ok", 42], multiInstance: "true", outgoingTransitionRefs: [null] },
    { "@id": "urn:transition", "@type": "Transition", from: null, to: [], toEntryRef: {}, fromExitRef: false, commandRef: 42 },
    { "@id": "urn:outgoing", "@type": "OutgoingTransition", toCurrentState: "true", to: 42 },
    { "@id": "urn:touchpoint", "@type": "Touchpoint", label: "Web", channel: 1, journeyRefs: "urn:journey" },
    { "@id": "urn:persona", "@type": "Persona", touchpointRefs: [false] },
  ]));
  assert.deepEqual(paths(documentShape(value)), [
    ["nodes", 0, "tags", 1], ["nodes", 0, "multiInstance"], ["nodes", 0, "outgoingTransitionRefs", 0],
    ["nodes", 1, "from"], ["nodes", 1, "to"], ["nodes", 1, "toEntryRef"], ["nodes", 1, "fromExitRef"], ["nodes", 1, "commandRef"],
    ["nodes", 2, "to"], ["nodes", 2, "toCurrentState"],
    ["nodes", 3, "channel"], ["nodes", 3, "journeyRefs"], ["nodes", 4, "touchpointRefs", 0],
  ]);
  assert.deepEqual(referenceTargets(value), []);
});

test("handles array-valued types without normalizing or duplicating shared-field findings", () => {
  const value = freeze({ ...document([
    { "@id": "urn:composite", "@type": ["State", "CompositeState"], subjourneyRefs: ["urn:child"] },
  ]), "@type": ["UJGDocument", "urn:example:Document"] });
  assert.deepEqual(paths(documentShape(value)), [["nodes", 0, "label"]]);
  assert.deepEqual(paths(referenceTargets(value)), [["nodes", 0, "subjourneyRefs", 0]]);
  assert.deepEqual(value.nodes[0]["@type"], ["State", "CompositeState"]);
  assert.deepEqual(paths(documentShape({ ...document(), "@type": ["UJGDocument", 42] })), [["@type", 1]]);
});

test("reports repeated identities at each later source location, without selecting a replacement", () => {
  const value = freeze(document([
    { "@id": "urn:duplicate" }, null, { "@id": "urn:duplicate" },
    { "@id": false }, { "@id": "urn:duplicate" },
  ]));
  assert.deepEqual(paths(uniqueNodeIds(value)), [["nodes", 2, "@id"], ["nodes", 4, "@id"]]);
  assert.ok(uniqueNodeIds(value).every((item) => item.ruleId === "ujg/unique-node-ids" && item.message.includes("urn:duplicate")));
  assert.equal(value.nodes.length, 5);
});

test("reference checks continue past malformed nodes and malformed list members", () => {
  const value = freeze(document([
    null, 42,
    { "@id": "urn:owner", "@type": "Journey", entryRefs: [false, "urn:missing"] },
    { "@id": "urn:ignored", "@type": "Journey", stateRefs: { bad: true } },
  ]));
  assert.deepEqual(referenceTargets(value), [{
    ruleId: "ujg/reference-targets", path: ["nodes", 2, "entryRefs", 1],
    message: 'Unresolved reference "urn:missing".',
  }]);
});

test("checks expected target classes for supported Graph and Surface reference properties", () => {
  const cases = [
    ["Journey", "entryRefs", true, ["JourneyEntry"]],
    ["JourneyEntryIndex", "entryRefs", true, ["JourneyEntry"]],
    ["Journey", "stateRefs", true, ["State", "CompositeState"]],
    ["Journey", "transitionRefs", true, ["Transition"]],
    ["Journey", "exitRefs", true, ["JourneyExit"]],
    ["Journey", "defaultEntryRef", false, ["JourneyEntry"]],
    ["Journey", "outgoingTransitionGroupRefs", true, ["OutgoingTransitionGroup"]],
    ["JourneyEntry", "stateRef", false, ["State", "CompositeState"]],
    ["CompositeState", "subjourneyRefs", true, ["Journey"]],
    ["Transition", "from", false, ["State", "CompositeState"]],
    ["Transition", "to", false, ["State", "CompositeState", "JourneyExit"]],
    ["Transition", "toEntryRef", false, ["JourneyEntry"]],
    ["Transition", "fromExitRef", false, ["JourneyExit"]],
    ["Transition", "commandRef", false, ["Command"]],
    ["OutgoingTransition", "commandRef", false, ["Command"]],
    ["OutgoingTransition", "to", false, ["State", "CompositeState"]],
    ["State", "outgoingTransitionRefs", true, ["OutgoingTransition"]],
    ["OutgoingTransitionGroup", "outgoingTransitionRefs", true, ["OutgoingTransition"]],
    ["Surface", "graphNodeRef", false, ["State", "CompositeState", "Command"]],
    ["SurfaceInstance", "surfaceRef", false, ["Surface"]],
    ["Touchpoint", "journeyRefs", true, ["Journey"]],
    ["Persona", "touchpointRefs", true, ["Touchpoint"]],
  ];
  for (const [type, key, many, allowedTypes] of cases) {
    const owner = { "@id": "urn:owner", "@type": type, [key]: many ? ["urn:target"] : "urn:target" };
    for (const targetType of allowedTypes) {
      const value = freeze(document([owner, { "@id": "urn:target", "@type": targetType }]));
      assert.deepEqual(referenceTargets(value), [], `${type}.${key} -> ${targetType}`);
    }
    const value = freeze(document([owner, { "@id": "urn:target", "@type": "Node" }]));
    const findings = referenceTargets(value);
    assert.equal(findings.length, 1, `${type}.${key}`);
    assert.deepEqual(findings[0].path, many ? ["nodes", 0, key, 0] : ["nodes", 0, key]);
    assert.ok(findings[0].message.includes("urn:target"));
  }
});

test("reports ambiguous references rather than resolving the first duplicate ID", () => {
  const value = freeze(document([
    { "@id": "urn:owner", "@type": "JourneyEntry", stateRef: "urn:duplicate" },
    { "@id": "urn:duplicate", "@type": "State", label: "A" },
    { "@id": "urn:duplicate", "@type": "State", label: "B" },
  ]));
  assert.equal(referenceTargets(value).length, 1);
  assert.match(referenceTargets(value)[0].message, /Ambiguous reference/);
  assert.deepEqual(referenceTargets(value)[0].path, ["nodes", 0, "stateRef"]);
});

test("does not fetch imports, inspect opaque refs, or invent a target for current-state navigation", () => {
  const value = freeze({ ...document([
    { "@id": "urn:outgoing", "@type": "OutgoingTransition", toCurrentState: true },
    { "@id": "urn:unknown", "@type": "urn:example:Custom", stateRef: "urn:absent" },
    { "@id": "urn:entry", "@type": "JourneyEntry", stateRef: "urn:imported:state" },
  ]), imports: ["https://example.invalid/not-loaded.jsonld"], extensions: { "org.example.notes": { stateRef: "urn:absent" } } });
  assert.deepEqual(documentShape(value), []);
  assert.deepEqual(paths(referenceTargets(value)), [["nodes", 2, "stateRef"]]);
  assert.match(referenceTargets(value)[0].message, /urn:imported:state/);
  assert.equal(Object.hasOwn(value.nodes[0], "to"), false);
});

test("changing rule order only changes concatenation order, not rule applicability or input", () => {
  const value = freeze(document([
    { "@id": "urn:duplicate", "@type": "JourneyEntry", stateRef: "urn:missing" },
    null, { "@id": "urn:duplicate", "@type": "State" },
  ]));
  const before = JSON.stringify(value);
  const expected = rules.flatMap((rule) => rule(value));
  assert.deepEqual(lint(value, rules), expected);
  const reordered = Object.freeze([referenceTargets, documentShape, uniqueNodeIds]);
  assert.deepEqual(lint(value, reordered), reordered.flatMap((rule) => rule(value)));
  assert.deepEqual(lint(value, []), []);
  assert.equal(JSON.stringify(value), before);
  assert.deepEqual(lint(value, rules), expected);
});

test("all selected rules accept the captured OIDC export without modifying its data", async () => {
  const value = freeze(JSON.parse(await readFile(
    new URL("../../../examples/solid-oidc/solid-oidc.ujg.jsonld", import.meta.url), "utf8",
  )));
  const before = JSON.stringify(value);
  for (const rule of rules) assert.deepEqual(rule(value), []);
  assert.deepEqual(lint(value, rules), []);
  assert.equal(JSON.stringify(value), before);
  assert.equal(value.nodes.filter((node) => node["@type"] === "Journey").length, 10);
});
