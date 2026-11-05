import assert from "node:assert/strict";
import test from "node:test";
import { countCrossings, positionsOf, swapGain } from "@/crossings";

// A small seeded generator, so a failing case reproduces.
const generator = (seed) => () =>
  (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;

const count = (byLayer, order) => countCrossings(byLayer, positionsOf(order));

/** Links written as two-letter pairs, upper then lower: one layer pair. */
const between = (...pairs) => pairs.map(([upper, lower]) => [upper, lower]);

test("crossing pairs are counted between consecutive layers only", () => {
  const order = [
    ["a", "b"],
    ["x", "y"],
  ];
  assert.equal(count([between("ay", "bx")], order), 1);
  assert.equal(count([between("ax", "by")], order), 0);
  // Links that share a vertex never cross.
  assert.equal(count([between("ax", "ay")], order), 0);
  assert.equal(count([between("ax", "bx")], order), 0);
  // Layers do not mix: the same crossing on two layer pairs counts twice.
  const three = [
    ["a", "b"],
    ["c", "d"],
    ["e", "f"],
  ];
  const crossed = [between("ad", "bc"), between("cf", "de")];
  assert.equal(count(crossed, three), 2);
});

test("the gain of a swap is what a full recount would change", () => {
  for (let seed = 1; seed <= 300; seed++) {
    const random = generator(seed);
    const layerCount = 2 + Math.floor(random() * 4);
    const order = Array.from({ length: layerCount }, (_, layer) =>
      Array.from(
        { length: 1 + Math.floor(random() * 6) },
        (_, i) => `${layer}.${i}`,
      ).sort(() => random() - 0.5),
    );
    // Links between consecutive layers; a repeated link counts as two.
    const byLayer = order.slice(1).map((lower, k) =>
      order[k].flatMap((upper) =>
        lower.flatMap((id) => {
          const links = Math.floor(random() * 2.4);
          return Array.from({ length: links }, () => [upper, id]);
        }),
      ),
    );
    const above = new Map();
    const below = new Map();
    for (const links of byLayer)
      for (const [upper, lower] of links) {
        above.set(lower, [...(above.get(lower) ?? []), upper]);
        below.set(upper, [...(below.get(upper) ?? []), lower]);
      }
    const before = count(byLayer, order);
    for (const [layer, ids] of order.entries())
      for (let i = 0; i < ids.length - 1; i++) {
        const swapped = order.map((row) => [...row]);
        [swapped[layer][i], swapped[layer][i + 1]] = [ids[i + 1], ids[i]];
        assert.equal(
          swapGain(ids[i], ids[i + 1], { above, below }, positionsOf(order)),
          count(byLayer, swapped) - before,
          `seed ${seed}, layer ${layer}, position ${i}`,
        );
      }
  }
});
