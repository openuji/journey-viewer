import assert from "node:assert/strict";
import test from "node:test";
import {
  collapseAllJourneys,
  createViewerInteraction,
  toggleChildJourneys,
} from "@journey-viewer/viewer";
import { id, oidcDocument, scopes } from "~/tests/flow-scopes.mjs";
import { composeFlow } from "@/flow/compose";
import {
  flowGeometry,
  halfOffset,
  parallel,
} from "@journey-viewer/design-system";
import { flowLevel } from "@/flow/geometry";
import { activeStrokes } from "@/flow/strokes";
import { estimate } from "@/flow/text";
import { buildFlowScene } from "@/flow/scene";
import { flowHighlight } from "@/flow/highlight";
const closed = collapseAllJourneys(createViewerInteraction(oidcDocument));
const idpOpen = toggleChildJourneys(
  oidcDocument,
  closed,
  id("app-auth-journey"),
  id("idp-auth-flow"),
);
const layout = (interaction) =>
  composeFlow(buildFlowScene(oidcDocument, interaction), flowLevel(), estimate);
test("an arrival and a return on one line split it, each with half an arrowhead", () => {
  const result = layout(closed);
  const ink = activeStrokes(
    result.connectors,
    flowHighlight(result, {
      kind: "state",
      journeyRef: id("app-auth-journey"),
      nodeRef: id("app-access-denied"),
    }).routes,
  );
  const shared = ink.strokes.filter((s) => s.half);
  assert.deepEqual(
    [...new Set(shared.map((s) => s.tone))].sort(),
    ["incoming", "outgoing"],
    "Access denied ↔ IdP: both halves",
  );
  const halves = ink.tips.filter((t) => t.half);
  assert.equal(halves.length, 2);
  const [a, b] = halves;
  assert.notEqual(a.tone, b.tone);
  // Travelling opposite ways on one line, both keep to their right: opposite halves, no crossing.
  assert.equal(Math.sign(a.to.y - a.from.y), -Math.sign(b.to.y - b.from.y));
  assert.equal(a.half, b.half);
  assert.ok(
    ink.tips.filter((t) => !t.half).every((t) => t.tone === "outgoing"),
    "the departure to Account recovery shares nothing: a full arrowhead",
  );
  assert.ok(
    ink.strokes.some((s) => !s.half && s.tone === "outgoing"),
    "and a full-width stroke",
  );
});
test("a lone departure is centred on its exit glyph", () => {
  const result = layout(idpOpen);
  const exit = result.contracts.find(
    (c) =>
      c.contract.kind === "exit" && c.contract.id === id("idp-auth-denied"),
  );
  const ink = activeStrokes(
    result.connectors,
    flowHighlight(result, {
      kind: "exit",
      journeyRef: id("idp-auth-journey"),
      nodeRef: id("idp-auth-denied"),
    }).routes,
  );
  const departing = ink.strokes.filter(
    (s) =>
      s.tone === "outgoing" &&
      Math.abs(s.points[0].y - exit.glyph.y) < 12 &&
      Math.abs(s.points[0].x - exit.glyph.x) < 12,
  );
  assert.ok(departing.length > 0, "the parent continues from the exit");
  for (const stroke of departing) {
    assert.equal(stroke.half, undefined);
    assert.ok(Math.abs(stroke.points[0].x - exit.glyph.x) <= 0.5);
  }
});
test("routes that meet at one point from one direction share one arrowhead", () => {
  const line = (key, x) => ({
    key,
    kind: "bundle",
    points: [
      { x, y: 0 },
      { x, y: 40 },
      { x: 50, y: 40 },
      { x: 50, y: 80 },
    ],
    from: `${key}:from`,
    to: "target",
    arrowStart: false,
    arrowEnd: true,
  });
  const arrives = { incoming: ["end"], outgoing: [] };
  const ink = activeStrokes(
    [line("left", 10), line("right", 90)],
    new Map([
      ["left", arrives],
      ["right", arrives],
    ]),
  );
  assert.equal(ink.tips.length, 1);
  assert.deepEqual(ink.tips[0].to, { x: 50, y: 80 });
  assert.equal(ink.tips[0].half, undefined);
  assert.ok(ink.strokes.every((s) => !s.half));
});
/** Every block a reader can point at, as the selection that activates it. */
const activations = (result) => [
  ...result.states.map((s) => [
    s.key,
    {
      kind: "state",
      journeyRef: s.vertex.journeyId,
      nodeRef: s.vertex.id,
    },
  ]),
  ...result.cards.map((c) => [
    c.key,
    {
      kind: "state",
      journeyRef: c.card.journeyId,
      nodeRef: c.card.id,
    },
  ]),
  ...result.contracts.map((c) => [
    c.key,
    {
      kind: c.contract.kind,
      journeyRef: c.contract.journeyId,
      nodeRef: c.contract.id,
    },
  ]),
];
const drawn = (stroke) => ({
  stroke,
  centre: stroke.points,
  ink: parallel(
    stroke.points,
    stroke.half === "right"
      ? halfOffset
      : stroke.half === "left"
        ? -halfOffset
        : 0,
  ),
});
const segments = (points) => points.slice(1).map((b, i) => [points[i], b]);
const vertical = ([a, b]) => Math.abs(a.x - b.x) < 0.01;
const within = (v, p, q, margin) =>
  v > Math.min(p, q) + margin && v < Math.max(p, q) - margin;
