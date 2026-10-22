import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createElement as h, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Badge, StateRow, Text } from "@journey-viewer/design-system";
import { JourneyExplorer, JourneyInspector, createViewerSnapshot } from "../dist/index.js";

const freeze = (value) => {
  if (value && typeof value === "object") { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
};
const document = freeze(JSON.parse(await readFile(new URL("fixtures/hierarchy.ujg.jsonld", import.meta.url), "utf8")));
const snapshot = freeze(createViewerSnapshot(document));
const unexpected = () => assert.fail("render must not invoke action callbacks");
const explorerProps = { document, interaction: snapshot.interaction, navigation: snapshot.navigation, onSelect: unexpected, onToggleChildren: unexpected };
const explorer = (extensions, props = {}) => renderToStaticMarkup(h(JourneyExplorer, { ...explorerProps, extensions, ...props }));
const inspector = (extensions, props = {}) => renderToStaticMarkup(h(JourneyInspector, {
  document, selection: snapshot.interaction.selection, extensions, ...props,
}));
const originalNode = (ref) => document.nodes.find((node) => node["@id"] === ref);
const checkContext = (context) => {
  assert.equal(context.document, document);
  assert.equal(context.node, originalNode(context.selection.nodeRef));
  assert.equal(context.journey, originalNode(context.selection.journeyRef));
};

test("omitted, empty and unmatched descriptors preserve exact built-in markup and frozen inputs", () => {
  const before = JSON.stringify({ document, snapshot });
  const unmatched = freeze({
    inspectorPanels: [{ id: "panel", title: "Unused", matches: () => false, Component: unexpected }],
    annotations: [{ id: "annotation", matches: () => false, Component: unexpected }],
    stateOverrides: [{ id: "row", matches: () => false, Component: unexpected }],
  });
  for (const extensions of [{}, { inspectorPanels: [], annotations: [], stateOverrides: [] }, unmatched]) {
    assert.equal(explorer(extensions), explorer());
    assert.equal(inspector(extensions), inspector());
  }
  assert.equal(JSON.stringify({ document, snapshot }), before);
});

test("matching panels append in supplied order for all selection kinds, using original nodes and explicit navigation", () => {
  function Panel(props) {
    checkContext(props);
    assert.equal(props.level, 5);
    assert.equal(props.onNavigate, unexpected);
    assert.equal(props.occurrence, snapshot.navigation.occurrence);
    return h(Text, null, `Custom ${props.selection.kind}: ${props.node["@id"]}`);
  }
  const extensions = freeze({ inspectorPanels: [
    { id: "first", title: "Source details", matches: (context) => { checkContext(context); return true; }, Component: Panel },
    { id: "skip", title: "Skipped", matches: () => false, Component: unexpected },
    { id: "second", title: "Additional note", matches: () => true, Component: () => h(Text, null, "Second panel") },
  ] });
  for (const [kind, nodeRef] of [["journey", "urn:test:first"], ["state", "urn:test:compose"], ["entry", "urn:test:entry"], ["exit", "urn:test:exit"]]) {
    const html = inspector(extensions, { selection: freeze({ kind, journeyRef: "urn:test:first", nodeRef }), level: 3,
      navigation: { occurrence: snapshot.navigation.occurrence, onNavigate: unexpected } });
    assert.match(html, new RegExp(`Custom ${kind}: ${nodeRef}`));
    assert.ok(html.indexOf("Navigate graph") < html.indexOf("Source details"));
    assert.ok(html.indexOf("Source details") < html.indexOf("Additional note"));
    assert.match(html, /<h4[^>]*>Source details/);
    assert.doesNotMatch(html, /Skipped/);
  }
});

test("informational panels receive null occurrence and no navigation, with heading levels capped at six", () => {
  const html = inspector(freeze({ inspectorPanels: [{ id: "info", title: "Information", matches: () => true, Component: (props) => {
    assert.equal(props.occurrence, null);
    assert.equal(props.onNavigate, undefined);
    assert.equal(props.level, 6);
    return h(Text, null, "Informational extension");
  } }] }), { level: 6 });
  assert.match(html, /<h6[^>]*>Information/);
  assert.doesNotMatch(html, /<h7|Navigate graph/);
});

test("annotations receive each finite call site and render for journey/state and entry/exit inspectors", () => {
  const calls = [];
  const extensions = freeze({ annotations: [{ id: "note", matches: (context) => {
    checkContext(context);
    return context.selection.nodeRef === "urn:test:repeat" || context.selection.kind !== "state";
  }, Component: (context) => {
    calls.push(context);
    return h(Badge, null, `Note for ${context.selection.kind}`);
  } }] });
  const html = explorer(extensions);
  assert.equal(calls.filter((context) => context.selection.nodeRef === "urn:test:repeat").length, 3);
  const repeated = calls.filter((context) => context.selection.nodeRef === "urn:test:repeat");
  assert.deepEqual(repeated.map((context) => context.occurrence), [
    { startJourneyRef: "urn:test:first", steps: [{ stateIndex: 0, childIndex: 0 }] },
    { startJourneyRef: "urn:test:first", steps: [{ stateIndex: 0, childIndex: 2 }] },
    { startJourneyRef: "urn:test:second", steps: [{ stateIndex: 0, childIndex: 0 }] },
  ]);
  assert.match(html, /Note for journey/);
  assert.equal((html.match(/Note for state/g) ?? []).length, 3);
  assert.doesNotMatch(html, /aria-label="Annotations"/);
  for (const [kind, nodeRef] of [["entry", "urn:test:entry"], ["exit", "urn:test:exit"]]) {
    const inspected = inspector(extensions, {
      selection: { kind, journeyRef: "urn:test:first", nodeRef },
      navigation: { occurrence: snapshot.navigation.occurrence, onNavigate: unexpected },
    });
    assert.match(inspected, new RegExp(`Note for ${kind}`));
    assert.doesNotMatch(inspected, /aria-label="Annotations"/);
    assert.ok(inspected.indexOf(`Note for ${kind}`) < inspected.indexOf("Navigate graph"));
  }
});

test("the first matching state override receives complete readonly row controls and nested content", () => {
  let received;
  const selected = [];
  const toggled = [];
  const hovered = [];
  const extensions = freeze({ stateOverrides: [
    { id: "skip", matches: () => false, Component: unexpected },
    { id: "custom", matches: (context) => context.node["@id"] === "urn:test:compose", Component: ({ context, row }) => {
      checkContext(context);
      // A normal React component, rather than a directly invoked render callback.
      const [description] = useState("Custom row presentation");
      received = { context, row };
      return h(StateRow, { ...row, description });
    } },
    { id: "later", matches: (context) => { assert.notEqual(context.node["@id"], "urn:test:compose"); return false; }, Component: unexpected },
  ] });
  const before = JSON.stringify({ document, snapshot, extensions });
  const html = explorer(extensions, {
    onSelect: (...args) => selected.push(args), onToggleChildren: (...args) => toggled.push(args), onHover: (...args) => hovered.push(args),
  });
  assert.match(html, /Custom row presentation/);
  assert.equal((html.match(/data-journey-ref="urn:test:shared"/g) ?? []).length, 3);
  assert.equal((html.match(/data-recursive-ref=/g) ?? []).length, 5);
  assert.equal(received.row.selected, true);
  assert.equal(received.row.composite, true);
  assert.equal(received.row.expanded, true);
  assert.equal(received.row.entryCount, 1);
  assert.equal(selected.length + toggled.length + hovered.length, 0);
  received.row.onSelect(); received.row.onToggle(); received.row.onHover(true); received.row.onHover(false);
  assert.deepEqual(selected, [[snapshot.interaction.selection, snapshot.navigation.occurrence]]);
  assert.deepEqual(toggled, [["urn:test:first", "urn:test:compose"]]);
  assert.deepEqual(hovered, [[snapshot.interaction.selection, snapshot.navigation.occurrence], [null, null]]);
  assert.equal(JSON.stringify({ document, snapshot, extensions }), before);
});

test("removing descriptors restores defaults, and a matching null override deliberately suppresses its row", () => {
  const defaults = explorer();
  const extensions = freeze({ stateOverrides: [{ id: "hide", matches: (context) => context.node["@id"] === "urn:test:compose", Component: () => null }] });
  assert.doesNotMatch(explorer(extensions), /aria-label="Collapse Several child journeys"/);
  assert.equal(explorer(), defaults);
  assert.equal(inspector({}), inspector());
});

test("state overrides retain screenshot actions, filtered relations, focus links and empty-composite notices", () => {
  const source = freeze({ ...document, nodes: [...document.nodes,
    { "@id": "opaque:screen", "@type": "Surface", graphNodeRef: "urn:test:compose" },
  ] });
  const captures = [];
  const opens = [];
  const extensions = freeze({ stateOverrides: [{ id: "all", matches: () => true, Component: ({ context, row }) => {
    captures.push({ context, row });
    return h(StateRow, row);
  } }] });
  const navigation = freeze({ ...snapshot.navigation, focus: snapshot.navigation.occurrence, touchpointRefs: ["urn:test:phone"],
    hover: { kind: "exit", journeyRef: "urn:test:first", nodeRef: "urn:test:exit" }, hoverOccurrence: snapshot.navigation.occurrence });
  explorer(extensions, { document: source, navigation, onFocusJourney: unexpected,
    media: { screenshots: freeze({ "opaque:screen": "./screen.png" }), onOpen: (...args) => opens.push(args) } });
  const compose = captures.find(({ context }) => context.node["@id"] === "urn:test:compose");
  assert.equal(compose.row.composite, false);
  assert.equal(compose.row.expanded, false);
  assert.equal(compose.row.children, false);
  assert.match(renderToStaticMarkup(compose.row.notice), /Open Repeated child \(reference 1 of 2\)/);
  assert.match(renderToStaticMarkup(compose.row.actions), /Open screenshot:/);
  assert.equal(opens.length, 0);
  compose.row.actions[0].props.onClick();
  assert.deepEqual(opens, [[{ selection: snapshot.interaction.selection, occurrence: snapshot.navigation.occurrence }, "opaque:screen"]]);
  assert.equal(captures.find(({ context }) => context.node["@id"] === "urn:test:terminal").row.relation, "incoming");

  captures.length = 0;
  const empty = freeze({ ...source, nodes: source.nodes.map((node) => node["@id"] === "urn:test:compose" ? { ...node, subjourneyRefs: [] } : node) });
  explorer(extensions, { document: empty, navigation: freeze({ ...snapshot.navigation, touchpointRefs: ["urn:unassigned"] }) });
  const emptyRow = captures.find(({ context }) => context.node["@id"] === "urn:test:compose").row;
  assert.equal(emptyRow.filtered, true);
  assert.equal(emptyRow.onToggle, undefined);
  assert.match(renderToStaticMarkup(emptyRow.notice), /No child journeys\./);
});

test("invalid/empty inspection never evaluates descriptors; extension errors propagate to the caller", () => {
  const invalid = freeze({ inspectorPanels: [{ id: "bad", title: "Never", matches: unexpected, Component: unexpected }],
    annotations: [{ id: "bad", matches: unexpected, Component: unexpected }] });
  assert.match(inspector(invalid, { selection: null }), /Select a journey/);
  assert.match(inspector(invalid, { selection: { kind: "state", journeyRef: "urn:test:first", nodeRef: "urn:test:repeat" } }), /Select a journey/);
  const failure = new Error("Caller extension failed");
  assert.throws(() => inspector({ inspectorPanels: [{ id: "throws", title: "Error", matches: () => { throw failure; }, Component: unexpected }] }), (error) => error === failure);
  assert.throws(() => explorer({ annotations: [{ id: "throws", matches: () => true, Component: () => { throw failure; } }] }), (error) => error === failure);
});
