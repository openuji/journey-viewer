import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { JourneyInspector, JourneyExplorer, createViewerInteraction, collapseAllJourneys, selectNode, toggleChildJourneys } from "../dist/index.js";
const freeze = (value) => {
  if (value && typeof value === "object") { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
};
const oidc = freeze(JSON.parse(await readFile(new URL("../../../examples/solid-oidc/solid-oidc.ujg.jsonld", import.meta.url), "utf8")));
const fixture = freeze(JSON.parse(await readFile(new URL("fixtures/hierarchy.ujg.jsonld", import.meta.url), "utf8")));
const inspect = (document, selection) => renderToStaticMarkup(h(JourneyInspector, { document, selection: freeze(selection) }));

test("state inspection uses explicit local transitions and keeps boundary entry/exit annotations", () => {
  const html = inspect(oidc, { kind: "state", journeyRef: "urn:ujg:solid-oidc:app-auth-journey", nodeRef: "urn:ujg:solid-oidc:idp-auth-flow" });
  assert.match(html, /Incoming transitions/);
  assert.match(html, /Outgoing transitions/);
  assert.match(html, /Nested journeys/);
  assert.match(html, /Entry boundary:/);
  assert.match(html, /Exit boundary:/);
  assert.match(html, /urn:ujg:solid-oidc:idp-login-entry/);
  assert.match(html, /urn:ujg:solid-oidc:idp-auth-failed/);
  assert.doesNotMatch(html, /<button|<img|breadcrumb/i);
});

test("entry call sites and exit handlers follow explicit boundary fields across parents", () => {
  const entry = inspect(oidc, { kind: "entry", journeyRef: "urn:ujg:solid-oidc:idp-auth-journey", nodeRef: "urn:ujg:solid-oidc:idp-login-entry" });
  assert.match(entry, /Starts at/);
  assert.match(entry, /Call sites/);
  assert.match(entry, /urn:ujg:solid-oidc:app-starts-idp-auth/);
  const exit = inspect(oidc, { kind: "exit", journeyRef: "urn:ujg:solid-oidc:idp-auth-journey", nodeRef: "urn:ujg:solid-oidc:idp-auth-failed" });
  assert.match(exit, /Produced by/);
  assert.match(exit, /Parent continuation handlers/);
  assert.match(exit, /urn:ujg:solid-oidc:app-continues-after-idp-failed/);
});

test("shared child contracts show all explicit callers, and exclude unrelated boundary references", () => {
  const document = freeze({ ...fixture, nodes: [...fixture.nodes,
    { "@id": "urn:test:call1", "@type": "Transition", from: "urn:test:terminal", to: "urn:test:compose", toEntryRef: "urn:test:child-entry" },
    { "@id": "urn:test:call2", "@type": "Transition", from: "urn:test:compose-again", to: "urn:test:compose-again", toEntryRef: "urn:test:child-entry" },
    { "@id": "urn:test:wrong", "@type": "Transition", from: "urn:test:terminal", to: "urn:test:terminal", toEntryRef: "urn:test:child-entry" },
  ].map((node) => node["@id"] === "urn:test:first" ? { ...node, transitionRefs: ["urn:test:call1", "urn:test:wrong"] }
    : node["@id"] === "urn:test:second" ? { ...node, transitionRefs: ["urn:test:call2"] } : node) });
  const before = JSON.stringify(document);
  const html = inspect(document, { kind: "entry", journeyRef: "urn:test:shared", nodeRef: "urn:test:child-entry" });
  assert.match(html, /urn:test:call1/);
  assert.match(html, /urn:test:call2/);
  assert.doesNotMatch(html, /urn:test:wrong/);
  assert.equal(JSON.stringify(document), before);
});

test("journey inspection and empty/unresolved selections render from readonly presentation only", () => {
  const html = inspect(fixture, { kind: "journey", journeyRef: "urn:test:first", nodeRef: "urn:test:first" });
  assert.match(html, /States/);
  assert.match(html, /Transitions/);
  assert.match(html, /Default entry/);
  assert.match(html, /Web/);
  assert.match(html, /Phone/);
  assert.match(inspect(fixture, null), /Select a journey, state, entry or exit/);
  assert.match(inspect(fixture, { kind: "state", journeyRef: "urn:test:missing", nodeRef: "urn:test:terminal" }), /Select a journey/);
});

test("controlled hierarchy renders frozen snapshots without invoking callbacks or owning state", () => {
  const interaction = freeze(collapseAllJourneys(freeze(createViewerInteraction(fixture))));
  const before = JSON.stringify(interaction);
  const html = renderToStaticMarkup(h(JourneyExplorer, {
    document: fixture, interaction,
    onSelect: () => assert.fail("render must not invoke selection callbacks"),
    onToggleChildren: () => assert.fail("render must not invoke disclosure callbacks"),
  }));
  assert.match(html, /aria-expanded="false"/);
  assert.match(html, /aria-pressed="true"/);
  assert.doesNotMatch(html, /data-journey-ref="urn:test:shared"/);
  assert.equal(JSON.stringify(interaction), before);
});

test("selection reveals every repeated child occurrence even when its siblings remain collapsed", () => {
  const collapsed = freeze(collapseAllJourneys(freeze(createViewerInteraction(fixture))));
  const selected = freeze(selectNode(fixture, collapsed, freeze({ kind: "state", journeyRef: "urn:test:shared", nodeRef: "urn:test:repeat" })));
  const render = (interaction) => renderToStaticMarkup(h(JourneyExplorer, {
    document: fixture, interaction, onSelect: () => {}, onToggleChildren: () => {},
  }));
  const html = render(selected);
  assert.equal((html.match(/data-journey-ref="urn:test:shared"/g) ?? []).length, 3);
  assert.doesNotMatch(html, /data-journey-ref="urn:test:other"/);
  assert.match(html, /aria-label="Collapse Several child journeys"/);
  const closed = freeze(toggleChildJourneys(fixture, selected, "urn:test:first", "urn:test:compose"));
  assert.doesNotMatch(render(closed), /data-journey-ref="urn:test:shared"/);
});

test("empty and unresolved composites keep notices inside selectable rows even when all journeys are collapsed", async () => {
  const document = freeze(JSON.parse(await readFile(new URL("fixtures/empty-composites.ujg.jsonld", import.meta.url), "utf8")));
  const before = JSON.stringify(document);
  const initial = freeze(createViewerInteraction(document));
  for (const interaction of [initial, freeze(collapseAllJourneys(initial))]) {
    const html = renderToStaticMarkup(h(JourneyExplorer, {
      document, interaction,
      onSelect: () => assert.fail("render must not select"),
      onToggleChildren: () => assert.fail("render must not toggle"),
    }));
    assert.equal((html.match(/No child journeys\./g) ?? []).length, 2);
    // Each notice is nested inside StateRow, rather than appended to the state wrapper.
    assert.equal((html.match(/<div class="[^"]*nested[^"]*"><div[^>]*><p[^>]*>No child journeys\.<\/p><\/div><\/div><\/div><\/div>/g) ?? []).length, 2);
    assert.equal((html.match(/data-state-ref=/g) ?? []).length, 3);
    assert.match(html, /aria-pressed="true"[^>]*><span[^>]*>No child references/);
    assert.doesNotMatch(html, /aria-expanded|data-journey-ref="urn:test:missing"/);
  }
  assert.equal(JSON.stringify(document), before);
});
