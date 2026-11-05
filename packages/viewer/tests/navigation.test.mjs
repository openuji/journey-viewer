import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  JourneyExplorer,
  JourneyNavigation,
  JourneyInspector,
  createViewerSnapshot,
  navigateViewer,
  pickSearchResult,
  setViewMode,
  getLanePath,
  setSearchQuery,
  selectTouchpoint,
  hoverNode,
  getOccurrenceTrail,
  matchesTouchpoints,
  getViewerSummary,
  searchViewer,
  getNavigationItems,
  getRowHighlight,
  getRouteDescription,
} from "@journey-viewer/viewer";
import { edContext, freeze, graphOf } from "~/tests/graphs.mjs";

const fixture = freeze(
  JSON.parse(
    await readFile(
      new URL("fixtures/hierarchy.ujg.jsonld", import.meta.url),
      "utf8",
    ),
  ),
);
const review = freeze(
  JSON.parse(
    await readFile(
      new URL("fixtures/navigation-review.ujg.jsonld", import.meta.url),
      "utf8",
    ),
  ),
);
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
const prefix = "urn:ujg:solid-oidc:";
const pick = (document, ref) =>
  searchViewer(graphOf(document), ref).find(
    (item) => item.selection.nodeId === ref,
  );
const initial = freeze(createViewerSnapshot(graphOf(fixture)));
const fail = () => assert.fail("rendering must not invoke callbacks");
const bar = {
  onMode: fail,
  onExpandAll: fail,
  onCollapseAll: fail,
  onTouchpoint: fail,
  onQuery: fail,
  onSearchPick: fail,
  onReset: fail,
};

test("navigation snapshots are independent and reset to the tree, blank search and all touchpoints", () => {
  const before = JSON.stringify({ fixture, initial });
  const changed = freeze(
    selectTouchpoint(
      graphOf(fixture),
      setSearchQuery(initial, "test"),
      "urn:test:web",
    ),
  );
  assert.equal(initial.navigation.query, "");
  assert.deepEqual(initial.navigation.touchpointIds, []);
  assert.equal(initial.navigation.mode, "tree");
  assert.deepEqual(initial.navigation.lanes, [
    { startJourneyId: "urn:test:first", steps: [] },
  ]);
  assert.equal(initial.navigation.hover, null);
  assert.deepEqual(createViewerSnapshot(graphOf(fixture)), initial);
  assert.notEqual(createViewerSnapshot(graphOf(fixture)), initial);
  assert.equal(changed.navigation.query, "test");
  assert.equal(JSON.stringify({ fixture, initial }), before);
});

test("search preserves display occurrences, finds labels/IDs/contracts/tags and caps results at 18", () => {
  assert.deepEqual(searchViewer(graphOf(oidc), " \t\n"), []);
  const sms = searchViewer(graphOf(oidc), "sMs");
  assert.ok(
    sms.some(
      (item) => item.selection.kind === "journey" && item.label.includes("SMS"),
    ),
  );
  assert.ok(
    sms.some(
      (item) => item.selection.kind === "state" && item.label.includes("SMS"),
    ),
  );
  assert.equal(searchViewer(graphOf(fixture), "urn:test:").length, 18);
  assert.equal(pick(fixture, "urn:test:entry").selection.kind, "entry");
  assert.equal(pick(fixture, "urn:test:exit").selection.kind, "exit");
  const tagged = freeze({
    ...fixture,
    nodes: fixture.nodes.map((node) =>
      node["@id"] === "urn:test:terminal"
        ? { ...node, tags: ["distinct-tag"] }
        : node,
    ),
  });
  assert.equal(
    searchViewer(graphOf(tagged), "distinct-tag")[0].selection.nodeId,
    "urn:test:terminal",
  );
  assert.deepEqual(searchViewer(graphOf(fixture), "no such item"), []);
});

