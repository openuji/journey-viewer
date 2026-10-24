import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { JourneyHierarchy } from "@journey-viewer/viewer";

const freeze = (value) => {
  if (value && typeof value === "object") {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
};
const readDocument = async (url) =>
  freeze(JSON.parse(await readFile(url, "utf8")));
const oidc = await readDocument(
  new URL(
    "../../../examples/solid-oidc/solid-oidc.ujg.jsonld",
    import.meta.url,
  ),
);
const fixture = await readDocument(
  new URL("fixtures/hierarchy.ujg.jsonld", import.meta.url),
);
const render = (document, props = {}) =>
  renderToStaticMarkup(h(JourneyHierarchy, { document, ...props }));
const refs = (html, name) =>
  [...html.matchAll(new RegExp(`data-${name}-ref="([^"]+)"`, "g"))].map(
    (match) => match[1],
  );

test("OIDC renders every explicit journey, state, entry and exit in source hierarchy order", () => {
  const before = JSON.stringify(oidc);
  const html = render(oidc);
  const journeys = oidc.nodes.filter((node) => node["@type"] === "Journey");
  assert.deepEqual(
    refs(html, "journey"),
    journeys.map((node) => node["@id"]),
  );
  const states = oidc.nodes.filter((node) =>
    ["State", "CompositeState"].includes(node["@type"]),
  );
  assert.equal(refs(html, "state").length, 47);
  assert.deepEqual(
    new Set(refs(html, "state")),
    new Set(states.map((node) => node["@id"])),
  );
  assert.equal((html.match(/data-contract-kind="entry"/g) ?? []).length, 20);
  assert.equal((html.match(/data-contract-kind="exit"/g) ?? []).length, 24);
  for (const node of oidc.nodes.filter((node) =>
    ["JourneyEntry", "JourneyExit"].includes(node["@type"]),
  )) {
    assert.ok(refs(html, "contract").includes(node["@id"]));
  }
  assert.equal((html.match(/\(default\)/g) ?? []).length, 10);
  assert.equal((html.match(/<article/g) ?? []).length, 1);
  assert.doesNotMatch(
    html,
    /Recursive journey reference|Journeys without a root|<button|aria-pressed|aria-expanded/,
  );
  assert.equal(JSON.stringify(oidc), before);
  assert.equal(render(oidc), html);
});

test("multiple roots, all ordered children, and repeated call sites retain separate occurrences", () => {
  const html = render(fixture);
  assert.deepEqual(refs(html, "journey"), [
    "urn:test:first",
    "urn:test:shared",
    "urn:test:other",
    "urn:test:shared",
    "urn:test:second",
    "urn:test:shared",
    "urn:test:cycle-a",
    "urn:test:cycle-b",
    "urn:test:cycle-b",
    "urn:test:cycle-a",
  ]);
  assert.equal(
    refs(html, "journey").filter((ref) => ref === "urn:test:shared").length,
    3,
  );
  assert.equal(
    refs(html, "recursive").filter((ref) => ref === "urn:test:shared").length,
    3,
  );
  assert.doesNotMatch(
    html,
    /data-journey-ref="urn:test:missing"|data-state-ref="urn:test:unowned"/,
  );
  assert.match(html, /Web, Phone/);
  assert.doesNotMatch(html, /<button|aria-pressed|aria-expanded/);
});

test("disconnected mutual recursion stays visible in an explicitly rootless group", () => {
  const html = render(fixture);
  assert.match(html, /role="group" aria-label="Journeys without a root"/);
  assert.equal(refs(html, "recursive").length, 5);
  assert.equal((html.match(/<article/g) ?? []).length, 4);
  assert.equal(refs(html, "recursive").includes("urn:test:cycle-a"), true);
  assert.equal(refs(html, "recursive").includes("urn:test:cycle-b"), true);
});

test("entry and direct exit marks use only the containing journey's explicit contracts", () => {
  const html = render(fixture);
  assert.equal(
    (html.match(/>1 entry names this state<\/span>/g) ?? []).length,
    4,
  );
  assert.equal(
    (
      html.match(
        />1 listed exit reached by a direct transition from this state<\/span>/g,
      ) ?? []
    ).length,
    1,
  );
  assert.equal((html.match(/\(default\)/g) ?? []).length, 1);
  assert.ok(refs(html, "contract").includes("urn:test:child-entry"));
  assert.doesNotMatch(html, /data-journey-ref="urn:test:index"/);
});

test("empty documents, empty composites, unresolved targets, and unlabeled nodes are explicit", () => {
  assert.match(
    render(
      freeze({
        "@context": "urn:context",
        "@id": "urn:empty",
        "@type": "UJGDocument",
      }),
    ),
    /No journeys\./,
  );
  const document = freeze({
    "@context": "urn:context",
    "@id": "urn:minimal",
    "@type": "UJGDocument",
    nodes: [
      {
        "@id": "urn:root",
        "@type": "Journey",
        entryRefs: ["urn:e", "urn:missing"],
        stateRefs: ["urn:c", "urn:missing"],
        exitRefs: ["urn:x"],
        defaultEntryRef: "urn:missing",
      },
      {
        "@id": "urn:c",
        "@type": "CompositeState",
        label: "Empty composite",
        subjourneyRefs: ["urn:missing"],
      },
      { "@id": "urn:e", "@type": "JourneyEntry", stateRef: "urn:c" },
      { "@id": "urn:x", "@type": "JourneyExit" },
    ],
  });
  const html = render(document);
  assert.match(html, /No child journeys\./);
  assert.match(html, />urn:root<\/h2>/);
  assert.match(html, />urn:e<\/span>/);
  assert.match(html, />urn:x<\/span>/);
  assert.doesNotMatch(html, /\(default\)/);
});

test("frozen documents and props stay unchanged across instances and replacements", () => {
  const props = freeze({ document: fixture, level: 5 });
  const before = JSON.stringify(props);
  const first = renderToStaticMarkup(h(JourneyHierarchy, props));
  assert.match(first, /<h5/);
  assert.match(first, /<h6/);
  assert.doesNotMatch(first, /<h7/);
  render(oidc);
  assert.equal(renderToStaticMarkup(h(JourneyHierarchy, props)), first);
  assert.equal(JSON.stringify(props), before);
});
