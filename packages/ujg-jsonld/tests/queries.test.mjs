import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  getChildJourneys,
  getJourneyEntries,
  getJourneyExits,
  getJourneysContaining,
  getJourneyStates,
  getJourneyTouchpoints,
  getJourneyTransitions,
  getNode,
  getNodesByType,
  getNodeSurfaces,
} from "@journey-viewer/ujg-jsonld";

const freeze = (value) => {
  if (value !== null && typeof value === "object") {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
};
const document = freeze(JSON.parse(await readFile(
  new URL("./fixtures/minimal.ujg.jsonld", import.meta.url), "utf8",
)));
const oidc = freeze(JSON.parse(await readFile(
  new URL("../../../examples/solid-oidc/solid-oidc.ujg.jsonld", import.meta.url), "utf8",
)));
const ids = (nodes) => nodes.map((node) => node["@id"]);
const root = getNode(document, "urn:test:journey:root");

test("looks up full IRIs and returns original nodes without shortening or cloning", () => {
  assert.strictEqual(root, document.nodes[1]);
  assert.equal(getNode(document, "root"), undefined);
  assert.equal(getNode(document, "urn:test:missing"), undefined);
  assert.strictEqual(getNode(document, "urn:test:opaque"), document.nodes.at(-1));
});

test("reads Core-only documents and untyped nodes without inventing collections or types", () => {
  const empty = freeze({
    "@context": "https://ujg.specs.openuji.org/ed/ns/core.context.jsonld",
    "@id": "urn:test:empty", "@type": "UJGDocument",
  });
  assert.equal(getNode(empty, "urn:test:missing"), undefined);
  assert.deepEqual(getNodesByType(empty, "Journey"), []);
  assert.deepEqual(getJourneysContaining(empty, "urn:test:missing"), []);
  assert.equal(Object.hasOwn(empty, "nodes"), false);

  const node = freeze({ "@id": "urn:test:untyped", extensions: { "org.example.notes": { keep: true } } });
  const data = freeze({ ...empty, nodes: [node] });
  assert.strictEqual(getNode(data, node["@id"]), node);
  assert.deepEqual(getNodesByType(data, "Node"), []);
  assert.equal(Object.hasOwn(node, "@type"), false);
});

test("selects declared types in source order, including array-valued and unknown types", () => {
  assert.equal(getNodesByType(document, "Journey").length, 4);
  assert.equal(getNodesByType(document, "JourneyEntryIndex").length, 1);
  assert.deepEqual(ids(getNodesByType(document, "State")), ["urn:test:state:root", "urn:test:state:a"]);
  assert.strictEqual(getNodesByType(document, "urn:example:FeaturedState")[0], getNode(document, "urn:test:state:root"));
  assert.strictEqual(getNodesByType(document, "urn:example:Custom")[0], document.nodes.at(-1));
  assert.deepEqual(getNodesByType(document, "urn:test:absent-type"), []);
});

test("follows entry/state reference order instead of node serialization order", () => {
  assert.deepEqual(ids(getJourneyEntries(document, root)), ["urn:test:entry:alternative", "urn:test:entry:root"]);
  assert.deepEqual(ids(getJourneyStates(document, root)), ["urn:test:state:composite", "urn:test:state:root"]);
  assert.strictEqual(getJourneyEntries(document, root)[1], getNode(document, "urn:test:entry:root"));
  assert.strictEqual(getJourneyStates(document, root)[0], getNode(document, "urn:test:state:composite"));
  assert.equal(Object.hasOwn(root, "defaultEntryRef"), false);
});

test("reads an entry index as a catalogue without treating it as a journey", () => {
  const index = getNodesByType(document, "JourneyEntryIndex")[0];
  assert.deepEqual(ids(getJourneyEntries(document, index)), ["urn:test:entry:root", "urn:test:entry:second"]);
  assert.deepEqual(ids(getJourneysContaining(document, "urn:test:entry:root")), [root["@id"]]);
  assert.equal(getNodesByType(document, "Journey").includes(index), false);
});

test("membership uses only the journey's explicit lists, without ancestor or endpoint inference", () => {
  for (const ref of ["urn:test:entry:root", "urn:test:state:root", "urn:test:transition:enter", "urn:test:exit:root", "urn:test:group:navigation"]) {
    assert.deepEqual(getJourneysContaining(document, ref), [root]);
  }
  assert.deepEqual(ids(getJourneysContaining(document, "urn:test:state:a")), ["urn:test:journey:a"]);
  assert.deepEqual(getJourneysContaining(document, "urn:test:journey:a"), []);
  assert.deepEqual(getJourneysContaining(document, "urn:test:outgoing:help"), []);
  const unlisted = freeze({ ...root, transitionRefs: [] });
  const data = freeze({ ...document, nodes: document.nodes.map((node) => node === root ? unlisted : node) });
  assert.deepEqual(getJourneysContaining(data, "urn:test:transition:enter"), []);
});

test("reads local transitions/exits without injecting outgoing affordances or parent continuation", () => {
  assert.deepEqual(ids(getJourneyTransitions(document, root)), ["urn:test:transition:enter"]);
  assert.deepEqual(ids(getJourneyExits(document, root)), ["urn:test:exit:root"]);
  const child = getNode(document, "urn:test:journey:a");
  assert.deepEqual(getJourneyTransitions(document, child), []);
  assert.deepEqual(getJourneyExits(document, child), []);
});

test("returns every explicitly referenced child, including reused and recursive journey references", () => {
  const composite = getNode(document, "urn:test:state:composite");
  const children = getChildJourneys(document, composite);
  assert.deepEqual(ids(children), ["urn:test:journey:b", "urn:test:journey:a"]);
  assert.strictEqual(getChildJourneys(document, getNode(document, "urn:test:state:second"))[0], children[1]);
  assert.strictEqual(getChildJourneys(document, getNode(document, "urn:test:state:b"))[0], root);
  assert.equal(Object.hasOwn(children[1], "parent"), false);
});

test("selects touchpoints by explicit journey references without inheriting from parents", () => {
  assert.deepEqual(ids(getJourneyTouchpoints(document, root["@id"])), ["urn:test:touchpoint:web"]);
  assert.deepEqual(ids(getJourneyTouchpoints(document, "urn:test:journey:a")), ["urn:test:touchpoint:a"]);
  assert.deepEqual(getJourneyTouchpoints(document, "urn:test:journey:b"), []);
  assert.deepEqual(getJourneyTouchpoints(document, "urn:test:missing"), []);
});

test("returns all materialized surfaces for an explicit graph node without selecting an asset", () => {
  const surfaces = getNodeSurfaces(document, "urn:test:state:root");
  assert.deepEqual(ids(surfaces), ["urn:test:surface:root", "urn:test:surface:root-detail"]);
  assert.strictEqual(surfaces[0], getNode(document, "urn:test:surface:root"));
  assert.deepEqual(getNodeSurfaces(document, "urn:test:state:a"), []);
});

test("absent or differently typed targets produce no selected node and do not repair source refs", () => {
  const refs = freeze(["urn:test:missing", "urn:test:state:root", ...root.entryRefs]);
  const owner = freeze({ ...root, entryRefs: refs });
  assert.deepEqual(getJourneyEntries(document, owner), getJourneyEntries(document, root));
  assert.strictEqual(owner.entryRefs, refs);
  assert.deepEqual(owner.entryRefs.slice(0, 2), ["urn:test:missing", "urn:test:state:root"]);
});

test("queries remain deterministic on frozen data and preserve opaque fields, imports, and contexts", () => {
  const data = freeze({ ...document, imports: ["https://example.invalid/not-loaded.jsonld"] });
  const before = JSON.stringify(data);
  const query = () => [
    getNode(data, root["@id"]),
    getNodesByType(data, "Journey"),
    getJourneysContaining(data, "urn:test:state:root"),
    getJourneyEntries(data, root),
    getJourneyStates(data, root),
    getJourneyTransitions(data, root),
    getJourneyExits(data, root),
    getChildJourneys(data, getNode(data, "urn:test:state:composite")),
    getJourneyTouchpoints(data, root["@id"]),
    getNodeSurfaces(data, "urn:test:state:root"),
  ];
  assert.deepEqual(query(), query());
  assert.equal(JSON.stringify(data), before);
  assert.strictEqual(getNode(data, "urn:test:opaque").payload, document.nodes.at(-1).payload);
  assert.equal(Object.isFrozen(root), true);
});

test("reads the captured OIDC document through the built package without altering its baseline", () => {
  const before = JSON.stringify(oidc);
  const journeys = getNodesByType(oidc, "Journey");
  const states = journeys.flatMap((journey) => getJourneyStates(oidc, journey));
  assert.equal(journeys.length, 10);
  assert.equal(states.length, 47);
  assert.equal(journeys.flatMap((journey) => getJourneyEntries(oidc, journey)).length, 20);
  assert.equal(journeys.flatMap((journey) => getJourneyExits(oidc, journey)).length, 24);
  assert.equal(journeys.flatMap((journey) => getJourneyTransitions(oidc, journey)).length, 120);
  assert.equal(states.flatMap((state) => getNodeSurfaces(oidc, state["@id"])).length, 37);

  const app = journeys.find((journey) => journey["@id"] === "urn:ujg:solid-oidc:app-auth-journey");
  const entry = getJourneyEntries(oidc, app).find((node) => node["@id"] === app.defaultEntryRef);
  assert.equal(entry.stateRef, "urn:ujg:solid-oidc:app-sign-in-required");
  assert.strictEqual(getJourneyStates(oidc, app)[0], getNode(oidc, entry.stateRef));
  const composite = getNode(oidc, "urn:ujg:solid-oidc:idp-auth-flow");
  assert.equal(getChildJourneys(oidc, composite)[0]["@id"], "urn:ujg:solid-oidc:idp-auth-journey");
  assert.equal(getJourneyTouchpoints(oidc, app["@id"])[0]["@id"], "urn:ujg:solid-oidc:app");
  assert.equal(JSON.stringify(oidc), before);
});