test("repeated child indices and multiple roots retain distinct, source-backed breadcrumb contexts", () => {
  const results = freeze(searchViewer(graphOf(fixture), "urn:test:shared"));
  assert.equal(results.length, 3);
  assert.deepEqual(
    results.map((item) => item.occurrence),
    [
      {
        startJourneyId: "urn:test:first",
        steps: [{ stateIndex: 0, childIndex: 0 }],
      },
      {
        startJourneyId: "urn:test:first",
        steps: [{ stateIndex: 0, childIndex: 2 }],
      },
      {
        startJourneyId: "urn:test:second",
        steps: [{ stateIndex: 0, childIndex: 0 }],
      },
    ],
  );
  for (const item of results) {
    const trail = getOccurrenceTrail(graphOf(fixture), item.occurrence);
    assert.equal(
      trail.at(-1).journey,
      graphOf(fixture).journeys.find((node) => node.id === "urn:test:shared"),
    );
    assert.equal(
      trail.at(-1).viaStateId,
      item.occurrence.startJourneyId === "urn:test:first"
        ? "urn:test:compose"
        : "urn:test:compose-again",
    );
  }
  assert.notEqual(results[0].context, results[1].context);
});

test("invalid and recursive occurrence targets are no-ops; rootless cycles remain finite and addressable", () => {
  const target = freeze(searchViewer(graphOf(fixture), "urn:test:shared")[0]);
  for (const occurrence of [
    { startJourneyId: "urn:test:shared", steps: [] },
    {
      startJourneyId: "urn:test:first",
      steps: [{ stateIndex: -1, childIndex: 0 }],
    },
    {
      startJourneyId: "urn:test:first",
      steps: [{ stateIndex: 0.5, childIndex: 0 }],
    },
    {
      startJourneyId: "urn:test:first",
      steps: [{ stateIndex: 0, childIndex: 30 }],
    },
    {
      ...target.occurrence,
      steps: [...target.occurrence.steps, { stateIndex: 0, childIndex: 0 }],
    },
  ]) {
    assert.deepEqual(
      getOccurrenceTrail(graphOf(fixture), freeze(occurrence)),
      [],
    );
    assert.equal(
      navigateViewer(
        graphOf(fixture),
        initial,
        freeze({ ...target, occurrence }),
      ),
      initial,
    );
    assert.deepEqual(
      getLanePath(graphOf(fixture), freeze(occurrence), target.selection, true),
      [],
    );
  }
  const wrongOwner = freeze({
    ...target,
    selection: {
      kind: "state",
      journeyId: "urn:test:first",
      nodeId: "urn:test:terminal",
    },
  });
  assert.equal(navigateViewer(graphOf(fixture), initial, wrongOwner), initial);
  const cycle = searchViewer(graphOf(fixture), "Cycle B");
  assert.equal(
    cycle.length,
    2,
    "both explicit rootless starting points are preserved",
  );
  assert.deepEqual(
    cycle.map(
      (item) => getOccurrenceTrail(graphOf(fixture), item.occurrence).length,
    ),
    [2, 1],
  );
});

test("columns follow the explicit call path, open a selected composite's children and leave tree expansion intact", () => {
  const target = freeze(searchViewer(graphOf(fixture), "urn:test:shared")[1]);
  const selected = freeze(
    navigateViewer(
      graphOf(fixture),
      setSearchQuery(initial, "Repeated child"),
      target,
    ),
  );
  assert.equal(selected.navigation.query, "Repeated child");
  assert.deepEqual(selected.navigation.occurrence, target.occurrence);
  assert.equal(selected.navigation.mode, "tree");
  assert.equal(
    selected.navigation.lanes,
    initial.navigation.lanes,
    "tree navigation keeps the previous columns",
  );
  const columns = freeze(setViewMode(graphOf(fixture), selected, "columns"));
  assert.equal(setViewMode(graphOf(fixture), columns, "columns"), columns);
  assert.equal(setViewMode(graphOf(fixture), columns, "other"), columns);
  assert.deepEqual(
    columns.navigation.lanes,
    getOccurrenceTrail(graphOf(fixture), target.occurrence).map(
      (crumb) => crumb.occurrence,
    ),
  );
  assert.equal(columns.interaction, selected.interaction);
  const compose = freeze(pick(fixture, "urn:test:compose"));
  const opened = freeze(navigateViewer(graphOf(fixture), columns, compose));
  assert.deepEqual(opened.navigation.lanes, [
    { startJourneyId: "urn:test:first", steps: [] },
    {
      startJourneyId: "urn:test:first",
      steps: [{ stateIndex: 0, childIndex: 0 }],
    },
    {
      startJourneyId: "urn:test:first",
      steps: [{ stateIndex: 0, childIndex: 1 }],
    },
    {
      startJourneyId: "urn:test:first",
      steps: [{ stateIndex: 0, childIndex: 2 }],
    },
  ]);
  const secondRoot = freeze(pick(fixture, "urn:test:second"));
  const moved = freeze(navigateViewer(graphOf(fixture), opened, secondRoot));
  assert.deepEqual(
    moved.navigation.lanes,
    [secondRoot.occurrence],
    "selecting elsewhere trims the columns",
  );
  const tree = freeze(setViewMode(graphOf(fixture), moved, "tree"));
  assert.equal(tree.navigation.mode, "tree");
  assert.equal(tree.interaction, moved.interaction);
  assert.equal(tree.navigation.occurrence, moved.navigation.occurrence);
  assert.equal(setViewMode(graphOf(fixture), tree, "tree"), tree);
});

