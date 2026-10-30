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
  oidcDocument,
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

const sceneOf = (document, state) =>
  buildFlowScene(document, state.snapshot.interaction);
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
const pathOf = (document, state) => {
  const frames = framesOf(sceneOf(document, state));
  const shown = state.location
    ? frames.filter((frame) => frameShows(frame, state.location))
    : [];
  return shown.length > 0 ? shown : frames.slice(0, 1);
};
const namesOf = (document, state) =>
  pathOf(document, state).map((frame) => frame.card.id);
/** The paper frames: the active journey's and those inside it. */
const paperOf = (document, state) => {
  const active = pathOf(document, state).at(-1);
  return framesOf(sceneOf(document, state))
    .filter((frame) => frameShows(active, frame.card.target))
    .map((frame) => frame.card.id);
};

/** Applies `actions` through the reducer, as the scenarios do. */
const run = (document, state, ...actions) =>
  actions.reduce(
    (current, action) => disclose(document, {}, current, action),
    state,
  );
const startingWith = (document, interaction) => ({
  snapshot: { ...createViewerSnapshot(document), interaction },
  location: null,
});
const collapsed = (document) =>
  startingWith(
    document,
    collapseAllJourneys(createViewerInteraction(document)),
  );
const expanded = (document) =>
  startingWith(
    document,
    expandAllJourneys(document, createViewerInteraction(document)),
  );

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
  assert.deepEqual(namesOf(oidcDocument, collapsed(oidcDocument)), [APP]);
  const open = expanded(oidcDocument);
  assert.deepEqual(namesOf(oidcDocument, open), [APP]);
});

test("a chevron marks its composite: opening enters it, closing leaves the path at its journey", () => {
  let state = collapsed(oidcDocument);
  const toggle = (stateId) =>
    (state = run(
      oidcDocument,
      state,
      chevron(cardOf(sceneOf(oidcDocument, state), stateId)),
    ));
  toggle(IDP);
  assert.deepEqual(namesOf(oidcDocument, state), [APP, IDP]);
  toggle(MFA);
  assert.deepEqual(namesOf(oidcDocument, state), [APP, IDP, MFA]);
  toggle(MFA);
  assert.deepEqual(namesOf(oidcDocument, state), [APP, IDP], "MFA closed");
  toggle(MFA);
  state = run(oidcDocument, state, { type: "collapseAll" });
  assert.deepEqual(namesOf(oidcDocument, state), [APP], "nothing open");
  state = run(oidcDocument, state, { type: "expandAll" });
  assert.deepEqual(
    namesOf(oidcDocument, state),
    [APP, IDP, MFA],
    "the location was kept",
  );
});

test("the tree's toggle names no occurrence and leaves the location", () => {
  const state = run(
    oidcDocument,
    collapsed(oidcDocument),
    chevron(cardOf(sceneOf(oidcDocument, collapsed(oidcDocument)), IDP)),
  );
  const mfa = cardOf(sceneOf(oidcDocument, state), MFA);
  const toggled = run(oidcDocument, state, {
    type: "toggle",
    journeyId: mfa.journeyId,
    stateId: MFA,
  });
  assert.equal(toggled.location, state.location);
  assert.notDeepEqual(
    toggled.snapshot.interaction.expandedJourneys,
    state.snapshot.interaction.expandedJourneys,
  );
  assert.deepEqual(namesOf(oidcDocument, toggled), [APP, IDP]);
  assert.equal(
    run(oidcDocument, state, { type: "collapseAll" }, { type: "collapseAll" })
      .location,
    state.location,
  );
});

