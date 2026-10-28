import assert from "node:assert/strict";
import test from "node:test";
import {
  collapseAllJourneys,
  createViewerInteraction,
  createViewerSnapshot,
} from "@journey-viewer/viewer";
import type { ViewerInteraction, ViewerTarget } from "@journey-viewer/viewer";
import type { UjgDocument } from "@journey-viewer/ujg-jsonld";
import {
  hierarchyFixture,
  oidcDocument,
  screensFixture,
} from "@/data/node-documents";
import { buildFlowScene, cardTarget, frameShows } from "@/model/flow-scene";
import type {
  FlowCard,
  FlowFrame,
  FlowScene,
  FlowVertex,
} from "@/model/flow-scene";
import { disclose } from "@/model/disclosure";
import type { DisclosureAction, FlowDisclosure } from "@/model/disclosure";
import { scopes } from "~/tests/scopes";

const APP = "urn:ujg:solid-oidc:app-auth-journey";
const IDP = "urn:ujg:solid-oidc:idp-auth-flow";
const MFA = "urn:ujg:solid-oidc:idp-mfa-challenge";
const SMS = "urn:ujg:solid-oidc:mfa-sms-message";
const PUSH = "urn:ujg:solid-oidc:mfa-push-approval";
const CHOICE = "urn:ujg:solid-oidc:mfa-method-choice";
const SIGN_IN = "urn:ujg:solid-oidc:app-sign-in-required";

const sceneOf = (document: UjgDocument, state: FlowDisclosure) =>
  buildFlowScene(document, state.snapshot.interaction);
/** Every frame, outermost first, as the layout lists them. */
const framesOf = (scene: FlowScene): readonly FlowFrame[] => {
  const visit = (frame: FlowFrame): readonly FlowFrame[] => [
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
/** The journey path as the study reads it: the frames showing the location. */
const pathOf = (document: UjgDocument, state: FlowDisclosure) => {
  const frames = framesOf(sceneOf(document, state));
  const shown = state.location
    ? frames.filter((frame) => frameShows(frame, state.location!))
    : [];
  return shown.length > 0 ? shown : frames.slice(0, 1);
};
const namesOf = (document: UjgDocument, state: FlowDisclosure) =>
  pathOf(document, state).map((frame) => frame.card.node["@id"]);
/** The paper frames: the active journey's and those inside it. */
const paperOf = (document: UjgDocument, state: FlowDisclosure) => {
  const active = pathOf(document, state).at(-1)!;
  return framesOf(sceneOf(document, state))
    .filter((frame) => frameShows(active, cardTarget(frame.card)))
    .map((frame) => frame.card.node["@id"]);
};

/** Applies `actions` through the reducer, as the study does. */
const run = (
  document: UjgDocument,
  state: FlowDisclosure,
  ...actions: readonly DisclosureAction[]
) =>
  actions.reduce(
    (current, action) => disclose(document, {}, current, action),
    state,
  );
const startingWith = (
  document: UjgDocument,
  interaction: ViewerInteraction,
): FlowDisclosure => ({
  snapshot: { ...createViewerSnapshot(document), interaction },
  location: null,
});
const collapsed = (document: UjgDocument) =>
  startingWith(
    document,
    collapseAllJourneys(createViewerInteraction(document)),
  );

const verticesOf = (scene: FlowScene): readonly FlowVertex[] =>
  framesOf(scene).flatMap((f) =>
    f.content.kind === "journey" ? f.content.vertices : [],
  );
/** The vertex whose node is `nodeRef`, by its first occurrence. */
const vertexOf = (scene: FlowScene, nodeRef: string): FlowVertex => {
  const vertex = verticesOf(scene).find((v) => v.node["@id"] === nodeRef);
  assert.ok(vertex, `${nodeRef} is shown`);
  return vertex;
};
const cardOf = (scene: FlowScene, nodeRef: string): FlowCard => {
  const vertex = vertexOf(scene, nodeRef);
  assert.ok(vertex.kind !== "state", `${nodeRef} is a composite`);
  return vertex.kind === "frame" ? vertex.frame.card : vertex.card;
};
const stateTarget = (vertex: FlowVertex): ViewerTarget => ({
  selection: {
    kind: "state",
    journeyRef: vertex.journey["@id"],
    nodeRef: vertex.node["@id"],
  },
  occurrence: vertex.occurrence,
});
const chevron = (card: FlowCard): DisclosureAction => ({
  type: "toggle",
  journeyRef: card.journey["@id"],
  stateRef: card.node["@id"],
  occurrence: card.occurrence,
});
const click = (card: FlowCard): DisclosureAction => ({
  type: "navigate",
  target: cardTarget(card),
});

test("until the user acts, the path is the first root", () => {
  assert.deepEqual(namesOf(oidcDocument, collapsed(oidcDocument)), [APP]);
  const open = startingWith(
    oidcDocument,
    createViewerInteraction(oidcDocument),
  );
  assert.deepEqual(namesOf(oidcDocument, open), [APP]);
});

test("a chevron marks its composite: opening enters it, closing leaves the path at its journey", () => {
  let state = collapsed(oidcDocument);
  const toggle = (nodeRef: string) =>
    (state = run(
      oidcDocument,
      state,
      chevron(cardOf(sceneOf(oidcDocument, state), nodeRef)),
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
  state = run(oidcDocument, state, {
    type: "navigate",
    target: stateTarget(signIn),
  });
  assert.equal(state.snapshot.interaction.selection?.nodeRef, SIGN_IN);
  assert.deepEqual(namesOf(oidcDocument, state), [APP]);
});

test("a link into closed journeys opens them; the path ends at the journey that shows its target", () => {
  const open = startingWith(
    oidcDocument,
    createViewerInteraction(oidcDocument),
  );
  const choice = vertexOf(sceneOf(oidcDocument, open), CHOICE);
  const state = run(oidcDocument, collapsed(oidcDocument), {
    type: "navigate",
    target: stateTarget(choice),
  });
  assert.deepEqual(namesOf(oidcDocument, state), [APP, IDP, MFA]);
});

test("the active journey and the frames inside it are paper; the frames around and beside it are not", () => {
  let state = collapsed(oidcDocument);
  for (const nodeRef of [IDP, MFA, SMS, PUSH])
    state = run(
      oidcDocument,
      state,
      click(cardOf(sceneOf(oidcDocument, state), nodeRef)),
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
  const open = startingWith(
    oidcDocument,
    createViewerInteraction(oidcDocument),
  );
  const state = {
    ...open,
    location: cardTarget(cardOf(sceneOf(oidcDocument, open), MFA)),
  };
  const path = pathOf(oidcDocument, state);
  assert.deepEqual(namesOf(oidcDocument, state), [APP, IDP, MFA]);
  const idp = path[1]!;
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
    const state = startingWith(document, createViewerInteraction(document));
    for (const frame of framesOf(sceneOf(document, state))) {
      const returned = run(document, state, { type: "return", frame });
      const path = pathOf(document, returned);
      assert.equal(
        path.at(-1)?.key,
        frame.key,
        `${document["@id"]}: ${frame.key} stays open and active`,
      );
      const inside = framesOf({ frames: [path.at(-1)!], issues: [] });
      assert.ok(
        inside.every((f) => f === inside[0] || f.card.kind === "journey"),
        `${document["@id"]}: only ${frame.key}'s own child journeys remain`,
      );
    }
  }
});
