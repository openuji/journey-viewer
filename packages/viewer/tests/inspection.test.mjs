import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  JourneyInspector,
  JourneyExplorer,
  createViewerInteraction,
  collapseAllJourneys,
  searchViewer,
  selectNode,
  toggleChildJourneys,
} from "@journey-viewer/viewer";
import { freeze, graphOf } from "~/tests/graphs.mjs";
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
const inspect = (document, selection) =>
  renderToStaticMarkup(
    h(JourneyInspector, {
      graph: graphOf(document),
      selection: freeze(selection),
    }),
  );

test("state inspection groups explicit local transitions and keeps boundary entry/exit annotations", () => {
  const html = inspect(oidc, {
    kind: "state",
    journeyId: "urn:ujg:solid-oidc:app-auth-journey",
    nodeId: "urn:ujg:solid-oidc:idp-auth-flow",
  });
  assert.match(html, /Composite state/);
  assert.match(html, />Nested journey</);
  assert.match(html, /IdP auth journey/);
  assert.match(html, /12 states · 5 entries · 4 exits/);
  assert.match(
    html,
    /Touchpoint change: App touchpoint → Identity provider touchpoint/,
  );
  assert.match(html, />Incoming</);
  assert.match(html, />Outgoing</);
  assert.match(html, /Start sign-in/);
  assert.match(html, /enters at Start at login/);
  assert.match(html, /on child exit: IdP auth failed/);
  assert.match(html, /App auth journey · 1 entry · 0 exported exits/);
  // Informational inspection without navigation has no controls or images.
  assert.doesNotMatch(html, /<button|<img|breadcrumb/i);
});

test("entry call sites and exit handlers follow the explicit call site's parent", () => {
  const occurrenceOf = (ref) =>
    searchViewer(graphOf(oidc), ref).find(
      (item) => item.selection.nodeId === ref,
    );
  const login = occurrenceOf("urn:ujg:solid-oidc:idp-login-entry");
  const entry = renderToStaticMarkup(
    h(JourneyInspector, {
      graph: graphOf(oidc),
      selection: login.selection,
      navigation: {
        occurrence: login.occurrence,
        onNavigate: () => assert.fail("render must not navigate"),
      },
    }),
  );
  assert.match(entry, /Journey entry/);
  assert.match(entry, /Starts at/);
  assert.match(entry, /Invoked from App auth journey/);
  assert.match(entry, /Sign-in required/);
  assert.match(entry, /Start sign-in/);
  const failed = occurrenceOf("urn:ujg:solid-oidc:idp-auth-failed");
  const exit = renderToStaticMarkup(
    h(JourneyInspector, {
      graph: graphOf(oidc),
      selection: failed.selection,
      navigation: {
        occurrence: failed.occurrence,
        onNavigate: () => assert.fail("render must not navigate"),
      },
    }),
  );
  assert.match(exit, /Journey exit/);
  assert.match(exit, /Produced by/);
  assert.match(exit, /Handled by parent/);
  assert.match(exit, /Continue after failed login/);
  assert.match(exit, /App auth journey \/ IdP auth journey/);
  assert.ok(
    (exit.match(/<button/g) ?? []).length > 0,
    "navigable inspection exposes group-head buttons",
  );
  const informational = inspect(oidc, failed.selection);
  assert.doesNotMatch(informational, /Handled by parent/);
});