test("the touchpoint filter selects one explicit identity, retains topology and handles equal labels without inheritance", () => {
  const document = freeze({
    ...fixture,
    nodes: fixture.nodes.map((node) =>
      node["@id"] === "urn:test:phone"
        ? { ...node, label: "Web", journeyRefs: ["urn:test:second"] }
        : node,
    ),
  });
  const web = freeze(
    selectTouchpoint(graphOf(document), initial, "urn:test:web"),
  );
  assert.deepEqual(web.navigation.touchpointIds, ["urn:test:web"]);
  assert.equal(
    matchesTouchpoints(
      graphOf(document),
      "urn:test:first",
      web.navigation.touchpointIds,
    ),
    true,
  );
  assert.equal(
    matchesTouchpoints(
      graphOf(document),
      "urn:test:second",
      web.navigation.touchpointIds,
    ),
    false,
  );
  assert.equal(
    matchesTouchpoints(
      graphOf(document),
      "urn:test:shared",
      web.navigation.touchpointIds,
    ),
    false,
  );
  const phone = freeze(
    selectTouchpoint(graphOf(document), web, "urn:test:phone"),
  );
  assert.deepEqual(
    phone.navigation.touchpointIds,
    ["urn:test:phone"],
    "selecting another touchpoint replaces the filter",
  );
  assert.equal(
    getViewerSummary(graphOf(document), phone.navigation.touchpointIds)
      .matchingJourneys,
    1,
  );
  assert.deepEqual(
    searchViewer(
      graphOf(document),
      "Repeated child",
      phone.navigation.touchpointIds,
    ),
    [],
  );
  assert.equal(
    selectTouchpoint(graphOf(document), initial, "missing"),
    initial,
  );
  assert.equal(selectTouchpoint(graphOf(document), web, "urn:test:web"), web);
  assert.equal(selectTouchpoint(graphOf(document), initial, null), initial);
  assert.deepEqual(selectTouchpoint(graphOf(document), web, null), initial);
  assert.equal(web.interaction, initial.interaction);
  assert.deepEqual(getViewerSummary(graphOf(oidc)), {
    journeys: 10,
    states: 47,
    entries: 20,
    exits: 24,
    transitions: 120,
    matchingJourneys: 10,
  });
  const overlappingTypes = freeze({
    ...fixture,
    nodes: fixture.nodes.map((node) =>
      node["@id"] === "urn:test:terminal"
        ? { ...node, "@type": ["State", "CompositeState"], subjourneyRefs: [] }
        : node,
    ),
  });
  assert.equal(
    getViewerSummary(graphOf(overlappingTypes)).states,
    getViewerSummary(graphOf(fixture)).states,
    "a source node with both types counts once",
  );
});

