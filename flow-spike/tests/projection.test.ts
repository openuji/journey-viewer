import assert from "node:assert/strict";
import test from "node:test";
import { getNodesByType } from "@journey-viewer/ujg-jsonld";
import { createViewerInteraction } from "@journey-viewer/viewer";
import {
  emptyCompositesFixture,
  hierarchyFixture,
  minimalFixture,
  oidcDocument,
  screensFixture,
} from "@/data/node-documents";
import { buildFlowScene, terminalKey } from "@/model/flow-scene";
import type { FlowFrame, FlowJourney, FlowScene } from "@/model/flow-scene";
import { scopes } from "~/tests/scopes";

const journeysOf = (scene: FlowScene): FlowJourney[] => {
  const out: FlowJourney[] = [];
  const visit = (frame: FlowFrame) => {
    if (frame.content.kind === "row") frame.content.frames.forEach(visit);
    else {
      out.push(frame.content);
      for (const v of frame.content.vertices)
        if (v.kind === "frame") visit(v.frame);
    }
  };
  scene.frames.forEach(visit);
  return out;
};

test("every transition of a drawn journey is in exactly one bundle, and pairs never repeat", () => {
  for (const [name, interaction] of scopes(oidcDocument)) {
    const scene = buildFlowScene(oidcDocument, interaction);
    assert.deepEqual(scene.issues, [], name);
    for (const journey of journeysOf(scene)) {
      const drawn = journey.bundles.flatMap((b) =>
        [...b.forward, ...b.backward].map((t) => t.node["@id"]),
      );
      assert.deepEqual(
        [...drawn].sort(),
        [...(journey.journey.transitionRefs ?? [])].sort(),
        `${name}: ${journey.journey["@id"]}`,
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

test("the full disclosure draws all 120 transitions, keeping canonical objects by reference", () => {
  const scene = buildFlowScene(
    oidcDocument,
    createViewerInteraction(oidcDocument),
  );
  const transitions = new Map(
    getNodesByType(oidcDocument, "Transition").map((t) => [t["@id"], t]),
  );
  const drawn = journeysOf(scene).flatMap((j) =>
    j.bundles.flatMap((b) => [...b.forward, ...b.backward]),
  );
  assert.equal(drawn.length, 120);
  for (const t of drawn) assert.equal(t.node, transitions.get(t.node["@id"]));
  assert.ok(Object.isFrozen(oidcDocument));
});

test("boundary mappings follow UJG ED Graph: explicit entries, default entries, no inference", () => {
  const scene = buildFlowScene(
    oidcDocument,
    createViewerInteraction(oidcDocument),
  );
  const all = journeysOf(scene).flatMap((j) =>
    j.bundles.flatMap((b) => [
      ...b.forward.map((t) => [b.b, t] as const),
      ...b.backward.map((t) => [b.a, t] as const),
    ]),
  );
  for (const [terminal, t] of all) {
    if (t.node.toEntryRef)
      assert.equal(terminal.port, `entry:${t.node.toEntryRef}`);
    if (t.viaDefault) {
      assert.equal(t.node.toEntryRef, undefined);
      assert.match(terminal.port ?? "", /^entry:/);
    }
  }
  const unmapped = all.filter(
    ([terminal, t]) =>
      !t.node.toEntryRef &&
      terminal.port !== undefined &&
      terminal.port !== "out" &&
      !terminal.port.startsWith("exit:"),
  );
  assert.equal(unmapped.length, 16, "16 OIDC arrivals carry no toEntryRef");
  for (const journey of journeysOf(scene))
    assert.deepEqual(
      journey.entries.map((e) => e.node["@id"]),
      journey.journey.entryRefs,
      "entries are exactly the declared ones",
    );
});

test("recursion stops with a marker, and sibling child journeys get separate frames with no edges between them", () => {
  const scene = buildFlowScene(
    hierarchyFixture,
    createViewerInteraction(hierarchyFixture),
  );
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
    cards.some((c) => c.recursive.length > 0),
    "a recursive reference is marked",
  );
  for (const c of cards)
    if (c.recursive.length === c.children.length && c.children.length > 0)
      assert.equal(c.toggle, null);
  const rows = journeysOf(scene).flatMap((j) =>
    j.vertices.flatMap((v) =>
      v.kind === "frame" && v.frame.content.kind === "row"
        ? [v.frame.content]
        : [],
    ),
  );
  const screenRows = journeysOf(
    buildFlowScene(screensFixture, createViewerInteraction(screensFixture)),
  ).flatMap((j) =>
    j.vertices.flatMap((v) =>
      v.kind === "frame" && v.frame.content.kind === "row"
        ? [v.frame.content]
        : [],
    ),
  );
  assert.ok(
    [...rows, ...screenRows].some((row) => row.frames.length > 1),
    "a multi-child composite opens as sibling frames",
  );
  for (const row of [...rows, ...screenRows]) {
    const keys = new Set(row.frames.map((f) => f.key));
    for (const frame of row.frames)
      if (frame.content.kind === "journey")
        for (const b of frame.content.bundles) {
          assert.ok(
            ![b.a.vertex, b.b.vertex].some(
              (k) => keys.has(k) && k !== frame.key,
            ),
          );
        }
  }
});

test("childless composites have no toggle; outgoing navigation becomes a marker, never an edge", () => {
  const empty = journeysOf(
    buildFlowScene(
      emptyCompositesFixture,
      createViewerInteraction(emptyCompositesFixture),
    ),
  );
  const childless = empty.flatMap((j) =>
    j.vertices.flatMap((v) =>
      v.kind === "composite" && v.card.children.length === 0 ? [v.card] : [],
    ),
  );
  assert.ok(childless.length > 0);
  for (const card of childless) assert.equal(card.toggle, null);
  const minimal = buildFlowScene(
    minimalFixture,
    createViewerInteraction(minimalFixture),
  );
  const markers = journeysOf(minimal).flatMap((j) =>
    j.vertices.flatMap((v) =>
      v.kind === "state" && v.outgoing > 0 ? [v] : [],
    ),
  );
  assert.ok(markers.length > 0, "outgoing navigation is counted on its state");
  const outgoing = new Set(
    getNodesByType(minimalFixture, "OutgoingTransition").map((o) => o["@id"]),
  );
  for (const j of journeysOf(minimal))
    for (const b of j.bundles)
      for (const t of [...b.forward, ...b.backward])
        assert.ok(!outgoing.has(t.node["@id"]));
});
