import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  createViewerInteraction,
  selectNode,
  toggleChildJourneys,
  expandAllJourneys,
  collapseAllJourneys,
} from "@journey-viewer/viewer";
import { edContext, freeze, graphOf } from "~/tests/graphs.mjs";

const oidc = freeze(
  JSON.parse(
    await readFile(
      new URL(
        "../../../examples/solid-oidc/solid-oidc.ujg.jsonld",
        import.meta.url,
      ),
      "utf8",
    ),
  ),
);
const fixture = freeze(
  JSON.parse(
    await readFile(
      new URL("fixtures/hierarchy.ujg.jsonld", import.meta.url),
      "utf8",
    ),
  ),
);
const stateSelection = (journeyId, nodeId) =>
  freeze({ kind: "state", journeyId, nodeId });

test("initial OIDC selection follows the explicit default entry, with no journey expanded", () => {
  const before = JSON.stringify(oidc);
  const initial = createViewerInteraction(graphOf(oidc));
  assert.deepEqual(
    initial.selection,
    stateSelection(
      "urn:ujg:solid-oidc:app-auth-journey",
      "urn:ujg:solid-oidc:app-sign-in-required",
    ),
  );
  assert.deepEqual(initial.expandedJourneys, []);
  assert.equal(JSON.stringify(oidc), before);
});

test("selection reveals all explicit ancestors of a reused journey without choosing a parent", () => {
  const collapsed = freeze(
    collapseAllJourneys(freeze(createViewerInteraction(graphOf(fixture)))),
  );
  const before = JSON.stringify(collapsed);
  const selected = selectNode(
    graphOf(fixture),
    collapsed,
    stateSelection("urn:test:shared", "urn:test:repeat"),
  );
  for (const ref of ["urn:test:first", "urn:test:second", "urn:test:shared"])
    assert.ok(selected.expandedJourneys.includes(ref));
  assert.equal(selected.expandedJourneys.includes("urn:test:cycle-a"), false);
  assert.equal(JSON.stringify(collapsed), before);
  assert.equal(
    selectNode(graphOf(fixture), freeze(selected), freeze(selected.selection)),
    selected,
    "unchanged selection is a no-op",
  );
});

test("selecting a composite opens every ordered child, while toggling operates on the whole group", () => {
  const current = freeze(
    collapseAllJourneys(freeze(createViewerInteraction(graphOf(fixture)))),
  );
  const selection = stateSelection("urn:test:first", "urn:test:compose");
  const opened = freeze(selectNode(graphOf(fixture), current, selection));
  assert.ok(opened.expandedJourneys.includes("urn:test:shared"));
  assert.ok(opened.expandedJourneys.includes("urn:test:other"));
  assert.equal(
    opened.expandedJourneys.filter((ref) => ref === "urn:test:shared").length,
    1,
  );
  const closed = freeze(
    toggleChildJourneys(
      graphOf(fixture),
      opened,
      "urn:test:first",
      "urn:test:compose",
    ),
  );
  assert.equal(closed.expandedJourneys.includes("urn:test:shared"), false);
  assert.equal(closed.expandedJourneys.includes("urn:test:other"), false);
  assert.deepEqual(closed.selection, selection);
  assert.deepEqual(
    toggleChildJourneys(
      graphOf(fixture),
      closed,
      "urn:test:first",
      "urn:test:compose",
    ),
    opened,
  );
  assert.equal(
    toggleChildJourneys(
      graphOf(fixture),
      closed,
      "urn:test:first",
      "urn:test:missing",
    ),
    closed,
  );
  assert.equal(
    toggleChildJourneys(
      graphOf(fixture),
      closed,
      "urn:test:second",
      "urn:test:compose",
    ),
    closed,
  );
});

test("explicit entry/exit/journey selections work and wrong kinds, owners and unresolved IDs are no-ops", () => {
  const current = freeze(createViewerInteraction(graphOf(fixture)));
  for (const selection of [
    { kind: "entry", journeyId: "urn:test:first", nodeId: "urn:test:entry" },
    { kind: "exit", journeyId: "urn:test:first", nodeId: "urn:test:exit" },
    {
      kind: "journey",
      journeyId: "urn:test:second",
      nodeId: "urn:test:second",
    },
  ])
    assert.deepEqual(
      selectNode(graphOf(fixture), current, freeze(selection)).selection,
      selection,
    );
  for (const selection of [
    { kind: "state", journeyId: "urn:test:first", nodeId: "urn:test:entry" },
    { kind: "entry", journeyId: "urn:test:second", nodeId: "urn:test:entry" },
    {
      kind: "state",
      journeyId: "urn:test:missing",
      nodeId: "urn:test:terminal",
    },
    {
      kind: "journey",
      journeyId: "urn:test:first",
      nodeId: "urn:test:second",
    },
  ])
    assert.equal(
      selectNode(graphOf(fixture), current, freeze(selection)),
      current,
    );
});

