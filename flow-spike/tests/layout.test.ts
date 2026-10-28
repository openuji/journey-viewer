import assert from "node:assert/strict";
import test from "node:test";
import {
  collapseAllJourneys,
  createViewerInteraction,
  toggleChildJourneys,
} from "@journey-viewer/viewer";
import {
  emptyCompositesFixture,
  hierarchyFixture,
  minimalFixture,
  oidcDocument,
  screensFixture,
} from "@/data/node-documents";
import { buildFlowScene } from "@/model/flow-scene";
import { composeFlow } from "@/layout/compose";
import { layeredLevel } from "@/layout/layered";
import { measureArtifacts } from "@/layout/artifacts";
import { estimate } from "@/layout/text";
import { scopes } from "~/tests/scopes";

const layout = (
  document: typeof oidcDocument,
  interaction: Parameters<typeof buildFlowScene>[1],
) => composeFlow(buildFlowScene(document, interaction), layeredLevel, estimate);

test("the own engine draws no diagonals, kinks, or lines through blocks or frame borders", () => {
  const cases = [
    ...scopes(oidcDocument).map(
      ([name, i]) => [`oidc ${name}`, oidcDocument, i] as const,
    ),
    ...[
      hierarchyFixture,
      screensFixture,
      emptyCompositesFixture,
      minimalFixture,
    ].map((d) => [d["@id"], d, createViewerInteraction(d)] as const),
  ];
  for (const [name, document, interaction] of cases) {
    const report = measureArtifacts(layout(document, interaction));
    assert.deepEqual(
      {
        diagonals: report.diagonals,
        jogs: report.jogs,
        shortArrivals: report.shortArrivals,
        throughBoxes: report.throughBoxes,
        borderCrossings: report.borderCrossings,
      },
      {
        diagonals: 0,
        jogs: 0,
        shortArrivals: 0,
        throughBoxes: 0,
        borderCrossings: 0,
      },
      `${name}: ${report.examples.join("; ")}`,
    );
  }
});

test("states and closed composites have one contact point per side, at its centre", () => {
  for (const [name, interaction] of scopes(oidcDocument)) {
    const result = layout(oidcDocument, interaction);
    // An open composite shares its key with its frame; its connectors attach to the frame's ports.
    const open = new Set(result.frames.map((f) => f.key));
    const boxes = new Map(
      [...result.states, ...result.cards]
        .filter((b) => !open.has(b.key))
        .map((b) => [b.key, b.rect] as const),
    );
    for (const connector of result.connectors)
      for (const [key, point] of [
        [connector.from, connector.points[0]!],
        [connector.to, connector.points[connector.points.length - 1]!],
      ] as const) {
        const rect = boxes.get(key);
        if (!rect) continue;
        const where = `${name}: ${connector.key} at ${key}`;
        assert.ok(
          Math.abs(point.y - rect.y) <= 0.5 ||
            Math.abs(point.y - (rect.y + rect.height)) <= 0.5,
          `${where} is on the top or bottom border`,
        );
        assert.ok(
          Math.abs(point.x - (rect.x + rect.width / 2)) <= 0.5,
          `${where} is at the centre`,
        );
      }
  }
});

test("an open composite's card is its frame's top-left corner; contracts sit on the borders", () => {
  for (const [name, interaction] of scopes(oidcDocument)) {
    const result = layout(oidcDocument, interaction);
    for (const frame of result.frames) {
      const card = result.cards.find(
        (c) => c.key === frame.frame.card.key && c.heads,
      )!;
      assert.equal(card.rect.x, frame.rect.x, `${name}: ${frame.key}`);
      assert.equal(card.rect.y, frame.rect.y, `${name}: ${frame.key}`);
      const journey =
        frame.frame.content.kind === "journey"
          ? frame.frame.content
          : undefined;
      for (const contract of result.contracts.filter(
        (c) =>
          journey?.entries.includes(c.contract) ||
          journey?.exits.includes(c.contract),
      ))
        assert.equal(
          contract.glyph.y,
          contract.contract.kind === "entry"
            ? frame.rect.y
            : frame.rect.y + frame.rect.height,
        );
    }
  }
});

test("opening a composite never reorders its siblings", () => {
  const closed = collapseAllJourneys(createViewerInteraction(oidcDocument));
  const opened = toggleChildJourneys(
    oidcDocument,
    closed,
    "urn:ujg:solid-oidc:app-auth-journey",
    "urn:ujg:solid-oidc:idp-auth-flow",
  );
  const order = (i: typeof closed) =>
    layout(oidcDocument, i).levels.find(
      (l) => l.frame === "urn:ujg:solid-oidc:app-auth-journey",
    )!.layers;
  assert.deepEqual(order(opened), order(closed));
});

test("layout is deterministic", () => {
  const interaction = createViewerInteraction(oidcDocument);
  const strip = (l: ReturnType<typeof layout>) =>
    JSON.stringify(
      { ...l, levels: l.levels.map((r) => ({ ...r, milliseconds: 0 })) },
      (key, value) =>
        key === "frame" ||
        key === "card" ||
        key === "vertex" ||
        key === "contract" ||
        key === "bundle" ||
        key === "association"
          ? undefined
          : value,
    );
  assert.equal(
    strip(layout(oidcDocument, interaction)),
    strip(layout(oidcDocument, interaction)),
  );
});