test("hover overrides selection for row highlights relative to the active state; repeated hover preserves identity", () => {
  const selected = freeze(
    navigateViewer(
      graphOf(fixture),
      initial,
      pick(fixture, "urn:test:terminal"),
    ),
  );
  assert.deepEqual(
    getRowHighlight(
      graphOf(fixture),
      selected.interaction,
      selected.navigation,
      "urn:test:first",
      "urn:test:terminal",
    ),
    { tone: "active", incoming: 0, outgoing: 0 },
  );
  assert.deepEqual(
    getRowHighlight(
      graphOf(fixture),
      selected.interaction,
      selected.navigation,
      "urn:test:first",
      "urn:test:compose",
    ),
    { tone: "dim", incoming: 0, outgoing: 0 },
  );
  assert.equal(
    getRowHighlight(
      graphOf(fixture),
      selected.interaction,
      selected.navigation,
      "urn:test:second",
      "urn:test:compose-again",
    ),
    undefined,
  );
  const exit = freeze({
    kind: "exit",
    journeyId: "urn:test:first",
    nodeId: "urn:test:exit",
  });
  const hovered = freeze(hoverNode(graphOf(fixture), selected, exit));
  assert.equal(
    hoverNode(graphOf(fixture), hovered, freeze({ ...exit })),
    hovered,
  );
  assert.equal(
    getRowHighlight(
      graphOf(fixture),
      hovered.interaction,
      hovered.navigation,
      "urn:test:first",
      "urn:test:terminal",
    ),
    undefined,
    "only states are active for row highlights",
  );
  assert.equal(
    hoverNode(graphOf(fixture), hovered, { ...exit, nodeId: "missing" }),
    hovered,
  );
  assert.deepEqual(hoverNode(graphOf(fixture), hovered, null), selected);
  const bidirectional = freeze({
    ...fixture,
    nodes: [
      ...fixture.nodes,
      {
        "@id": "urn:test:back",
        "@type": "Transition",
        from: "urn:test:compose",
        to: "urn:test:terminal",
      },
      {
        "@id": "urn:test:forward",
        "@type": "Transition",
        from: "urn:test:terminal",
        to: "urn:test:compose",
      },
      {
        "@id": "urn:test:again",
        "@type": "Transition",
        from: "urn:test:terminal",
        to: "urn:test:compose",
      },
      {
        "@id": "urn:test:self-1",
        "@type": "Transition",
        label: "Stay put",
        from: "urn:test:terminal",
        to: "urn:test:terminal",
      },
      {
        "@id": "urn:test:self-2",
        "@type": "Transition",
        label: "Try again",
        from: "urn:test:terminal",
        to: "urn:test:terminal",
      },
      {
        "@id": "urn:test:compose-self",
        "@type": "Transition",
        label: "Keep composing",
        from: "urn:test:compose",
        to: "urn:test:compose",
      },
    ].map((node) =>
      node["@id"] === "urn:test:first"
        ? {
            ...node,
            transitionRefs: [
              "urn:test:back",
              "urn:test:forward",
              "urn:test:again",
              "urn:test:self-1",
              "urn:test:self-2",
              "urn:test:compose-self",
            ],
          }
        : node,
    ),
  });
  assert.deepEqual(
    getRowHighlight(
      graphOf(bidirectional),
      selected.interaction,
      selected.navigation,
      "urn:test:first",
      "urn:test:terminal",
    ),
    { tone: "active", incoming: 0, selfLoops: 2, outgoing: 0 },
  );
  const loopDescription = getRouteDescription(
    graphOf(bidirectional),
    selected.navigation,
    selected.interaction,
    "urn:test:first",
    "urn:test:terminal",
  );
  assert.match(loopDescription, /^Self-loops on Averylong/);
  assert.equal((loopDescription.match(/Stay put/g) ?? []).length, 1);
  assert.equal((loopDescription.match(/Try again/g) ?? []).length, 1);
  assert.deepEqual(
    getRowHighlight(
      graphOf(bidirectional),
      selected.interaction,
      selected.navigation,
      "urn:test:first",
      "urn:test:compose",
    ),
    { tone: "both", incoming: 1, outgoing: 2 },
  );
  const composeHover = freeze(
    hoverNode(graphOf(bidirectional), selected, {
      kind: "state",
      journeyId: "urn:test:first",
      nodeId: "urn:test:compose",
    }),
  );
  assert.deepEqual(
    getRowHighlight(
      graphOf(bidirectional),
      composeHover.interaction,
      composeHover.navigation,
      "urn:test:first",
      "urn:test:compose",
    ),
    { tone: "active", incoming: 0, selfLoops: 1, outgoing: 0 },
  );
  assert.deepEqual(
    getRowHighlight(
      graphOf(bidirectional),
      composeHover.interaction,
      composeHover.navigation,
      "urn:test:first",
      "urn:test:terminal",
    ),
    { tone: "both", incoming: 2, outgoing: 1 },
  );
});