test("a card click marks the composite it opens, as its chevron does", () => {
  let opened = 0;
  for (const document of [oidcDocument, screensFixture, hierarchyFixture])
    for (const [name, interaction] of scopes(document)) {
      const state = startingWith(document, interaction);
      for (const v of verticesOf(sceneOf(document, state))) {
        if (v.kind !== "composite" || v.card.toggle !== "expand") continue;
        const clicked = pathOf(document, run(document, state, click(v.card)));
        const toggled = pathOf(document, run(document, state, chevron(v.card)));
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
  let state = collapsed(oidcDocument);
  state = run(
    oidcDocument,
    state,
    click(cardOf(sceneOf(oidcDocument, state), IDP)),
  );
  state = run(
    oidcDocument,
    state,
    click(cardOf(sceneOf(oidcDocument, state), MFA)),
  );
  assert.deepEqual(namesOf(oidcDocument, state), [APP, IDP, MFA]);
  const signIn = vertexOf(sceneOf(oidcDocument, state), SIGN_IN);
  state = run(oidcDocument, state, { type: "navigate", target: signIn.target });
  assert.equal(state.snapshot.interaction.selection?.nodeRef, SIGN_IN);
  assert.deepEqual(namesOf(oidcDocument, state), [APP]);
});

test("a search result marks its target like a click and clears the query", () => {
  const open = expanded(oidcDocument);
  const choice = vertexOf(sceneOf(oidcDocument, open), CHOICE);
  const searching = {
    ...collapsed(oidcDocument),
    snapshot: setSearchQuery(collapsed(oidcDocument).snapshot, "method"),
  };
  const picked = run(oidcDocument, searching, {
    type: "pick",
    target: choice.target,
  });
  assert.equal(picked.snapshot.navigation.query, "");
  assert.equal(picked.location, choice.target);
  assert.deepEqual(namesOf(oidcDocument, picked), [APP, IDP, MFA]);
  const linked = run(oidcDocument, searching, {
    type: "navigate",
    target: choice.target,
  });
  assert.equal(linked.snapshot.navigation.query, "method");
  assert.deepEqual(namesOf(oidcDocument, linked), [APP, IDP, MFA]);
});

test("a screen marks the node its lightbox shows, and stepping moves the mark", async () => {
  const screenshots = JSON.parse(
    await readFile(
      new URL("../../../examples/solid-oidc/screenshots.json", import.meta.url),
      "utf8",
    ),
  );
  const open = expanded(oidcDocument);
  const state = verticesOf(sceneOf(oidcDocument, open)).find(
    (v) =>
      v.kind === "state" &&
      getNodeScreens(oidcDocument, screenshots, v.id).some((s) => s.source),
  );
  const [screen] = getNodeScreens(oidcDocument, screenshots, state.id);
  const opened = disclose(oidcDocument, screenshots, open, {
    type: "openScreen",
    target: state.target,
    surfaceId: screen.surface["@id"],
  });
  assert.ok(opened.snapshot.lightbox);
  assert.equal(opened.location, opened.snapshot.lightbox.target);
  assert.equal(opened.location.selection.nodeRef, state.id);
  const stepped = disclose(oidcDocument, screenshots, opened, {
    type: "stepScreen",
    direction: 1,
  });
  assert.equal(stepped.location, stepped.snapshot.lightbox.target);
  assert.notEqual(stepped.location.selection.nodeRef, state.id);
});

test("a link into closed journeys opens them; the path ends at the journey that shows its target", () => {
  const open = expanded(oidcDocument);
  const choice = vertexOf(sceneOf(oidcDocument, open), CHOICE);
  const state = run(oidcDocument, collapsed(oidcDocument), {
    type: "navigate",
    target: choice.target,
  });
  assert.deepEqual(namesOf(oidcDocument, state), [APP, IDP, MFA]);
});

test("the active journey and the frames inside it are paper; the frames around and beside it are not", () => {
  let state = collapsed(oidcDocument);
  for (const stateId of [IDP, MFA, SMS, PUSH])
    state = run(
      oidcDocument,
      state,
      click(cardOf(sceneOf(oidcDocument, state), stateId)),
    );
  assert.deepEqual(namesOf(oidcDocument, state), [APP, IDP, MFA, PUSH]);
  assert.deepEqual(paperOf(oidcDocument, state), [PUSH], "SMS is beside it");
  state = run(
    oidcDocument,
    state,
    click(cardOf(sceneOf(oidcDocument, state), MFA)),
  );
  assert.deepEqual(namesOf(oidcDocument, state), [APP, IDP, MFA]);
  assert.deepEqual(
    paperOf(oidcDocument, state).sort(),
    [MFA, PUSH, SMS].sort(),
    "an open heading's click marks it too",
  );
});

test("returning to a step closes what is open inside it and marks it", () => {
  const open = expanded(oidcDocument);
  const state = {
    ...open,
    location: cardOf(sceneOf(oidcDocument, open), MFA).target,
  };
  const path = pathOf(oidcDocument, state);
  assert.deepEqual(namesOf(oidcDocument, state), [APP, IDP, MFA]);
  const idp = path[1];
  assert.ok(framesOf({ frames: [idp], issues: [] }).length > 2);
  const returned = run(oidcDocument, state, { type: "return", frame: idp });
  assert.deepEqual(namesOf(oidcDocument, returned), [APP, IDP]);
  assert.deepEqual(
    paperOf(oidcDocument, returned),
    [IDP],
    "nothing stays open inside the frame",
  );
});

test("rows and recursion keep their frames when returning to them", () => {
  for (const document of [screensFixture, hierarchyFixture]) {
    const state = expanded(document);
    for (const frame of framesOf(sceneOf(document, state))) {
      const returned = run(document, state, { type: "return", frame });
      const path = pathOf(document, returned);
      assert.equal(
        path.at(-1)?.key,
        frame.key,
        `${document["@id"]}: ${frame.key} stays open and active`,
      );
      const inside = framesOf({ frames: [path.at(-1)], issues: [] });
      assert.ok(
        inside.every((f) => f === inside[0] || f.card.kind === "journey"),
        `${document["@id"]}: only ${frame.key}'s own child journeys remain`,
      );
    }
  }
});

test("transitions that change nothing keep the disclosure", () => {
  const state = collapsed(oidcDocument);
  assert.equal(run(oidcDocument, state, { type: "collapseAll" }), state);
});
