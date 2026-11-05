import assert from "node:assert/strict";
import test from "node:test";
import {
  collapseAllJourneys,
  createViewerInteraction,
  toggleChildJourneys,
} from "@journey-viewer/viewer";
import { id, oidcGraph } from "~/tests/flow-scopes.mjs";
import { composeFlow } from "@/flow/compose";
import { flowLevel } from "@/flow/geometry";
import { insetShapes } from "@/flow/inset";
import { buildFlowScene } from "@/flow/scene";
import { estimate } from "@/flow/text";

const APP = id("app-auth-journey");
const IDP = id("idp-auth-flow");

/** The app journey with the identity provider's flow open inside it. */
const layout = composeFlow(
  buildFlowScene(
    oidcGraph,
    toggleChildJourneys(
      oidcGraph,
      collapseAllJourneys(createViewerInteraction(oidcGraph)),
      APP,
      IDP,
    ),
  ),
  flowLevel(),
  estimate,
);

test("the inset draws every frame and every pickable block, but not the heading of an open frame", () => {
  const shapes = insetShapes(layout, {
    selected: new Set(),
    current: new Set(),
    receded: () => false,
  });
  const heads = layout.cards.filter((card) => card.heads);
  assert.ok(heads.length > 0, "the scene has an open composite");
  assert.deepEqual(
    shapes.frames.map((frame) => frame.id),
    layout.frames.map((frame) => `frame:${frame.key}`),
  );
  assert.equal(
    shapes.blocks.length,
    layout.cards.length -
      heads.length +
      layout.states.length +
      layout.contracts.length,
  );
  for (const card of heads)
    assert.ok(!shapes.blocks.some((block) => block.id === `card:${card.key}`));
  assert.ok(
    shapes.blocks.every((block) => !block.selected && !block.receded),
    "no marks unless asked",
  );
  assert.ok(shapes.frames.every((frame) => frame.context === "outside"));
  const dots = shapes.blocks.filter((block) => block.dot);
  assert.deepEqual(
    dots.map((dot) => dot.id),
    layout.contracts.map((contract) => `contract:${contract.key}`),
    "contracts, and only contracts, are dots",
  );
  assert.deepEqual(dots[0].rect, {
    ...layout.contracts[0].glyph,
    width: 0,
    height: 0,
  });
});

test("selection, the current frames and the touchpoint filter mark the inset as they mark the canvas", () => {
  const [state] = layout.states;
  const [outer, inner] = layout.frames;
  const shapes = insetShapes(layout, {
    selected: new Set([state.key]),
    current: new Set([inner.key]),
    receded: (journeyId) => journeyId === state.vertex.journeyId,
  });
  assert.deepEqual(
    shapes.blocks.filter((block) => block.selected).map((block) => block.id),
    [`state:${state.key}`],
  );
  assert.deepEqual(
    shapes.frames.map((frame) => frame.context),
    layout.frames.map((frame) =>
      frame.key === inner.key ? "current" : "outside",
    ),
  );
  assert.notEqual(outer.key, inner.key);
  const receded = shapes.blocks.filter((block) => block.receded);
  assert.ok(receded.some((block) => block.id === `state:${state.key}`));
  assert.ok(receded.length < shapes.blocks.length);
});