test("entry, exit and transition navigation preserves explicit OIDC boundary mappings", () => {
  const state = pick(oidc, `${prefix}idp-auth-flow`);
  const items = getNavigationItems(
    graphOf(oidc),
    state.selection,
    state.occurrence,
  );
  const entry = items.find(
    (item) => item.selection.nodeId === `${prefix}idp-login-entry`,
  );
  const exit = items.find(
    (item) => item.selection.nodeId === `${prefix}idp-auth-failed`,
  );
  assert.ok(entry);
  assert.ok(exit);
  assert.equal(entry.selection.kind, "entry");
  assert.equal(exit.selection.kind, "exit");
  assert.equal(
    getOccurrenceTrail(graphOf(oidc), entry.occurrence).at(-1).journey.id,
    `${prefix}idp-auth-journey`,
  );
  const starts = getNavigationItems(
    graphOf(oidc),
    entry.selection,
    entry.occurrence,
  );
  assert.ok(
    starts.some(
      (item) =>
        item.label.startsWith("Starts at:") &&
        item.selection.nodeId === `${prefix}idp-login`,
    ),
  );
  assert.ok(
    starts.some(
      (item) =>
        item.label.startsWith("Call site") &&
        item.selection.nodeId === `${prefix}app-sign-in-required`,
    ),
  );
  const handlers = getNavigationItems(
    graphOf(oidc),
    exit.selection,
    exit.occurrence,
  );
  assert.ok(
    handlers.some(
      (item) =>
        item.label.startsWith("Parent continuation") &&
        item.selection.nodeId === `${prefix}app-login-error` &&
        item.selection.journeyId === `${prefix}app-auth-journey`,
    ),
  );
  for (const target of [...items, ...starts, ...handlers]) {
    const next = navigateViewer(
      graphOf(oidc),
      freeze(createViewerSnapshot(graphOf(oidc))),
      freeze(target),
    );
    assert.deepEqual(next.interaction.selection, target.selection);
    assert.deepEqual(next.navigation.occurrence, target.occurrence);
  }
});

test("shared boundary navigation exposes every caller and omits non-composite and unrelated mappings", () => {
  const document = freeze({
    ...fixture,
    nodes: [
      ...fixture.nodes,
      {
        "@id": "urn:test:call1",
        "@type": "Transition",
        from: "urn:test:terminal",
        to: "urn:test:compose",
        toEntryRef: "urn:test:child-entry",
      },
      {
        "@id": "urn:test:call2",
        "@type": "Transition",
        from: "urn:test:compose-again",
        to: "urn:test:compose-again",
        toEntryRef: "urn:test:child-entry",
      },
      {
        "@id": "urn:test:wrong",
        "@type": "Transition",
        from: "urn:test:terminal",
        to: "urn:test:terminal",
        toEntryRef: "urn:test:child-entry",
      },
    ].map((node) =>
      node["@id"] === "urn:test:first"
        ? { ...node, transitionRefs: ["urn:test:call1", "urn:test:wrong"] }
        : node["@id"] === "urn:test:second"
          ? { ...node, transitionRefs: ["urn:test:call2"] }
          : node,
    ),
  });
  const entry = pick(document, "urn:test:child-entry");
  const items = getNavigationItems(
    graphOf(document),
    entry.selection,
    entry.occurrence,
  );
  assert.equal(
    items.filter((item) => item.label.startsWith("Call site")).length,
    2,
  );
  assert.deepEqual(
    items
      .filter((item) => item.label.startsWith("Call site"))
      .map((item) => item.occurrence.startJourneyId),
    ["urn:test:first", "urn:test:second"],
  );
  assert.equal(
    items.some((item) => item.label.includes("urn:test:wrong")),
    false,
  );
  const state = pick(document, "urn:test:terminal");
  const boundaries = getNavigationItems(
    graphOf(document),
    state.selection,
    state.occurrence,
  ).filter((item) => item.label.startsWith("Enter child"));
  assert.deepEqual(
    boundaries.map((item) => item.occurrence.steps.at(-1).childIndex),
    [0, 2],
  );
});