/** Where a vertical and a horizontal segment cross inside both, if they do. */
const crossing = (s, t, margin) => {
  if (vertical(s) === vertical(t)) return undefined;
  const [v, h] = vertical(s) ? [s, t] : [t, s];
  return within(v[0].x, h[0].x, h[1].x, margin) &&
    within(h[0].y, v[0].y, v[1].y, margin)
    ? { x: v[0].x, y: h[0].y }
    : undefined;
};
/** Distance from a point to an axis-aligned polyline. */
const distanceTo = (p, points) =>
  Math.min(
    ...segments(points).map(([a, b]) => {
      const x = Math.max(Math.min(a.x, b.x), Math.min(p.x, Math.max(a.x, b.x)));
      const y = Math.max(Math.min(a.y, b.y), Math.min(p.y, Math.max(a.y, b.y)));
      return Math.hypot(p.x - x, p.y - y);
    }),
  );
test("arrivals and departures never share a half or cross along a line, and no line runs under its arrowhead", () => {
  let activated = 0;
  let halves = 0;
  let junctionCrossings = 0;
  for (const [name, interaction] of scopes(oidcDocument)) {
    const result = layout(interaction);
    for (const [key, selection] of activations(result)) {
      activated++;
      const ink = activeStrokes(
        result.connectors,
        flowHighlight(result, selection).routes,
      );
      const where = `${name}, ${key}`;
      const incoming = ink.strokes
        .filter((s) => s.tone === "incoming")
        .map(drawn);
      const outgoing = ink.strokes
        .filter((s) => s.tone === "outgoing")
        .map(drawn);
      halves += ink.strokes.filter((s) => s.half).length;
      for (const a of incoming)
        for (const b of outgoing)
          segments(a.ink).forEach((s, i) =>
            segments(b.ink).forEach((t, j) => {
              const centreA = segments(a.centre)[i];
              const centreB = segments(b.centre)[j];
              // On one centre line, the two tones must be opposite halves.
              if (
                vertical(centreA) === vertical(centreB) &&
                (vertical(centreA)
                  ? Math.abs(centreA[0].x - centreB[0].x) < 0.5
                  : Math.abs(centreA[0].y - centreB[0].y) < 0.5)
              ) {
                const [lo, hi] = vertical(centreA)
                  ? [
                      Math.max(
                        Math.min(centreA[0].y, centreA[1].y),
                        Math.min(centreB[0].y, centreB[1].y),
                      ),
                      Math.min(
                        Math.max(centreA[0].y, centreA[1].y),
                        Math.max(centreB[0].y, centreB[1].y),
                      ),
                    ]
                  : [
                      Math.max(
                        Math.min(centreA[0].x, centreA[1].x),
                        Math.min(centreB[0].x, centreB[1].x),
                      ),
                      Math.min(
                        Math.max(centreA[0].x, centreA[1].x),
                        Math.max(centreB[0].x, centreB[1].x),
                      ),
                    ];
                if (hi - lo <= 1) return;
                // A full-width line keeping its corner runs a little under the halves drawn on top.
                if (
                  (!a.stroke.half || !b.stroke.half) &&
                  hi - lo <= 2 * flowGeometry.cornerRadius + 0.5
                )
                  return;
                const sideA = vertical(s)
                  ? s[0].x - centreA[0].x
                  : s[0].y - centreA[0].y;
                const sideB = vertical(t)
                  ? t[0].x - centreB[0].x
                  : t[0].y - centreB[0].y;
                assert.ok(
                  a.stroke.half && b.stroke.half && sideA * sideB < 0,
                  `${where}: arrival and departure overlap on one half at ${JSON.stringify(s)}`,
                );
                return;
              }
              // Elsewhere their ink crosses only where the network's own lines cross, or at a junction
              // where a third route joins or parts (two halves cannot always pass there).
              const point = crossing(s, t, 0.05);
              if (!point || crossing(centreA, centreB, 1)) return;
              junctionCrossings++;
              assert.ok(
                [...incoming, ...outgoing].some(
                  (d) =>
                    d !== a && d !== b && distanceTo(point, d.centre) <= 1.5,
                ),
                `${where}: arrival and departure cross along a line at ${JSON.stringify(point)}`,
              );
            }),
          );
      for (const tip of ink.tips)
        for (const line of [...incoming, ...outgoing].filter(
          (d) => d.stroke.tone === tip.tone,
        ))
          assert.ok(
            distanceTo(tip.to, line.ink) >= flowGeometry.arrowLength - 1,
            `${where}: a ${tip.tone} line runs under its arrowhead at ${JSON.stringify(tip.to)}`,
          );
    }
  }
  assert.ok(activated > 500 && halves > 0, `${activated} activations`);
  // A brute-force search over every choice of halves finds no fewer (checked 2026-10-27).
  assert.ok(junctionCrossings <= 32, `${junctionCrossings} junction crossings`);
});
test("a two-way line keeps its halves apart through every corner", () => {
  // Access denied ↔ IdP in the collapsed App turns twice; the halves used to swap sides at each.
  const result = layout(closed);
  const ink = activeStrokes(
    result.connectors,
    flowHighlight(result, {
      kind: "state",
      journeyRef: id("app-auth-journey"),
      nodeRef: id("app-access-denied"),
    }).routes,
  );
  const [incoming, outgoing] = ["incoming", "outgoing"].map((tone) =>
    ink.strokes
      .filter((s) => s.tone === tone && s.half)
      .flatMap((s) => segments(drawn(s).ink)),
  );
  assert.ok(incoming.length > 2 && outgoing.length > 2);
  for (const s of incoming)
    for (const t of outgoing)
      assert.equal(crossing(s, t, 0.05), undefined, JSON.stringify([s, t]));
});
