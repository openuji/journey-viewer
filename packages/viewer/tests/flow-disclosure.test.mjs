import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  collapseAllJourneys,
  createViewerInteraction,
  createViewerSnapshot,
  expandAllJourneys,
  getNodeScreens,
  setSearchQuery,
} from "@journey-viewer/viewer";
import { buildFlowScene, frameShows } from "@/flow/scene";
import { disclose } from "@/disclosure";
import {
  hierarchyFixture,
  id,
  oidcGraph,
  scopes,
  screensFixture,
} from "~/tests/flow-scopes.mjs";

const APP = id("app-auth-journey");
const IDP = id("idp-auth-flow");
const MFA = id("idp-mfa-challenge");
const SMS = id("mfa-sms-message");
const PUSH = id("mfa-push-approval");
const CHOICE = id("mfa-method-choice");
const SIGN_IN = id("app-sign-in-required");

const sceneOf = (graph, state) =>
  buildFlowScene(graph, state.snapshot.interaction);
/** Every frame, outermost first, as the layout lists them. */
const framesOf = (scene) => {
  const visit = (frame) => [
    frame,
    ...(frame.content.kind === "row"
      ? frame.content.frames
      : frame.content.vertices.flatMap((v) =>
          v.kind === "frame" ? [v.frame] : [],
        )
    ).flatMap(visit),
  ];
  return scene.frames.flatMap(visit);
};
/** The journey path as the scenarios read it: the frames showing the location. */
const pathOf = (graph, state) => {
  const frames = framesOf(sceneOf(graph, state));
  const shown = state.location
    ? frames.filter((frame) => frameShows(frame, state.location))
    : [];
  return shown.length > 0 ? shown : frames.slice(0, 1);
};
const namesOf = (graph, state) =>
  pathOf(graph, state).map((frame) => frame.card.id);
/** The paper frames: the active journey's and those inside it. */
const paperOf = (graph, state) => {
  const active = pathOf(graph, state).at(-1);
  return framesOf(sceneOf(graph, state))
    .filter((frame) => frameShows(active, frame.card.target))
    .map((frame) => frame.card.id);
};

/** Applies `actions` through the reducer, as the scenarios do. */
const run = (graph, state, ...actions) =>
  actions.reduce(
    (current, action) => disclose(graph, {}, current, action),
    state,
  );
const startingWith = (graph, interaction) => ({
  snapshot: { ...createViewerSnapshot(graph), interaction },
  location: null,
});
const collapsed = (graph) =>
  startingWith(graph, collapseAllJourneys(createViewerInteraction(graph)));
const expanded = (graph) =>
  startingWith(graph, expandAllJourneys(graph, createViewerInteraction(graph)));

const verticesOf = (scene) =>
  framesOf(scene).flatMap((f) =>
    f.content.kind === "journey" ? f.content.vertices : [],
  );
/** The vertex of state `stateId`, by its first occurrence. */
const vertexOf = (scene, stateId) => {
  const vertex = verticesOf(scene).find((v) => v.id === stateId);
  assert.ok(vertex, `${stateId} is shown`);
  return vertex;
};
const cardOf = (scene, stateId) => {
  const vertex = vertexOf(scene, stateId);
  assert.ok(vertex.kind !== "state", `${stateId} is a composite`);
  return vertex.kind === "frame" ? vertex.frame.card : vertex.card;
};
const chevron = (card) => ({
  type: "toggle",
  journeyId: card.journeyId,
  stateId: card.id,
  occurrence: card.occurrence,
});
const click = (card) => ({ type: "navigate", target: card.target });

test("until the user acts, the path is the first root", () => {
  assert.deepEqual(namesOf(oidcGraph, collapsed(oidcGraph)), [APP]);
  const open = expanded(oidcGraph);
  assert.deepEqual(namesOf(oidcGraph, open), [APP]);
});