test("controlled columns, search and inspector rendering remain pure with frozen inputs", () => {
  const target = freeze(searchViewer(graphOf(fixture), "urn:test:shared")[1]);
  const snapshot = freeze(
    setViewMode(
      graphOf(fixture),
      navigateViewer(graphOf(fixture), initial, target),
      "columns",
    ),
  );
  const before = JSON.stringify({ fixture, snapshot });
  const explorer = renderToStaticMarkup(
    h(JourneyExplorer, {
      graph: graphOf(fixture),
      ...snapshot,
      onSelect: fail,
      onToggleChildren: fail,
      onHover: fail,
    }),
  );
  assert.equal((explorer.match(/data-journey-ref=/g) ?? []).length, 2);
  assert.match(explorer, /aria-label="Journey columns"/);
  assert.match(explorer, />Root journey</);
  assert.match(explorer, /data-occurrence="urn:test:first 0\.2"/);
  assert.match(explorer, /<p[^>]*>First root<\/p><h2[^>]*>Repeated child</);
  assert.doesNotMatch(
    explorer,
    /data-journey-ref="urn:test:second"|data-journey-ref="urn:test:other"|aria-expanded="(?:true|false)"[^>]*aria-label="(?:Expand|Collapse)/,
  );
  const navigation = renderToStaticMarkup(
    h(JourneyNavigation, {
      graph: graphOf(fixture),
      snapshot: freeze(setSearchQuery(snapshot, "Repeated child")),
      ...bar,
    }),
  );
  assert.match(navigation, /reference 2 of 2/);
  assert.match(navigation, /aria-label="Search the graph results"/);
  assert.match(navigation, /aria-pressed="true"[^>]*aria-label="Columns"/);
  assert.match(navigation, /data-icon="layout-columns"/);
  assert.doesNotMatch(
    navigation,
    /Expand all/,
    "tree tools are hidden in columns",
  );
  const inspector = renderToStaticMarkup(
    h(JourneyInspector, {
      graph: graphOf(fixture),
      selection: snapshot.interaction.selection,
      navigation: { occurrence: target.occurrence, onNavigate: fail },
    }),
  );
  assert.match(inspector, /First root \/ Repeated child \(reference 2 of 2\)/);
  assert.match(inspector, /Begin repeated child/);
  assert.match(inspector, /<button/);
  assert.equal(JSON.stringify({ fixture, snapshot }), before);
});

test("empty navigation remains explicit without fabricating a scope", () => {
  const document = freeze({
    "@id": "urn:empty",
    "@context": edContext,
    "@type": "UJGDocument",
  });
  const snapshot = freeze(createViewerSnapshot(graphOf(document)));
  assert.equal(snapshot.navigation.occurrence, null);
  assert.deepEqual(snapshot.navigation.lanes, []);
  assert.equal(snapshot.interaction.selection, null);
  assert.equal(
    setViewMode(graphOf(document), snapshot, "columns").navigation.lanes,
    snapshot.navigation.lanes,
  );
  assert.deepEqual(searchViewer(graphOf(document), "anything"), []);
  assert.deepEqual(getNavigationItems(graphOf(document), null, null), []);
  const html = renderToStaticMarkup(
    h(JourneyNavigation, { graph: graphOf(document), snapshot, ...bar }),
  );
  assert.match(html, /aria-pressed="true"[^>]*aria-label="Rows"/);
  assert.match(html, /0 journeys · 0 states · 0 transitions/);
  assert.match(html, /aria-pressed="true"[^>]*>All</);
});