test("mutual and self recursion are bounded in ancestor revelation", () => {
  const initial = freeze(
    collapseAllJourneys(freeze(createViewerInteraction(graphOf(fixture)))),
  );
  const selected = selectNode(
    graphOf(fixture),
    initial,
    stateSelection("urn:test:cycle-a", "urn:test:cycle-a-state"),
  );
  assert.deepEqual([...selected.expandedJourneys].sort(), [
    "urn:test:cycle-a",
    "urn:test:cycle-b",
  ]);
});

test("expansion transitions and independent snapshots preserve frozen inputs and useful no-op identity", () => {
  const first = freeze(createViewerInteraction(graphOf(oidc)));
  const second = freeze(createViewerInteraction(graphOf(oidc)));
  const before = JSON.stringify({ oidc, first, second });
  assert.equal(collapseAllJourneys(first), first);
  const expanded = freeze(expandAllJourneys(graphOf(oidc), first));
  assert.equal(expandAllJourneys(graphOf(oidc), expanded), expanded);
  assert.equal(expanded.selection, first.selection);
  assert.deepEqual(
    expanded.expandedJourneys,
    oidc.nodes
      .filter((node) => node["@type"] === "Journey")
      .map((node) => node["@id"]),
  );
  assert.deepEqual(collapseAllJourneys(expanded), first);
  assert.equal(JSON.stringify({ oidc, first, second }), before);
  assert.notEqual(first, second);
});

test("empty documents and empty/rootless journeys have explicit initial-selection policies", () => {
  assert.deepEqual(
    createViewerInteraction(
      graphOf(
        freeze({
          "@context": edContext,
          "@type": "UJGDocument",
          "@id": "urn:d",
        }),
      ),
    ),
    { selection: null, expandedJourneys: [], openContracts: [] },
  );
  const emptyJourney = freeze({
    "@context": edContext,
    "@type": "UJGDocument",
    "@id": "urn:d",
    nodes: [
      { "@id": "urn:j", "@type": "Journey", stateRefs: [], entryRefs: [] },
    ],
  });
  assert.deepEqual(createViewerInteraction(graphOf(emptyJourney)).selection, {
    kind: "journey",
    journeyId: "urn:j",
    nodeId: "urn:j",
  });
  const rootless = freeze({
    ...fixture,
    nodes: fixture.nodes.filter((node) =>
      node["@id"].startsWith("urn:test:cycle"),
    ),
  });
  assert.deepEqual(
    createViewerInteraction(graphOf(rootless)).selection,
    stateSelection("urn:test:cycle-a", "urn:test:cycle-a-state"),
  );
});

test("an explicit default entry chooses its own state, while an unresolved default does not invent an entry", () => {
  const document = freeze({
    "@context": edContext,
    "@id": "urn:d",
    "@type": "UJGDocument",
    nodes: [
      {
        "@id": "urn:j",
        "@type": "Journey",
        stateRefs: ["urn:first", "urn:second"],
        entryRefs: ["urn:entry"],
        defaultEntryRef: "urn:entry",
      },
      { "@id": "urn:entry", "@type": "JourneyEntry", stateRef: "urn:second" },
      { "@id": "urn:first", "@type": "State", label: "First" },
      { "@id": "urn:second", "@type": "State", label: "Second" },
    ],
  });
  assert.deepEqual(
    createViewerInteraction(graphOf(document)).selection,
    stateSelection("urn:j", "urn:second"),
  );
  const unresolved = freeze({
    ...document,
    nodes: document.nodes.map((node) =>
      node["@id"] === "urn:j"
        ? { ...node, defaultEntryRef: "urn:missing" }
        : node,
    ),
  });
  assert.deepEqual(
    createViewerInteraction(graphOf(unresolved)).selection,
    stateSelection("urn:j", "urn:first"),
  );
});