test("a chevron marks its composite: opening enters it, closing leaves the path at its journey", () => {
  let state = collapsed(oidcGraph);
  const toggle = (stateId) =>
    (state = run(
      oidcGraph,
      state,
      chevron(cardOf(sceneOf(oidcGraph, state), stateId)),
    ));
  toggle(IDP);
  assert.deepEqual(namesOf(oidcGraph, state), [APP, IDP]);
  toggle(MFA);
  assert.deepEqual(namesOf(oidcGraph, state), [APP, IDP, MFA]);
  toggle(MFA);
  assert.deepEqual(namesOf(oidcGraph, state), [APP, IDP], "MFA closed");
  toggle(MFA);
  state = run(oidcGraph, state, { type: "collapseAll" });
  assert.deepEqual(namesOf(oidcGraph, state), [APP], "nothing open");
  state = run(oidcGraph, state, { type: "expandAll" });
  assert.deepEqual(
    namesOf(oidcGraph, state),
    [APP, IDP, MFA],
    "the location was kept",
  );
});

test("the tree's toggle names no occurrence and leaves the location", () => {
  const state = run(
    oidcGraph,
    collapsed(oidcGraph),
    chevron(cardOf(sceneOf(oidcGraph, collapsed(oidcGraph)), IDP)),
  );
  const mfa = cardOf(sceneOf(oidcGraph, state), MFA);
  const toggled = run(oidcGraph, state, {
    type: "toggle",
    journeyId: mfa.journeyId,
    stateId: MFA,
  });
  assert.equal(toggled.location, state.location);
  assert.notDeepEqual(
    toggled.snapshot.interaction.expandedJourneys,
    state.snapshot.interaction.expandedJourneys,
  );
  assert.deepEqual(namesOf(oidcGraph, toggled), [APP, IDP]);
  assert.equal(
    run(oidcGraph, state, { type: "collapseAll" }, { type: "collapseAll" })
      .location,
    state.location,
  );
});

test("a card click marks the composite it opens, as its chevron does", () => {
  let opened = 0;
  for (const graph of [oidcGraph, screensFixture, hierarchyFixture])
    for (const [name, interaction] of scopes(graph)) {
      const state = startingWith(graph, interaction);
      for (const v of verticesOf(sceneOf(graph, state))) {
        if (v.kind !== "composite" || v.card.toggle !== "expand") continue;
        const clicked = pathOf(graph, run(graph, state, click(v.card)));
        const toggled = pathOf(graph, run(graph, state, chevron(v.card)));
        assert.deepEqual(
          clicked.map((f) => f.key),
          toggled.map((f) => f.key),
          `${name}: ${v.key}`,
        );
        assert.equal(clicked.at(-1)?.key, v.key, `${name}: ${v.key} is active`);
        opened++;
      }
    }
  assert.ok(opened > 0, "the scopes have closed composites");
});

test("a click on a state marks it: the path ends at its journey", () => {
  let state = collapsed(oidcGraph);
  state = run(oidcGraph, state, click(cardOf(sceneOf(oidcGraph, state), IDP)));
  state = run(oidcGraph, state, click(cardOf(sceneOf(oidcGraph, state), MFA)));
  assert.deepEqual(namesOf(oidcGraph, state), [APP, IDP, MFA]);
  const signIn = vertexOf(sceneOf(oidcGraph, state), SIGN_IN);
  state = run(oidcGraph, state, { type: "navigate", target: signIn.target });
  assert.equal(state.snapshot.interaction.selection?.nodeId, SIGN_IN);
  assert.deepEqual(namesOf(oidcGraph, state), [APP]);
});

test("a search result marks its target like a click and clears the query", () => {
  const open = expanded(oidcGraph);
  const choice = vertexOf(sceneOf(oidcGraph, open), CHOICE);
  const searching = {
    ...collapsed(oidcGraph),
    snapshot: setSearchQuery(collapsed(oidcGraph).snapshot, "method"),
  };
  const picked = run(oidcGraph, searching, {
    type: "pick",
    target: choice.target,
  });
  assert.equal(picked.snapshot.navigation.query, "");
  assert.equal(picked.location, choice.target);
  assert.deepEqual(namesOf(oidcGraph, picked), [APP, IDP, MFA]);
  const linked = run(oidcGraph, searching, {
    type: "navigate",
    target: choice.target,
  });
  assert.equal(linked.snapshot.navigation.query, "method");
  assert.deepEqual(namesOf(oidcGraph, linked), [APP, IDP, MFA]);
});

