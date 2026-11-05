import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { layoutLevel, minimumLengths } from "@journey-viewer/flow-layout";
import { checkLevel } from "~/tests/artifacts.mjs";

const freeze = (value) => {
  if (value !== null && typeof value === "object") {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
};

// Every distinct level the Solid-OIDC disclosure scopes and the flow spike's fixtures produce.
const { levels } = freeze(
  JSON.parse(
    await readFile(new URL("fixtures/levels.json", import.meta.url), "utf8"),
  ),
);
const placements = ["median", "aligned-center", "aligned-left"];
/** Corner radius / arrow length: the defaults, smaller and larger. */
const sizes = [
  [6, 7],
  [2, 3],
  [3, 4],
  [6, 14],
  [10, 7],
  [12, 12],
  [16, 10],
  [20, 8],
];
const cases = sizes.flatMap(([cornerRadius, arrowLength]) =>
  placements.map((placement) => ({ cornerRadius, arrowLength, placement })),
);
const kindOf = (node) => node.kind ?? "block";
const near = (a, b) => Math.abs(a - b) <= 0.5;

test("defaults and the lengths they guarantee", () => {
  assert.deepEqual(minimumLengths(), { arrival: 19, step: 18 });
  assert.deepEqual(minimumLengths({ cornerRadius: 12, arrowLength: 12 }), {
    arrival: 36,
    step: 36,
  });
  const { input } = levels[1];
  assert.deepEqual(
    layoutLevel(input),
    layoutLevel(input, {
      placement: "median",
      cornerRadius: 6,
      arrowLength: 7,
      padding: 16,
      blockSpacing: 28,
      lineSpacing: 16,
      frameLineSpacing: 44,
      frameTrackSpacing: 22,
    }),
  );
});

test("no diagonals, kinks, short arrivals, lines through nodes or along frames, for every size and placement", () => {
  assert.ok(levels.length > 50, `${levels.length} levels`);
  for (const options of cases) {
    const lengths = minimumLengths(options);
    for (const { name, input } of levels) {
      const report = checkLevel(input, layoutLevel(input, options), lengths);
      const { examples, ...counts } = report;
      assert.deepEqual(
        counts,
        {
          diagonals: 0,
          kinks: 0,
          shortArrivals: 0,
          throughBoxes: 0,
          alongFrames: 0,
        },
        `${name} (${JSON.stringify(options)}): ${examples.join("; ")}`,
      );
    }
  }
});

test("the header sits at the corner, entries on the top border and exits on the bottom border", () => {
  for (const options of cases)
    for (const { name, input } of levels) {
      const layout = layoutLevel(input, options);
      for (const node of input.nodes) {
        const at = layout.positions.get(node.id);
        const where = `${name} (${options.placement}): ${node.id}`;
        if (kindOf(node) === "header") assert.deepEqual(at, { x: 0, y: 0 });
        if (kindOf(node) === "entry") assert.equal(at.y, 0, where);
        if (kindOf(node) === "exit")
          assert.equal(at.y + node.height, layout.height, where);
        assert.ok(at.x >= 0 && at.x + node.width <= layout.width, where);
      }
    }
});

test("a block has one contact point per side, at its centre unless aligned left", () => {
  for (const options of cases)
    for (const { name, input } of levels) {
      const layout = layoutLevel(input, options);
      const nodes = new Map(input.nodes.map((node) => [node.id, node]));
      const contacts = new Map();
      for (const edge of input.edges) {
        const route = layout.routes.get(edge.id);
        for (const [id, point] of [
          [edge.source, route[0]],
          [edge.target, route[route.length - 1]],
        ]) {
          const node = nodes.get(id);
          if (kindOf(node) !== "block" || edge.source === edge.target) continue;
          const at = layout.positions.get(id);
          const where = `${name} (${options.placement}): ${edge.id} at ${id}`;
          const top = near(point.y, at.y);
          assert.ok(top || near(point.y, at.y + node.height), where);
          const side = `${id}|${top}`;
          assert.ok(near(point.x, contacts.get(side) ?? point.x), where);
          contacts.set(side, point.x);
          assert.ok(
            options.placement === "aligned-left"
              ? point.x > at.x && point.x < at.x + node.width
              : near(point.x, at.x + node.width / 2),
            where,
          );
        }
      }
    }
});

test("lines meet a frame at its ports, stopping at the port's inset", () => {
  let checked = 0;
  for (const options of cases)
    for (const { name, input } of levels) {
      const layout = layoutLevel(input, options);
      const nodes = new Map(input.nodes.map((node) => [node.id, node]));
      for (const edge of input.edges)
        for (const [id, portId, point] of [
          [edge.source, edge.sourcePort, layout.routes.get(edge.id)[0]],
          [edge.target, edge.targetPort, layout.routes.get(edge.id).at(-1)],
        ]) {
          const node = nodes.get(id);
          if (kindOf(node) !== "frame") continue;
          const port = node.ports.find((p) => p.id === portId);
          const at = layout.positions.get(id);
          const inset = port.inset ?? 0;
          const where = `${name} (${options.placement}): ${edge.id}`;
          assert.ok(near(point.x, at.x + port.x), where);
          assert.ok(
            near(
              point.y,
              port.side === "top" ? at.y - inset : at.y + node.height + inset,
            ),
            where,
          );
          checked++;
        }
    }
  assert.ok(checked > 1000, `${checked} frame ends`);
});

test("replacing a frame with a block of the same id keeps every layer's order", () => {
  let swapped = 0;
  for (const { name, input } of levels) {
    if (!input.nodes.some((node) => kindOf(node) === "frame")) continue;
    const closed = {
      nodes: input.nodes.map(({ ports, ...node }) =>
        kindOf(node) === "frame"
          ? { ...node, kind: "block", width: 168, height: 55 }
          : node,
      ),
      edges: input.edges.map(({ sourcePort, targetPort, ...edge }) => edge),
    };
    for (const placement of placements)
      assert.deepEqual(
        layoutLevel(input, { placement }).layers,
        layoutLevel(closed, { placement }).layers,
        `${name} (${placement})`,
      );
    swapped++;
  }
  assert.ok(swapped > 10, `${swapped} levels with frames`);
});

test("a chain of blocks is one straight line, and edge directions default to forward", () => {
  const block = (id) => ({ id, width: 100, height: 30 });
  const layout = layoutLevel({
    nodes: [
      { id: "title", kind: "header", width: 120, height: 40 },
      block("a"),
      block("b"),
      block("c"),
    ],
    edges: [
      { id: "ab", source: "a", target: "b" },
      { id: "cb", source: "c", target: "b", forward: false, backward: true },
    ],
  });
  assert.deepEqual(layout.layers, [["title"], ["a"], ["b"], ["c"]]);
  const xs = [...layout.routes.values()].flat().map((point) => point.x);
  assert.equal(new Set(xs).size, 1);
  assert.deepEqual(
    layout.routes.get("cb").map((point) => point.y),
    [layout.positions.get("c").y, layout.positions.get("b").y + 30],
  );
});

test("a self-loop keeps full arrivals and a full step, beside its block, clear of its neighbour", () => {
  for (const [cornerRadius, arrowLength] of sizes) {
    const options = { cornerRadius, arrowLength };
    const { arrival, step } = minimumLengths(options);
    const input = {
      nodes: [
        { id: "title", kind: "header", width: 120, height: 40 },
        { id: "start", width: 100, height: 30 },
        { id: "tall", width: 100, height: 80 },
        { id: "short", width: 100, height: 20 },
      ],
      edges: [
        { id: "to-tall", source: "start", target: "tall" },
        { id: "to-short", source: "start", target: "short" },
        { id: "loop", source: "tall", target: "tall", backward: true },
      ],
    };
    const layout = layoutLevel(input, options);
    const route = layout.routes.get("loop");
    const tall = layout.positions.get("tall");
    const short = layout.positions.get("short");
    const legs = route
      .slice(1)
      .map((point, i) =>
        Math.hypot(point.x - route[i].x, point.y - route[i].y),
      );
    const where = JSON.stringify(options);
    assert.ok(legs[0] >= arrival && legs[2] >= arrival, where);
    assert.ok(legs[1] >= step - 0.01, where);
    assert.ok(
      route.every(
        (point) => near(point.x, tall.x + 100) || point.x > tall.x + 100,
      ),
      where,
    );
    assert.ok(tall.x < short.x, `${where}: model order`);
    assert.ok(
      tall.x + 100 + arrival < short.x,
      `${where}: loop clear of its neighbour`,
    );
    assert.ok(layout.width >= Math.max(...route.map((p) => p.x)), where);
  }
});

test("layout is deterministic and leaves its input untouched", () => {
  const { input } = levels.at(-12);
  for (const options of cases) {
    const first = layoutLevel(input, options);
    const second = layoutLevel(input, options);
    assert.deepEqual(first, second);
  }
});

test("a dense level, where almost every block links to a score of others, still lays out", () => {
  // 56 blocks in one long chain, each also linked to 18 others: about a thousand connections, so
  // nearly all of them skip layers and the ordering has some 15,000 dummy vertices to keep track of.
  const count = 56;
  const nodes = [
    { id: "header", kind: "header", width: 168, height: 55 },
    ...Array.from({ length: count }, (_, i) => ({
      id: `block-${i}`,
      kind: "block",
      width: 160,
      height: 33,
    })),
  ];
  const pairs = new Set(
    Array.from({ length: count - 1 }, (_, i) => `${i}>${i + 1}`),
  );
  for (let i = 0; i < count; i++)
    for (let k = 1; k <= 18; k++) {
      const j = (i * 7 + k * 11) % count;
      if (j !== i) pairs.add(`${i}>${j}`);
    }
  const input = {
    nodes,
    edges: [...pairs].map((pair) => {
      const [from, to] = pair.split(">");
      return { id: pair, source: `block-${from}`, target: `block-${to}` };
    }),
  };
  const started = performance.now();
  const layout = layoutLevel(input);
  // The ordering used to take minutes here; a generous bound keeps this from flaking on slow runners.
  assert.ok(performance.now() - started < 30_000, "lays out in seconds");
  assert.equal(layout.positions.size, nodes.length);
  const report = checkLevel(input, layout, minimumLengths());
  const { examples, ...counts } = report;
  assert.deepEqual(
    counts,
    {
      diagonals: 0,
      kinks: 0,
      shortArrivals: 0,
      throughBoxes: 0,
      alongFrames: 0,
    },
    examples.join("; "),
  );
});