test("ordinary navigation preserves a query; only valid search picks clear it, including selection no-ops", () => {
  const searching = freeze(setSearchQuery(initial, "Repeated child"));
  const target = freeze(searchViewer(graphOf(fixture), "urn:test:shared")[1]);
  const before = JSON.stringify({ searching, target });
  const moved = freeze(navigateViewer(graphOf(fixture), searching, target));
  assert.equal(moved.navigation.query, "Repeated child");
  assert.equal(navigateViewer(graphOf(fixture), moved, target), moved);
  const picked = freeze(pickSearchResult(graphOf(fixture), moved, target));
  assert.equal(picked.navigation.query, "");
  assert.equal(picked.interaction, moved.interaction);
  assert.equal(pickSearchResult(graphOf(fixture), picked, target), picked);
  assert.deepEqual(
    pickSearchResult(graphOf(fixture), searching, target),
    picked,
  );
  const invalid = freeze({
    ...target,
    occurrence: { startJourneyId: "missing", steps: [] },
  });
  assert.equal(
    pickSearchResult(graphOf(fixture), searching, invalid),
    searching,
  );
  assert.equal(JSON.stringify({ searching, target }), before);
});

test("occurrence wording uses labels and disambiguates repeated references independently of unresolved positions", () => {
  const before = JSON.stringify(review);
  const matches = searchViewer(graphOf(review), "urn:test:shared");
  assert.equal(
    matches[0].context,
    "First root / via Several child journeys / Repeated child (reference 1 of 2)",
  );
  assert.equal(
    matches[1].context,
    "First root / via Several child journeys / Repeated child (reference 2 of 2)",
  );
  assert.equal(
    matches[2].context,
    "Second root / via A second call site / Repeated child",
  );
  const other = pick(review, "urn:test:other");
  assert.equal(
    other.context,
    "First root / via Several child journeys / Other child",
  );
  const repeatedState = freeze({
    ...review,
    nodes: review.nodes.map((node) =>
      node["@id"] === "urn:test:first"
        ? { ...node, stateRefs: [...node.stateRefs, "urn:test:compose"] }
        : node,
    ),
  });
  assert.ok(
    searchViewer(graphOf(repeatedState), "urn:test:shared").some((result) =>
      result.context.includes("via Several child journeys (reference 2 of 2)"),
    ),
  );
  const equalChildLabels = freeze({
    ...review,
    nodes: review.nodes.map((node) =>
      node["@id"] === "urn:test:other"
        ? { ...node, label: "Repeated child" }
        : node,
    ),
  });
  assert.match(
    pick(equalChildLabels, "urn:test:other").context,
    /Repeated child \(urn:test:other\)/,
  );
  const equalRootLabels = freeze({
    ...review,
    nodes: review.nodes.map((node) =>
      node["@id"] === "urn:test:second"
        ? { ...node, label: "First root" }
        : node,
    ),
  });
  assert.match(
    searchViewer(graphOf(equalRootLabels), "urn:test:shared")[0].context,
    /^First root \(urn:test:first\)/,
  );
  assert.match(
    searchViewer(graphOf(equalRootLabels), "urn:test:shared")[2].context,
    /^First root \(urn:test:second\)/,
  );
  assert.doesNotMatch(
    matches.map((item) => item.context).join(" "),
    /state \d|child \d/,
  );
  assert.equal(JSON.stringify(review), before);
});

test("navigation presents equal-label touchpoint IDs and explicitly labels its first 18 matches", () => {
  const snapshot = freeze(
    setSearchQuery(createViewerSnapshot(graphOf(review)), "urn:test:"),
  );
  const html = renderToStaticMarkup(
    h(JourneyNavigation, { graph: graphOf(review), snapshot, ...bar }),
  );
  assert.match(html, />Web \(urn:test:web\)<\/button>/);
  assert.match(html, />Web \(urn:test:phone\)<\/button>/);
  assert.match(html, /Showing first 18 matches\. Refine your search/);
});
