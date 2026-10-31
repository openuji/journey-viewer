import assert from "node:assert/strict";
import test from "node:test";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  JourneyInspector,
  JourneyViewer,
  createViewerInteraction,
  expandAllJourneys,
  getNavigationItems,
} from "@journey-viewer/viewer";
import { buildFlowScene } from "@/flow/scene";
import { freeze } from "~/tests/graphs.mjs";

// Written by hand, as any reader of another format could produce it: no UJG document anywhere.
const named = (kind, id, label) => ({ kind, id, label, tags: [] });
const detail = named("state", "app:detail", "Detail");
const childEntry = {
  ...named("entry", "app:child-entry", "Open detail"),
  target: detail.id,
};
const child = {
  ...named("journey", "app:child", "Details"),
  entries: [childEntry],
  defaultEntry: childEntry.id,
  states: [detail],
  exits: [],
  transitions: [],
};
const entry = { ...named("entry", "app:entry", "Start"), target: "app:form" };
const form = named("state", "app:form", "Form");
const review = {
  ...named("composite", "app:review", "Review"),
  children: [child],
};
const done = named("exit", "app:done", "Done");
const submit = {
  ...named("transition", "app:submit", "Submit"),
  from: form.id,
  to: review.id,
};
const finish = {
  ...named("transition", "app:finish", "Finish"),
  from: review.id,
  to: done.id,
};
const checkout = {
  ...named("journey", "app:checkout", "Checkout"),
  entries: [entry],
  defaultEntry: entry.id,
  states: [form, review],
  exits: [done],
  transitions: [submit, finish],
};
const graph = freeze({
  id: "app",
  label: "Hand-written",
  journeys: [checkout, child],
  roots: [checkout],
  rootless: [],
  states: [form, review, detail],
  entries: [entry, childEntry],
  exits: [done],
  transitions: [submit, finish],
  touchpoints: [
    {
      kind: "touchpoint",
      id: "app:web",
      label: "Web",
      journeys: [checkout.id],
    },
  ],
  surfaces: [{ kind: "surface", id: "app:form-screen", node: form.id }],
});
const atForm = {
  selection: { kind: "state", journeyId: checkout.id, nodeId: form.id },
  occurrence: { startJourneyId: checkout.id, steps: [] },
};

test("the viewer renders a hand-written graph without any UJG document", () => {
  const html = renderToStaticMarkup(
    h(JourneyViewer, {
      graph,
      screenshots: { "app:form-screen": "./form.png" },
    }),
  );
  assert.match(html, />Hand-written</);
  assert.match(html, /2 journeys · 3 states · 2 transitions · 1 screens/);
  assert.match(html, /data-journey-ref="app:checkout"/);
  assert.match(html, /data-state-ref="app:form"/);
  assert.match(html, /Web/);
  // The default entry selects the state it names.
  assert.deepEqual(createViewerInteraction(graph).selection, atForm.selection);
});

test("all three views apply the same entry rule to a hand-written graph", () => {
  // Navigation follows the transition, and only explicit child mappings beyond it.
  assert.deepEqual(
    getNavigationItems(graph, atForm.selection, atForm.occurrence).map(
      (item) => item.label,
    ),
    ["Outgoing · Submit: Review"],
  );
  // The inspector names the child's default entry the transition starts at.
  assert.match(
    renderToStaticMarkup(
      h(JourneyInspector, { graph, selection: atForm.selection }),
    ),
    /enters at Open detail \(default\)/,
  );
  // The flow draws the arrival at the only open child's default entry.
  const scene = buildFlowScene(
    graph,
    expandAllJourneys(graph, createViewerInteraction(graph)),
  );
  assert.deepEqual(scene.issues, []);
  const content = scene.frames[0].content;
  const arrival = content.bundles.find((bundle) =>
    [...bundle.forward, ...bundle.backward].some((t) => t.id === submit.id),
  );
  assert.deepEqual(
    [arrival.b.port, arrival.forward[0].viaDefault],
    [`entry:${childEntry.id}`, true],
  );
});
