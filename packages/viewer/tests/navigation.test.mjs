import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  JourneyExplorer, JourneyNavigation, JourneyInspector, createViewerSnapshot, navigateViewer, pickSearchResult,
  setViewMode, getLanePath, setSearchQuery, selectTouchpoint, hoverNode, getOccurrenceTrail,
  matchesTouchpoints, getViewerSummary, searchViewer, getNavigationItems, getRowHighlight,
} from "../dist/index.js";

const freeze = (value) => {
  if (value && typeof value === "object") { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
};
const fixture = freeze(JSON.parse(await readFile(new URL("fixtures/hierarchy.ujg.jsonld", import.meta.url), "utf8")));
const review = freeze(JSON.parse(await readFile(new URL("fixtures/navigation-review.ujg.jsonld", import.meta.url), "utf8")));
const oidc = freeze(JSON.parse(await readFile(new URL("../../../examples/solid-oidc/solid-oidc.ujg.jsonld", import.meta.url), "utf8")));
const prefix = "urn:ujg:solid-oidc:";
const pick = (document, ref) => searchViewer(document, ref).find((item) => item.selection.nodeRef === ref);
const initial = freeze(createViewerSnapshot(fixture));
const fail = () => assert.fail("rendering must not invoke callbacks");
const bar = { onMode: fail, onExpandAll: fail, onCollapseAll: fail, onTouchpoint: fail, onQuery: fail, onSearchPick: fail, onReset: fail };

test("navigation snapshots are independent and reset to the tree, blank search and all touchpoints", () => {
  const before = JSON.stringify({ fixture, initial });
  const changed = freeze(selectTouchpoint(fixture, setSearchQuery(initial, "test"), "urn:test:web"));
  assert.equal(initial.navigation.query, "");
  assert.deepEqual(initial.navigation.touchpointRefs, []);
  assert.equal(initial.navigation.mode, "tree");
  assert.deepEqual(initial.navigation.lanes, [{ startJourneyRef: "urn:test:first", steps: [] }]);
  assert.equal(initial.navigation.hover, null);
  assert.deepEqual(createViewerSnapshot(fixture), initial);
  assert.notEqual(createViewerSnapshot(fixture), initial);
  assert.equal(changed.navigation.query, "test");
  assert.equal(JSON.stringify({ fixture, initial }), before);
});

test("search preserves display occurrences, finds labels/IDs/contracts/tags and caps results at 18", () => {
  assert.deepEqual(searchViewer(oidc, " \t\n"), []);
  const sms = searchViewer(oidc, "sMs");
  assert.ok(sms.some((item) => item.selection.kind === "journey" && item.label.includes("SMS")));
  assert.ok(sms.some((item) => item.selection.kind === "state" && item.label.includes("SMS")));
  assert.equal(searchViewer(fixture, "urn:test:").length, 18);
  assert.equal(pick(fixture, "urn:test:entry").selection.kind, "entry");
  assert.equal(pick(fixture, "urn:test:exit").selection.kind, "exit");
  const tagged = freeze({ ...fixture, nodes: fixture.nodes.map((node) => node["@id"] === "urn:test:terminal" ? { ...node, tags: ["distinct-tag"] } : node) });
  assert.equal(searchViewer(tagged, "distinct-tag")[0].selection.nodeRef, "urn:test:terminal");
  assert.deepEqual(searchViewer(fixture, "no such item"), []);
});

test("repeated child indices and multiple roots retain distinct, source-backed breadcrumb contexts", () => {
  const results = freeze(searchViewer(fixture, "urn:test:shared"));
  assert.equal(results.length, 3);
  assert.deepEqual(results.map((item) => item.occurrence), [
    { startJourneyRef: "urn:test:first", steps: [{ stateIndex: 0, childIndex: 0 }] },
    { startJourneyRef: "urn:test:first", steps: [{ stateIndex: 0, childIndex: 2 }] },
    { startJourneyRef: "urn:test:second", steps: [{ stateIndex: 0, childIndex: 0 }] },
  ]);
  for (const item of results) {
    const trail = getOccurrenceTrail(fixture, item.occurrence);
    assert.equal(trail.at(-1).journey, fixture.nodes.find((node) => node["@id"] === "urn:test:shared"));
    assert.equal(trail.at(-1).viaStateRef, item.occurrence.startJourneyRef === "urn:test:first" ? "urn:test:compose" : "urn:test:compose-again");
  }
  assert.notEqual(results[0].context, results[1].context);
});

test("invalid and recursive occurrence targets are no-ops; rootless cycles remain finite and addressable", () => {
  const target = freeze(searchViewer(fixture, "urn:test:shared")[0]);
  for (const occurrence of [
    { startJourneyRef: "urn:test:shared", steps: [] },
    { startJourneyRef: "urn:test:first", steps: [{ stateIndex: -1, childIndex: 0 }] },
    { startJourneyRef: "urn:test:first", steps: [{ stateIndex: 0.5, childIndex: 0 }] },
    { startJourneyRef: "urn:test:first", steps: [{ stateIndex: 0, childIndex: 30 }] },
    { ...target.occurrence, steps: [...target.occurrence.steps, { stateIndex: 0, childIndex: 0 }] },
  ]) {
    assert.deepEqual(getOccurrenceTrail(fixture, freeze(occurrence)), []);
    assert.equal(navigateViewer(fixture, initial, freeze({ ...target, occurrence })), initial);
    assert.deepEqual(getLanePath(fixture, freeze(occurrence), target.selection, true), []);
  }
  const wrongOwner = freeze({ ...target, selection: { kind: "state", journeyRef: "urn:test:first", nodeRef: "urn:test:terminal" } });
  assert.equal(navigateViewer(fixture, initial, wrongOwner), initial);
  const cycle = searchViewer(fixture, "Cycle B");
  assert.equal(cycle.length, 2, "both explicit rootless starting points are preserved");
  assert.deepEqual(cycle.map((item) => getOccurrenceTrail(fixture, item.occurrence).length), [2, 1]);
});

test("columns follow the explicit call path, open a selected composite's children and leave tree expansion intact", () => {
  const target = freeze(searchViewer(fixture, "urn:test:shared")[1]);
  const selected = freeze(navigateViewer(fixture, setSearchQuery(initial, "Repeated child"), target));
  assert.equal(selected.navigation.query, "Repeated child");
  assert.deepEqual(selected.navigation.occurrence, target.occurrence);
  assert.equal(selected.navigation.mode, "tree");
  assert.equal(selected.navigation.lanes, initial.navigation.lanes, "tree navigation keeps the previous columns");
  const columns = freeze(setViewMode(fixture, selected, "columns"));
  assert.equal(setViewMode(fixture, columns, "columns"), columns);
  assert.equal(setViewMode(fixture, columns, "other"), columns);
  assert.deepEqual(columns.navigation.lanes, getOccurrenceTrail(fixture, target.occurrence).map((crumb) => crumb.occurrence));
  assert.equal(columns.interaction, selected.interaction);
  const compose = freeze(pick(fixture, "urn:test:compose"));
  const opened = freeze(navigateViewer(fixture, columns, compose));
  assert.deepEqual(opened.navigation.lanes, [
    { startJourneyRef: "urn:test:first", steps: [] },
    { startJourneyRef: "urn:test:first", steps: [{ stateIndex: 0, childIndex: 0 }] },
    { startJourneyRef: "urn:test:first", steps: [{ stateIndex: 0, childIndex: 1 }] },
    { startJourneyRef: "urn:test:first", steps: [{ stateIndex: 0, childIndex: 2 }] },
  ]);
  const secondRoot = freeze(pick(fixture, "urn:test:second"));
  const moved = freeze(navigateViewer(fixture, opened, secondRoot));
  assert.deepEqual(moved.navigation.lanes, [secondRoot.occurrence], "selecting elsewhere trims the columns");
  const tree = freeze(setViewMode(fixture, moved, "tree"));
  assert.equal(tree.navigation.mode, "tree");
  assert.equal(tree.interaction, moved.interaction);
  assert.equal(tree.navigation.occurrence, moved.navigation.occurrence);
  assert.equal(setViewMode(fixture, tree, "tree"), tree);
});

test("the touchpoint filter selects one explicit identity, retains topology and handles equal labels without inheritance", () => {
  const document = freeze({ ...fixture, nodes: fixture.nodes.map((node) => node["@id"] === "urn:test:phone" ? { ...node, label: "Web", journeyRefs: ["urn:test:second"] } : node) });
  const web = freeze(selectTouchpoint(document, initial, "urn:test:web"));
  assert.deepEqual(web.navigation.touchpointRefs, ["urn:test:web"]);
  assert.equal(matchesTouchpoints(document, "urn:test:first", web.navigation.touchpointRefs), true);
  assert.equal(matchesTouchpoints(document, "urn:test:second", web.navigation.touchpointRefs), false);
  assert.equal(matchesTouchpoints(document, "urn:test:shared", web.navigation.touchpointRefs), false);
  const phone = freeze(selectTouchpoint(document, web, "urn:test:phone"));
  assert.deepEqual(phone.navigation.touchpointRefs, ["urn:test:phone"], "selecting another touchpoint replaces the filter");
  assert.equal(getViewerSummary(document, phone.navigation.touchpointRefs).matchingJourneys, 1);
  assert.deepEqual(searchViewer(document, "Repeated child", phone.navigation.touchpointRefs), []);
  assert.equal(selectTouchpoint(document, initial, "missing"), initial);
  assert.equal(selectTouchpoint(document, web, "urn:test:web"), web);
  assert.equal(selectTouchpoint(document, initial, null), initial);
  assert.deepEqual(selectTouchpoint(document, web, null), initial);
  assert.equal(web.interaction, initial.interaction);
  assert.deepEqual(getViewerSummary(oidc), { journeys: 10, states: 47, entries: 20, exits: 24, transitions: 120, matchingJourneys: 10 });
  const overlappingTypes = freeze({ ...fixture, nodes: fixture.nodes.map((node) => node["@id"] === "urn:test:terminal"
    ? { ...node, "@type": ["State", "CompositeState"], subjourneyRefs: [] } : node) });
  assert.equal(getViewerSummary(overlappingTypes).states, getViewerSummary(fixture).states, "a source node with both types counts once");
});

test("hover overrides selection for row highlights relative to the active state; repeated hover preserves identity", () => {
  const selected = freeze(navigateViewer(fixture, initial, pick(fixture, "urn:test:terminal")));
  assert.deepEqual(getRowHighlight(fixture, selected.interaction, selected.navigation, "urn:test:first", "urn:test:terminal"), { tone: "active", incoming: 0, outgoing: 0 });
  assert.deepEqual(getRowHighlight(fixture, selected.interaction, selected.navigation, "urn:test:first", "urn:test:compose"), { tone: "dim", incoming: 0, outgoing: 0 });
  assert.equal(getRowHighlight(fixture, selected.interaction, selected.navigation, "urn:test:second", "urn:test:compose-again"), undefined);
  const exit = freeze({ kind: "exit", journeyRef: "urn:test:first", nodeRef: "urn:test:exit" });
  const hovered = freeze(hoverNode(fixture, selected, exit));
  assert.equal(hoverNode(fixture, hovered, freeze({ ...exit })), hovered);
  assert.equal(getRowHighlight(fixture, hovered.interaction, hovered.navigation, "urn:test:first", "urn:test:terminal"), undefined,
    "only states are active for row highlights");
  assert.equal(hoverNode(fixture, hovered, { ...exit, nodeRef: "missing" }), hovered);
  assert.deepEqual(hoverNode(fixture, hovered, null), selected);
  const bidirectional = freeze({ ...fixture, nodes: [...fixture.nodes,
    { "@id": "urn:test:back", "@type": "Transition", from: "urn:test:compose", to: "urn:test:terminal" },
    { "@id": "urn:test:forward", "@type": "Transition", from: "urn:test:terminal", to: "urn:test:compose" },
    { "@id": "urn:test:again", "@type": "Transition", from: "urn:test:terminal", to: "urn:test:compose" },
  ].map((node) => node["@id"] === "urn:test:first" ? { ...node, transitionRefs: ["urn:test:back", "urn:test:forward", "urn:test:again"] } : node) });
  assert.deepEqual(getRowHighlight(bidirectional, selected.interaction, selected.navigation, "urn:test:first", "urn:test:compose"), { tone: "both", incoming: 1, outgoing: 2 });
  const composeHover = freeze(hoverNode(bidirectional, selected, { kind: "state", journeyRef: "urn:test:first", nodeRef: "urn:test:compose" }));
  assert.deepEqual(getRowHighlight(bidirectional, composeHover.interaction, composeHover.navigation, "urn:test:first", "urn:test:terminal"), { tone: "both", incoming: 2, outgoing: 1 });
});

test("entry, exit and transition navigation preserves explicit OIDC boundary mappings", () => {
  const state = pick(oidc, `${prefix}idp-auth-flow`);
  const items = getNavigationItems(oidc, state.selection, state.occurrence);
  const entry = items.find((item) => item.selection.nodeRef === `${prefix}idp-login-entry`);
  const exit = items.find((item) => item.selection.nodeRef === `${prefix}idp-auth-failed`);
  assert.ok(entry);
  assert.ok(exit);
  assert.equal(entry.selection.kind, "entry");
  assert.equal(exit.selection.kind, "exit");
  assert.equal(getOccurrenceTrail(oidc, entry.occurrence).at(-1).journey["@id"], `${prefix}idp-auth-journey`);
  const starts = getNavigationItems(oidc, entry.selection, entry.occurrence);
  assert.ok(starts.some((item) => item.label.startsWith("Starts at:") && item.selection.nodeRef === `${prefix}idp-login`));
  assert.ok(starts.some((item) => item.label.startsWith("Call site") && item.selection.nodeRef === `${prefix}app-sign-in-required`));
  const handlers = getNavigationItems(oidc, exit.selection, exit.occurrence);
  assert.ok(handlers.some((item) => item.label.startsWith("Parent continuation") && item.selection.nodeRef === `${prefix}app-login-error` && item.selection.journeyRef === `${prefix}app-auth-journey`));
  for (const target of [...items, ...starts, ...handlers]) {
    const next = navigateViewer(oidc, freeze(createViewerSnapshot(oidc)), freeze(target));
    assert.deepEqual(next.interaction.selection, target.selection);
    assert.deepEqual(next.navigation.occurrence, target.occurrence);
  }
});

test("shared boundary navigation exposes every caller and omits non-composite and unrelated mappings", () => {
  const document = freeze({ ...fixture, nodes: [...fixture.nodes,
    { "@id": "urn:test:call1", "@type": "Transition", from: "urn:test:terminal", to: "urn:test:compose", toEntryRef: "urn:test:child-entry" },
    { "@id": "urn:test:call2", "@type": "Transition", from: "urn:test:compose-again", to: "urn:test:compose-again", toEntryRef: "urn:test:child-entry" },
    { "@id": "urn:test:wrong", "@type": "Transition", from: "urn:test:terminal", to: "urn:test:terminal", toEntryRef: "urn:test:child-entry" },
  ].map((node) => node["@id"] === "urn:test:first" ? { ...node, transitionRefs: ["urn:test:call1", "urn:test:wrong"] }
    : node["@id"] === "urn:test:second" ? { ...node, transitionRefs: ["urn:test:call2"] } : node) });
  const entry = pick(document, "urn:test:child-entry");
  const items = getNavigationItems(document, entry.selection, entry.occurrence);
  assert.equal(items.filter((item) => item.label.startsWith("Call site")).length, 2);
  assert.deepEqual(items.filter((item) => item.label.startsWith("Call site")).map((item) => item.occurrence.startJourneyRef), ["urn:test:first", "urn:test:second"]);
  assert.equal(items.some((item) => item.label.includes("urn:test:wrong")), false);
  const state = pick(document, "urn:test:terminal");
  const boundaries = getNavigationItems(document, state.selection, state.occurrence).filter((item) => item.label.startsWith("Enter child"));
  assert.deepEqual(boundaries.map((item) => item.occurrence.steps.at(-1).childIndex), [0, 2]);
});

test("controlled columns, search and inspector rendering remain pure with frozen inputs", () => {
  const target = freeze(searchViewer(fixture, "urn:test:shared")[1]);
  const snapshot = freeze(setViewMode(fixture, navigateViewer(fixture, initial, target), "columns"));
  const before = JSON.stringify({ fixture, snapshot });
  const explorer = renderToStaticMarkup(h(JourneyExplorer, { document: fixture, ...snapshot, onSelect: fail, onToggleChildren: fail, onHover: fail }));
  assert.equal((explorer.match(/data-journey-ref=/g) ?? []).length, 2);
  assert.match(explorer, /aria-label="Journey columns"/);
  assert.match(explorer, />Root journey</);
  assert.match(explorer, /data-occurrence="urn:test:first 0\.2"/);
  assert.match(explorer, /<p[^>]*>First root<\/p><h2[^>]*>Repeated child</);
  assert.doesNotMatch(explorer, /data-journey-ref="urn:test:second"|data-journey-ref="urn:test:other"|aria-expanded="(?:true|false)"[^>]*aria-label="(?:Expand|Collapse)/);
  const navigation = renderToStaticMarkup(h(JourneyNavigation, { document: fixture, snapshot: freeze(setSearchQuery(snapshot, "Repeated child")), ...bar }));
  assert.match(navigation, /reference 2 of 2/);
  assert.match(navigation, /aria-label="Search the graph results"/);
  assert.match(navigation, /aria-pressed="true"[^>]*>Columns</);
  assert.doesNotMatch(navigation, /Expand all/, "tree tools are hidden in columns");
  const inspector = renderToStaticMarkup(h(JourneyInspector, { document: fixture, selection: snapshot.interaction.selection, navigation: { occurrence: target.occurrence, onNavigate: fail } }));
  assert.match(inspector, /First root \/ Repeated child \(reference 2 of 2\)/);
  assert.match(inspector, /Begin repeated child/);
  assert.match(inspector, /<button/);
  assert.equal(JSON.stringify({ fixture, snapshot }), before);
});

test("empty navigation remains explicit without fabricating a scope", () => {
  const document = freeze({ "@id": "urn:empty", "@context": "urn:c", "@type": "UJGDocument" });
  const snapshot = freeze(createViewerSnapshot(document));
  assert.equal(snapshot.navigation.occurrence, null);
  assert.deepEqual(snapshot.navigation.lanes, []);
  assert.equal(snapshot.interaction.selection, null);
  assert.equal(setViewMode(document, snapshot, "columns").navigation.lanes, snapshot.navigation.lanes);
  assert.deepEqual(searchViewer(document, "anything"), []);
  assert.deepEqual(getNavigationItems(document, null, null), []);
  const html = renderToStaticMarkup(h(JourneyNavigation, { document, snapshot, ...bar }));
  assert.match(html, /aria-pressed="true"[^>]*>Tree</);
  assert.match(html, /0 journeys · 0 states · 0 transitions/);
  assert.match(html, /aria-pressed="true"[^>]*>All</);
});

test("ordinary navigation preserves a query; only valid search picks clear it, including selection no-ops", () => {
  const searching = freeze(setSearchQuery(initial, "Repeated child"));
  const target = freeze(searchViewer(fixture, "urn:test:shared")[1]);
  const before = JSON.stringify({ searching, target });
  const moved = freeze(navigateViewer(fixture, searching, target));
  assert.equal(moved.navigation.query, "Repeated child");
  assert.equal(navigateViewer(fixture, moved, target), moved);
  const picked = freeze(pickSearchResult(fixture, moved, target));
  assert.equal(picked.navigation.query, "");
  assert.equal(picked.interaction, moved.interaction);
  assert.equal(pickSearchResult(fixture, picked, target), picked);
  assert.deepEqual(pickSearchResult(fixture, searching, target), picked);
  const invalid = freeze({ ...target, occurrence: { startJourneyRef: "missing", steps: [] } });
  assert.equal(pickSearchResult(fixture, searching, invalid), searching);
  assert.equal(JSON.stringify({ searching, target }), before);
});

test("occurrence wording uses labels and disambiguates repeated references independently of unresolved positions", () => {
  const before = JSON.stringify(review);
  const matches = searchViewer(review, "urn:test:shared");
  assert.equal(matches[0].context, "First root / via Several child journeys / Repeated child (reference 1 of 2)");
  assert.equal(matches[1].context, "First root / via Several child journeys / Repeated child (reference 2 of 2)");
  assert.equal(matches[2].context, "Second root / via A second call site / Repeated child");
  const other = pick(review, "urn:test:other");
  assert.equal(other.context, "First root / via Several child journeys / Other child");
  const repeatedState = freeze({ ...review, nodes: review.nodes.map((node) => node["@id"] === "urn:test:first"
    ? { ...node, stateRefs: [...node.stateRefs, "urn:test:compose"] } : node) });
  assert.ok(searchViewer(repeatedState, "urn:test:shared").some((result) => result.context.includes("via Several child journeys (reference 2 of 2)")));
  const equalChildLabels = freeze({ ...review, nodes: review.nodes.map((node) => node["@id"] === "urn:test:other"
    ? { ...node, label: "Repeated child" } : node) });
  assert.match(pick(equalChildLabels, "urn:test:other").context, /Repeated child \(urn:test:other\)/);
  const equalRootLabels = freeze({ ...review, nodes: review.nodes.map((node) => node["@id"] === "urn:test:second"
    ? { ...node, label: "First root" } : node) });
  assert.match(searchViewer(equalRootLabels, "urn:test:shared")[0].context, /^First root \(urn:test:first\)/);
  assert.match(searchViewer(equalRootLabels, "urn:test:shared")[2].context, /^First root \(urn:test:second\)/);
  assert.doesNotMatch(matches.map((item) => item.context).join(" "), /state \d|child \d/);
  assert.equal(JSON.stringify(review), before);
});

test("navigation presents equal-label touchpoint IDs and explicitly labels its first 18 matches", () => {
  const snapshot = freeze(setSearchQuery(createViewerSnapshot(review), "urn:test:"));
  const html = renderToStaticMarkup(h(JourneyNavigation, { document: review, snapshot, ...bar }));
  assert.match(html, />Web \(urn:test:web\)<\/button>/);
  assert.match(html, />Web \(urn:test:phone\)<\/button>/);
  assert.match(html, /Showing first 18 matches\. Refine your search/);
});
