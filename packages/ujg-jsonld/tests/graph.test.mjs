import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  detectUjgVersion,
  entryInto,
  exitFrom,
  journeyTouchpoints,
  nodeSurfaces,
  projectJourneyGraph,
} from "@journey-viewer/ujg-jsonld";

const freeze = (value) => {
  if (value !== null && typeof value === "object") {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
};
const read = async (path) =>
  freeze(JSON.parse(await readFile(new URL(path, import.meta.url), "utf8")));
const document = await read("./fixtures/minimal.ujg.jsonld");
const oidc = await read("../../../examples/solid-oidc/solid-oidc.ujg.jsonld");
const ids = (nodes) => nodes.map((node) => node.id);
const ed = (module) =>
  `https://ujg.specs.openuji.org/ed/ns/${module}.context.jsonld`;

test("detects the version all UJG contexts name and refuses anything else", () => {
  assert.deepEqual(detectUjgVersion(document), {
    kind: "supported",
    version: "ed",
  });
  assert.deepEqual(detectUjgVersion({ "@context": ed("core") }), {
    kind: "supported",
    version: "ed",
  });
  const custom = [ed("core"), "https://example.test/extension.jsonld"];
  assert.equal(detectUjgVersion({ "@context": custom }).kind, "supported");
  const inline = [ed("core"), { note: "https://example.test/note" }];
  assert.equal(detectUjgVersion({ "@context": inline }).kind, "supported");
  const dated =
    "https://ujg.specs.openuji.org/2027-01-15/ns/core.context.jsonld";
  for (const [value, contexts] of [
    [{ "@context": dated }, [dated]],
    [{ "@context": [ed("core"), dated] }, [ed("core"), dated]],
    [{ "@context": "https://example.test/ujg" }, ["https://example.test/ujg"]],
    [{}, []],
    [[ed("core")], []],
    ["text", []],
    [null, []],
  ])
    assert.deepEqual(
      detectUjgVersion(value),
      { kind: "unsupported", contexts },
      JSON.stringify(value),
    );
  // Only the version segment counts; the module name is not checked.
  assert.equal(
    detectUjgVersion({ "@context": ed("future-module") }).kind,
    "supported",
  );
});

test("refuses to project an unsupported version", () => {
  assert.throws(
    () => projectJourneyGraph({ "@context": "https://example.test/ujg" }),
    { name: "TypeError", message: /https:\/\/example\.test\/ujg/ },
  );
});

test("projects journeys, states and contracts in reference order with plain names", () => {
  const graph = projectJourneyGraph(document);
  assert.equal(graph.id, document["@id"]);
  assert.equal(Object.hasOwn(graph, "label"), false);
  assert.equal(
    projectJourneyGraph({ ...document, label: "Sign-in" }).label,
    "Sign-in",
  );
  assert.deepEqual(ids(graph.journeys), [
    "urn:test:journey:root",
    "urn:test:journey:second",
    "urn:test:journey:a",
    "urn:test:journey:b",
  ]);
  const root = graph.journeys[0];
  assert.equal(root.kind, "journey");
  assert.deepEqual(ids(root.entries), [
    "urn:test:entry:alternative",
    "urn:test:entry:root",
  ]);
  assert.deepEqual(ids(root.states), [
    "urn:test:state:composite",
    "urn:test:state:root",
  ]);
  assert.deepEqual(
    root.states.map((state) => state.kind),
    ["composite", "state"],
  );
  assert.deepEqual(ids(root.exits), ["urn:test:exit:root"]);
  assert.equal(root.defaultEntry, undefined);
  assert.equal(Object.hasOwn(root, "defaultEntry"), false);
  // Unlabeled nodes are named by their id.
  assert.deepEqual(root.entries[1], {
    kind: "entry",
    id: "urn:test:entry:root",
    label: "urn:test:entry:root",
    tags: [],
    target: "urn:test:state:root",
  });
  const [transition] = root.transitions;
  assert.deepEqual(
    {
      id: transition.id,
      from: transition.from,
      to: transition.to,
      toEntry: transition.toEntry,
    },
    {
      id: "urn:test:transition:enter",
      from: "urn:test:state:root",
      to: "urn:test:state:composite",
      toEntry: "urn:test:entry:a",
    },
  );
  assert.equal(Object.hasOwn(transition, "fromExit"), false);
  // Every state and composite once, in document order; other kinds alike.
  assert.deepEqual(ids(graph.states), [
    "urn:test:state:root",
    "urn:test:state:composite",
    "urn:test:state:second",
    "urn:test:state:a",
    "urn:test:state:b",
  ]);
  assert.equal(graph.entries.length, 5);
  assert.equal(graph.exits.length, 1);
  assert.deepEqual(ids(graph.transitions), ["urn:test:transition:enter"]);
  assert.deepEqual(graph.touchpoints[2], {
    kind: "touchpoint",
    id: "urn:test:touchpoint:unassigned",
    label:
      document.nodes.find(
        (node) => node["@id"] === "urn:test:touchpoint:unassigned",
      ).label ?? "urn:test:touchpoint:unassigned",
    journeys: [],
  });
  assert.deepEqual(graph.surfaces[0], {
    kind: "surface",
    id: "urn:test:surface:root",
    node: "urn:test:state:root",
  });
  assert.deepEqual(ids(nodeSurfaces(graph, "urn:test:state:root")), [
    "urn:test:surface:root",
    "urn:test:surface:root-detail",
  ]);
  assert.deepEqual(nodeSurfaces(graph, "urn:test:state:a"), []);
  assert.deepEqual(ids(journeyTouchpoints(graph, "urn:test:journey:a")), [
    "urn:test:touchpoint:a",
  ]);
  // Touchpoints are never inherited from the journeys that open this one.
  assert.deepEqual(journeyTouchpoints(graph, "urn:test:journey:b"), []);
});

test("shares one node per source node, so reuse and recursion are cycles, not copies", () => {
  const graph = projectJourneyGraph(document);
  const journey = (id) => graph.journeys.find((node) => node.id === id);
  const state = (id) => graph.states.find((node) => node.id === id);
  const composite = state("urn:test:state:composite");
  assert.deepEqual(ids(composite.children), [
    "urn:test:journey:b",
    "urn:test:journey:a",
  ]);
  assert.equal(composite.children[1], journey("urn:test:journey:a"));
  assert.equal(
    state("urn:test:state:second").children[0],
    journey("urn:test:journey:a"),
  );
  assert.equal(journey("urn:test:journey:root").states[0], composite);
  // root opens b, and b opens root again.
  assert.equal(
    state("urn:test:state:b").children[0],
    journey("urn:test:journey:root"),
  );
  assert.deepEqual(ids(graph.roots), ["urn:test:journey:second"]);
  assert.deepEqual(ids(graph.rootless), [
    "urn:test:journey:root",
    "urn:test:journey:b",
  ]);
});

test("carries no JSON-LD keywords and leaves the document untouched", () => {
  const before = JSON.stringify(oidc);
  const graph = projectJourneyGraph(oidc);
  assert.equal(JSON.stringify(oidc), before);
  const seen = new Set();
  const walk = (value) => {
    if (value === null || typeof value !== "object" || seen.has(value)) return;
    seen.add(value);
    for (const [key, item] of Object.entries(value)) {
      assert.doesNotMatch(key, /^@|Refs?$/, key);
      walk(item);
    }
  };
  walk(graph);
  assert.deepEqual(
    [graph.journeys.length, graph.states.length, graph.transitions.length],
    [10, 47, 120],
  );
  assert.ok(seen.size > 300);
});

test("a transition starts a child at its selected entry, else at the child's default", () => {
  const entry = (id) => ({
    kind: "entry",
    id,
    label: id,
    tags: [],
    target: "s",
  });
  const exit = (id) => ({ kind: "exit", id, label: id, tags: [] });
  const child = (id, entries, exits, defaultEntry) => ({
    kind: "journey",
    id,
    label: id,
    tags: [],
    entries: entries.map(entry),
    ...(defaultEntry ? { defaultEntry } : {}),
    states: [],
    exits: exits.map(exit),
    transitions: [],
  });
  const edge = (fields) => ({
    kind: "transition",
    id: "t",
    label: "t",
    tags: [],
    from: "a",
    to: "b",
    ...fields,
  });
  const one = child("one", ["e1", "e2"], ["x1"], "e2");
  const other = child("other", ["e3"], [], undefined);
  assert.equal(entryInto(edge({ toEntry: "e1" }), one)?.id, "e1");
  assert.equal(entryInto(edge({ toEntry: "e1" }), other), undefined);
  assert.equal(entryInto(edge({}), one)?.id, "e2");
  assert.equal(entryInto(edge({}), other), undefined);
  // A default that names none of the child's entries resolves to nothing.
  assert.equal(entryInto(edge({}), child("c", ["e1"], [], "e9")), undefined);
  assert.equal(exitFrom(edge({ fromExit: "x1" }), one)?.id, "x1");
  assert.equal(exitFrom(edge({ fromExit: "x1" }), other), undefined);
  assert.equal(exitFrom(edge({}), one), undefined);
});