test("shared child entries show the callers at each explicit call site, excluding unrelated boundary references", () => {
  const document = freeze({
    ...fixture,
    nodes: [
      ...fixture.nodes,
      {
        "@id": "urn:test:call1",
        "@type": "Transition",
        label: "First call",
        from: "urn:test:terminal",
        to: "urn:test:compose",
        toEntryRef: "urn:test:child-entry",
      },
      {
        "@id": "urn:test:call2",
        "@type": "Transition",
        label: "Second call",
        from: "urn:test:compose-again",
        to: "urn:test:compose-again",
        toEntryRef: "urn:test:child-entry",
      },
      {
        "@id": "urn:test:wrong",
        "@type": "Transition",
        label: "Unrelated",
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
  const before = JSON.stringify(document);
  const selection = freeze({
    kind: "entry",
    journeyId: "urn:test:shared",
    nodeId: "urn:test:child-entry",
  });
  const at = (occurrence) =>
    renderToStaticMarkup(
      h(JourneyInspector, {
        graph: graphOf(document),
        selection,
        navigation: { occurrence, onNavigate: () => {} },
      }),
    );
  const first = at({
    startJourneyId: "urn:test:first",
    steps: [{ stateIndex: 0, childIndex: 0 }],
  });
  assert.match(first, /Invoked from First root/);
  assert.match(first, /First call/);
  assert.doesNotMatch(first, /Second call|Unrelated/);
  const second = at({
    startJourneyId: "urn:test:second",
    steps: [{ stateIndex: 0, childIndex: 0 }],
  });
  assert.match(second, /Invoked from Second root/);
  assert.match(second, /Second call/);
  assert.doesNotMatch(second, /First call|Unrelated/);
  assert.equal(JSON.stringify(document), before);
});

test("journey inspection and empty/unresolved selections render from readonly presentation only", () => {
  const html = inspect(fixture, {
    kind: "journey",
    journeyId: "urn:test:first",
    nodeId: "urn:test:first",
  });
  assert.match(html, />Journey</);
  assert.match(html, /Entries/);
  assert.match(html, /Exits/);
  assert.match(html, /Default entry/);
  assert.match(html, /Begin first root/);
  assert.match(html, /Finish first root/);
  assert.match(
    inspect(fixture, null),
    /Select a journey, state, entry or exit/,
  );
  assert.match(
    inspect(fixture, {
      kind: "state",
      journeyId: "urn:test:missing",
      nodeId: "urn:test:terminal",
    }),
    /Select a journey/,
  );
});

test("controlled hierarchy renders frozen snapshots without invoking callbacks or owning state", () => {
  const interaction = freeze(
    collapseAllJourneys(freeze(createViewerInteraction(graphOf(fixture)))),
  );
  const before = JSON.stringify(interaction);
  const html = renderToStaticMarkup(
    h(JourneyExplorer, {
      graph: graphOf(fixture),
      interaction,
      onSelect: () => assert.fail("render must not invoke selection callbacks"),
      onToggleChildren: () =>
        assert.fail("render must not invoke disclosure callbacks"),
    }),
  );
  assert.match(html, /aria-expanded="false"/);
  assert.match(html, /aria-pressed="true"/);
  assert.doesNotMatch(html, /data-journey-ref="urn:test:shared"/);
  assert.equal(JSON.stringify(interaction), before);
});

test("selection reveals every repeated child occurrence even when its siblings remain collapsed", () => {
  const collapsed = freeze(
    collapseAllJourneys(freeze(createViewerInteraction(graphOf(fixture)))),
  );
  const selected = freeze(
    selectNode(
      graphOf(fixture),
      collapsed,
      freeze({
        kind: "state",
        journeyId: "urn:test:shared",
        nodeId: "urn:test:repeat",
      }),
    ),
  );
  const render = (interaction) =>
    renderToStaticMarkup(
      h(JourneyExplorer, {
        graph: graphOf(fixture),
        interaction,
        onSelect: () => {},
        onToggleChildren: () => {},
      }),
    );
  const html = render(selected);
  assert.equal(
    (html.match(/data-journey-ref="urn:test:shared"/g) ?? []).length,
    3,
  );
  assert.doesNotMatch(html, /data-journey-ref="urn:test:other"/);
  assert.match(html, /aria-label="Collapse Several child journeys"/);
  const closed = freeze(
    toggleChildJourneys(
      graphOf(fixture),
      selected,
      "urn:test:first",
      "urn:test:compose",
    ),
  );
  assert.doesNotMatch(render(closed), /data-journey-ref="urn:test:shared"/);
});

test("empty and unresolved composites keep notices inside selectable rows even when all journeys are collapsed", async () => {
  const document = freeze(
    JSON.parse(
      await readFile(
        new URL("fixtures/empty-composites.ujg.jsonld", import.meta.url),
        "utf8",
      ),
    ),
  );
  const before = JSON.stringify(document);
  const initial = freeze(createViewerInteraction(graphOf(document)));
  for (const interaction of [initial, freeze(collapseAllJourneys(initial))]) {
    const html = renderToStaticMarkup(
      h(JourneyExplorer, {
        graph: graphOf(document),
        interaction,
        onSelect: () => assert.fail("render must not select"),
        onToggleChildren: () => assert.fail("render must not toggle"),
      }),
    );
    assert.equal((html.match(/No child journeys\./g) ?? []).length, 2);
    // Each notice is nested inside StateRow, rather than appended to the state wrapper.
    assert.equal(
      (
        html.match(
          /<div class="[^"]*nested[^"]*"><div[^>]*><p[^>]*>No child journeys\.<\/p><\/div><\/div><\/div><\/div>/g,
        ) ?? []
      ).length,
      2,
    );
    assert.equal((html.match(/data-state-ref=/g) ?? []).length, 3);
    assert.match(
      html,
      /aria-pressed="true"[^>]*><span[^>]*>No child references/,
    );
    // Only the collapsed entry/exit summary is a disclosure; empty composites have no child toggle.
    assert.equal((html.match(/aria-expanded/g) ?? []).length, 1);
    assert.doesNotMatch(
      html,
      /aria-label="(?:Expand|Collapse) |data-journey-ref="urn:test:missing"/,
    );
  }
  assert.equal(JSON.stringify(document), before);
});
