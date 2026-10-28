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
import type { Placement } from "@journey-viewer/flow-layout";
import { ownLevel } from "@/layout/own-level";
import { measureArtifacts } from "@/layout/artifacts";
import { estimate } from "@/layout/text";
import { scopes } from "~/tests/scopes";

const placements: readonly Placement[] = [
  "median",
  "aligned-center",
  "aligned-left",
];

const layout = (
  document: typeof oidcDocument,
  interaction: Parameters<typeof buildFlowScene>[1],
  placement: Placement = "median",
) =>
  composeFlow(
    buildFlowScene(document, interaction),
    ownLevel(placement),
    estimate,
  );

test("the own engine draws no diagonals, kinks, short arrivals, or lines through blocks or frame borders, in every placement", () => {
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
  ].flatMap(([name, document, interaction]) =>
    placements.map(
      (placement) =>
        [`${name} (${placement})`, document, interaction, placement] as const,
    ),
  );
  for (const [name, document, interaction, placement] of cases) {
    const report = measureArtifacts(layout(document, interaction, placement));
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

test("states and closed composites have one contact point per side, at its centre unless aligned left", () => {
  for (const placement of placements)
    for (const [name, interaction] of scopes(oidcDocument)) {
      const result = layout(oidcDocument, interaction, placement);
      // An open composite shares its key with its frame; its connectors attach to the frame's ports.
      const open = new Set(result.frames.map((f) => f.key));
      const boxes = new Map(
        [...result.states, ...result.cards]
          .filter((b) => !open.has(b.key))
          .map((b) => [b.key, b.rect] as const),
      );
      const contacts = new Map<string, number>();
      for (const connector of result.connectors)
        for (const [key, point] of [
          [connector.from, connector.points[0]!],
          [connector.to, connector.points[connector.points.length - 1]!],
        ] as const) {
          const rect = boxes.get(key);
          if (!rect) continue;
          const where = `${name} (${placement}): ${connector.key} at ${key}`;
          const top = Math.abs(point.y - rect.y) <= 0.5;
          assert.ok(
            top || Math.abs(point.y - (rect.y + rect.height)) <= 0.5,
            `${where} is on the top or bottom border`,
          );
          const side = `${key}|${top ? "top" : "bottom"}`;
          assert.ok(
            Math.abs(point.x - (contacts.get(side) ?? point.x)) <= 0.5,
            `${where} shares its side's contact point`,
          );
          contacts.set(side, point.x);
          assert.ok(
            placement === "aligned-left"
              ? point.x > rect.x && point.x < rect.x + rect.width
              : Math.abs(point.x - (rect.x + rect.width / 2)) <= 0.5,
            `${where} is ${placement === "aligned-left" ? "inside the block" : "at the centre"}`,
          );
        }
    }
});

test("aligned placements stack the main path in one column; aligned left shares its left edge", () => {
  const [, interaction] = scopes(oidcDocument).find(
    ([name]) => name === "idp-auth-flow open",
  )!;
  // Select account, Login, MFA challenge, MFA completed, Identity consent, Resource consent.
  const path = [
    "idp-account-selection",
    "idp-login",
    "idp-mfa-challenge",
    "idp-after-mfa",
    "idp-identity-consent-flow",
    "idp-resource-consent-flow",
  ].map((id) => `urn:ujg:solid-oidc:${id}`);
  for (const placement of ["aligned-center", "aligned-left"] as const) {
    const result = layout(oidcDocument, interaction, placement);
    const rects = path.map(
      (id) =>
        [
          ...result.states.map((s) => [s.vertex.node["@id"], s.rect] as const),
          ...result.cards
            .filter((c) => !c.heads)
            .map((c) => [c.card.node["@id"], c.rect] as const),
        ].find(([node]) => node === id)![1],
    );
    const edge = (rect: (typeof rects)[number]) =>
      placement === "aligned-left" ? rect.x : rect.x + rect.width / 2;
    for (const [i, rect] of rects.entries())
      assert.ok(
        Math.abs(edge(rect) - edge(rects[0]!)) <= 0.5,
        `${placement}: ${path[i]} at ${edge(rect)}, ${path[0]} at ${edge(rects[0]!)}`,
      );
  }
});

test("an open composite's card is its frame's top-left corner; contracts sit on the borders", () => {
  for (const placement of placements)
    for (const [name, interaction] of scopes(oidcDocument)) {
      const result = layout(oidcDocument, interaction, placement);
      for (const frame of result.frames) {
        const card = result.cards.find(
          (c) => c.key === frame.frame.card.key && c.heads,
        )!;
        assert.equal(
          card.rect.x,
          frame.rect.x,
          `${name} (${placement}): ${frame.key}`,
        );
        assert.equal(
          card.rect.y,
          frame.rect.y,
          `${name} (${placement}): ${frame.key}`,
        );
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
  for (const placement of placements)
    assert.equal(
      strip(layout(oidcDocument, interaction, placement)),
      strip(layout(oidcDocument, interaction, placement)),
    );
});
