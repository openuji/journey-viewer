import assert from "node:assert/strict";
import test from "node:test";
import { getNodesByType } from "@journey-viewer/ujg-jsonld";
import {
  createViewerInteraction,
  expandAllJourneys,
} from "@journey-viewer/viewer";
import { buildFlowScene, terminalKey } from "@/flow/scene";
import {
  emptyCompositesFixture,
  hierarchyFixture,
  journeysOf,
  minimalFixture,
  oidcDocument,
  scopes,
  screensFixture,
} from "~/tests/flow-scopes.mjs";

/** Every journey open: the full disclosure the projection tests draw. */
const fullyOpen = (document) =>
  expandAllJourneys(document, createViewerInteraction(document));

const journeyOf = (document, id) =>
  getNodesByType(document, "Journey").find((j) => j["@id"] === id);

test("every transition of a drawn journey is in exactly one bundle, and pairs never repeat", () => {
  for (const [name, interaction] of scopes(oidcDocument)) {
    const scene = buildFlowScene(oidcDocument, interaction);
    assert.deepEqual(scene.issues, [], name);
    for (const journey of journeysOf(scene)) {
      const drawn = journey.bundles.flatMap((b) =>
        [...b.forward, ...b.backward].map((t) => t.id),
      );
      assert.deepEqual(
        [...drawn].sort(),
        [...(journeyOf(oidcDocument, journey.id).transitionRefs ?? [])].sort(),
        `${name}: ${journey.id}`,
      );
      const pairs = journey.bundles.map((b) =>
        [terminalKey(b.a), terminalKey(b.b)].sort().join("~"),
      );
      assert.equal(
        new Set(pairs).size,
        pairs.length,
        `${name}: one connector per terminal pair`,
      );
    }
  }
});

test("the full disclosure draws all 120 transitions, each once, without touching the document", () => {
  const scene = buildFlowScene(oidcDocument, fullyOpen(oidcDocument));
  const drawn = journeysOf(scene).flatMap((j) =>
    j.bundles.flatMap((b) => [...b.forward, ...b.backward].map((t) => t.id)),
  );
  assert.equal(drawn.length, 120);
  assert.deepEqual(
    [...new Set(drawn)].sort(),
    getNodesByType(oidcDocument, "Transition")
      .map((t) => t["@id"])
      .sort(),
  );
  assert.ok(Object.isFrozen(oidcDocument));
});

test("boundary mappings follow UJG ED Graph: explicit entries, default entries, no inference", () => {
  const scene = buildFlowScene(oidcDocument, fullyOpen(oidcDocument));
  const transitions = new Map(
    getNodesByType(oidcDocument, "Transition").map((t) => [t["@id"], t]),
  );
  const all = journeysOf(scene).flatMap((j) =>
    j.bundles.flatMap((b) => [
      ...b.forward.map((t) => [b.b, t]),
      ...b.backward.map((t) => [b.a, t]),
    ]),
  );
  for (const [terminal, t] of all) {
    const { toEntryRef } = transitions.get(t.id);
    if (toEntryRef) assert.equal(terminal.port, `entry:${toEntryRef}`);
    if (t.viaDefault) {
      assert.equal(toEntryRef, undefined);
      assert.match(terminal.port ?? "", /^entry:/);
    }
  }
  const unmapped = all.filter(
    ([terminal, t]) =>
      !transitions.get(t.id).toEntryRef &&
      terminal.port !== undefined &&
      terminal.port !== "out" &&
      !terminal.port.startsWith("exit:"),
  );
  assert.equal(unmapped.length, 16, "16 OIDC arrivals carry no toEntryRef");
  for (const journey of journeysOf(scene))
    assert.deepEqual(
      journey.entries.map((e) => e.id),
      journeyOf(oidcDocument, journey.id).entryRefs,
      "entries are exactly the declared ones",
    );
});

test("recursion stops with a marker, and sibling child journeys get separate frames with no edges between them", () => {
  const scene = buildFlowScene(hierarchyFixture, fullyOpen(hierarchyFixture));
  const cards = journeysOf(scene).flatMap((j) =>
    j.vertices.flatMap((v) =>
      v.kind === "composite"
        ? [v.card]
        : v.kind === "frame"
          ? [v.frame.card]
          : [],
    ),
  );
  assert.ok(
    cards.some((c) => c.children.some((child) => child.recursive)),
    "a recursive reference is marked",
  );
  for (const c of cards)
    if (c.children.length > 0 && c.children.every((child) => child.recursive))
      assert.equal(c.toggle, null);
  const rowsOf = (document) =>
    journeysOf(buildFlowScene(document, fullyOpen(document))).flatMap((j) =>
      j.vertices.flatMap((v) =>
        v.kind === "frame" && v.frame.content.kind === "row"
          ? [v.frame.content]
          : [],
      ),
    );
  const rows = [...rowsOf(hierarchyFixture), ...rowsOf(screensFixture)];
  assert.ok(
    rows.some((row) => row.frames.length > 1),
    "a multi-child composite opens as sibling frames",
  );
  for (const row of rows) {
    const keys = new Set(row.frames.map((f) => f.key));
    for (const frame of row.frames)
      if (frame.content.kind === "journey")
        for (const b of frame.content.bundles)
          assert.ok(
            ![b.a.vertex, b.b.vertex].some(
              (k) => keys.has(k) && k !== frame.key,
            ),
          );
  }
});

test("childless composites have no toggle; outgoing navigation is never an edge", () => {
  const empty = journeysOf(
    buildFlowScene(emptyCompositesFixture, fullyOpen(emptyCompositesFixture)),
  );
  const childless = empty.flatMap((j) =>
    j.vertices.flatMap((v) =>
      v.kind === "composite" && v.card.children.length === 0 ? [v.card] : [],
    ),
  );
  assert.ok(childless.length > 0);
  for (const card of childless) assert.equal(card.toggle, null);
  const minimal = buildFlowScene(minimalFixture, fullyOpen(minimalFixture));
  const outgoing = new Set(
    getNodesByType(minimalFixture, "OutgoingTransition").map((o) => o["@id"]),
  );
  assert.ok(outgoing.size > 0);
  for (const j of journeysOf(minimal))
    for (const b of j.bundles)
      for (const t of [...b.forward, ...b.backward])
        assert.ok(!outgoing.has(t.id));
});

test("the scene carries plain ids and labels, with the canonical selection target of every block", () => {
  const scene = buildFlowScene(oidcDocument, fullyOpen(oidcDocument));
  const [root] = scene.frames;
  assert.equal(root.card.kind, "journey");
  assert.deepEqual(root.card.target.selection, {
    kind: "journey",
    journeyRef: root.card.id,
    nodeRef: root.card.id,
  });
  for (const journey of journeysOf(scene)) {
    for (const v of journey.vertices) {
      assert.equal(v.journeyId, journey.id);
      assert.equal(typeof v.label, "string");
      if (v.kind === "state")
        assert.deepEqual(v.target.selection, {
          kind: "state",
          journeyRef: journey.id,
          nodeRef: v.id,
        });
    }
    for (const c of [...journey.entries, ...journey.exits])
      assert.deepEqual(c.target.selection, {
        kind: c.kind,
        journeyRef: journey.id,
        nodeRef: c.id,
      });
  }
  assert.doesNotMatch(
    JSON.stringify(scene),
    /"@id"|"@type"|"(?!journeyRef"|nodeRef"|startJourneyRef")\w+Refs?"/,
    "no JSON-LD or UJG wire names leave the projection, beyond the public viewer target",
  );
});