test("a screen marks the node its lightbox shows, and stepping moves the mark", async () => {
  const screenshots = JSON.parse(
    await readFile(
      new URL("../../../examples/solid-oidc/screenshots.json", import.meta.url),
      "utf8",
    ),
  );
  const open = expanded(oidcGraph);
  const state = verticesOf(sceneOf(oidcGraph, open)).find(
    (v) =>
      v.kind === "state" &&
      getNodeScreens(oidcGraph, screenshots, v.id).some((s) => s.source),
  );
  const [screen] = getNodeScreens(oidcGraph, screenshots, state.id);
  const opened = disclose(oidcGraph, screenshots, open, {
    type: "openScreen",
    target: state.target,
    surfaceId: screen.surface.id,
  });
  assert.ok(opened.snapshot.lightbox);
  assert.equal(opened.location, opened.snapshot.lightbox.target);
  assert.equal(opened.location.selection.nodeId, state.id);
  const stepped = disclose(oidcGraph, screenshots, opened, {
    type: "stepScreen",
    direction: 1,
  });
  assert.equal(stepped.location, stepped.snapshot.lightbox.target);
  assert.notEqual(stepped.location.selection.nodeId, state.id);
});

test("a link into closed journeys opens them; the path ends at the journey that shows its target", () => {
  const open = expanded(oidcGraph);
  const choice = vertexOf(sceneOf(oidcGraph, open), CHOICE);
  const state = run(oidcGraph, collapsed(oidcGraph), {
    type: "navigate",
    target: choice.target,
  });
  assert.deepEqual(namesOf(oidcGraph, state), [APP, IDP, MFA]);
});

test("the active journey and the frames inside it are paper; the frames around and beside it are not", () => {
  let state = collapsed(oidcGraph);
  for (const stateId of [IDP, MFA, SMS, PUSH])
    state = run(
      oidcGraph,
      state,
      click(cardOf(sceneOf(oidcGraph, state), stateId)),
    );
  assert.deepEqual(namesOf(oidcGraph, state), [APP, IDP, MFA, PUSH]);
  assert.deepEqual(paperOf(oidcGraph, state), [PUSH], "SMS is beside it");
  state = run(oidcGraph, state, click(cardOf(sceneOf(oidcGraph, state), MFA)));
  assert.deepEqual(namesOf(oidcGraph, state), [APP, IDP, MFA]);
  assert.deepEqual(
    paperOf(oidcGraph, state).sort(),
    [MFA, PUSH, SMS].sort(),
    "an open heading's click marks it too",
  );
});

test("returning to a step closes what is open inside it and marks it", () => {
  const open = expanded(oidcGraph);
  const state = {
    ...open,
    location: cardOf(sceneOf(oidcGraph, open), MFA).target,
  };
  const path = pathOf(oidcGraph, state);
  assert.deepEqual(namesOf(oidcGraph, state), [APP, IDP, MFA]);
  const idp = path[1];
  assert.ok(framesOf({ frames: [idp], issues: [] }).length > 2);
  const returned = run(oidcGraph, state, { type: "return", frame: idp });
  assert.deepEqual(namesOf(oidcGraph, returned), [APP, IDP]);
  assert.deepEqual(
    paperOf(oidcGraph, returned),
    [IDP],
    "nothing stays open inside the frame",
  );
});

test("rows and recursion keep their frames when returning to them", () => {
  for (const graph of [screensFixture, hierarchyFixture]) {
    const state = expanded(graph);
    for (const frame of framesOf(sceneOf(graph, state))) {
      const returned = run(graph, state, { type: "return", frame });
      const path = pathOf(graph, returned);
      assert.equal(
        path.at(-1)?.key,
        frame.key,
        `${graph.id}: ${frame.key} stays open and active`,
      );
      const inside = framesOf({ frames: [path.at(-1)], issues: [] });
      assert.ok(
        inside.every((f) => f === inside[0] || f.card.kind === "journey"),
        `${graph.id}: only ${frame.key}'s own child journeys remain`,
      );
    }
  }
});

test("transitions that change nothing keep the disclosure", () => {
  const state = collapsed(oidcGraph);
  assert.equal(run(oidcGraph, state, { type: "collapseAll" }), state);
});
