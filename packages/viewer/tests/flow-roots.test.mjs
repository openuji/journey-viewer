import assert from "node:assert/strict";
import test from "node:test";
import { createViewerInteraction } from "@journey-viewer/viewer";
import {
  emptyCompositesFixture,
  hierarchyFixture,
} from "~/tests/flow-scopes.mjs";
import { composeFlow } from "@/flow/compose";
import { flowLevel } from "@/flow/geometry";
import { sceneForRoots } from "@/flow/roots";
import { buildFlowScene } from "@/flow/scene";
import { estimate } from "@/flow/text";

const sceneOf = (graph) =>
  buildFlowScene(graph, createViewerInteraction(graph));
const startOf = (frame) => frame.card.occurrence.startJourneyId;
const states = (frame) =>
  frame.content.vertices.filter((vertex) => vertex.kind === "state");

test("every root is drawn by default, and the scene is the one it was given", () => {
  const scene = sceneOf(hierarchyFixture);
  assert.ok(scene.frames.length > 1);
  assert.equal(sceneForRoots(scene, "all"), scene);
  assert.equal(sceneForRoots(scene, "all", startOf(scene.frames[1])), scene);
});

test("one root at a time shows the root a location starts from, else the first", () => {
  const scene = sceneOf(hierarchyFixture);
  const [first, second] = scene.frames;
  assert.deepEqual(sceneForRoots(scene, "one").frames, [first]);
  assert.deepEqual(sceneForRoots(scene, "one", startOf(second)).frames, [
    second,
  ]);
  assert.deepEqual(sceneForRoots(scene, "one", "no such journey").frames, [
    first,
  ]);
  assert.equal(sceneForRoots(scene, "one").issues, scene.issues);
});

test("a document with one root is drawn as it is", () => {
  const scene = sceneOf(emptyCompositesFixture);
  assert.equal(scene.frames.length, 1);
  assert.equal(sceneForRoots(scene, "one"), scene);
});

test("one root lays out only that root; the others are never laid out", () => {
  const scene = sceneOf(hierarchyFixture);
  const second = scene.frames[1];
  const alone = composeFlow(
    sceneForRoots(scene, "one", startOf(second)),
    flowLevel(),
    estimate,
  );
  const all = composeFlow(sceneForRoots(scene, "all"), flowLevel(), estimate);
  assert.deepEqual(
    alone.frames.map((box) => box.frame),
    [second],
  );
  assert.equal(alone.states.length, states(second).length);
  assert.ok(alone.states.length < all.states.length);
  assert.ok(alone.height < all.height, "the canvas holds one root, not all");
});
