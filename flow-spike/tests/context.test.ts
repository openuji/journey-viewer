import assert from "node:assert/strict";
import test from "node:test";
import {
  collapseAllJourneys,
  createViewerInteraction,
} from "@journey-viewer/viewer";
import type { ViewerInteraction } from "@journey-viewer/viewer";
import {
  hierarchyFixture,
  oidcDocument,
  screensFixture,
} from "@/data/node-documents";
import { buildFlowScene } from "@/model/flow-scene";
import type { FlowScene } from "@/model/flow-scene";
import {
  collapseWithin,
  contextPath,
  framesWithin,
  lineageOf,
} from "@/model/context";
import { scopes } from "~/tests/scopes";

const APP = "urn:ujg:solid-oidc:app-auth-journey";
const IDP = "urn:ujg:solid-oidc:idp-auth-flow";
const MFA = "urn:ujg:solid-oidc:idp-mfa-challenge";

/** The composite (open or closed) whose node is `nodeRef`, by its first occurrence. */
const keyOf = (scene: FlowScene, nodeRef: string): string => {
  const keys: string[] = [];
  for (const root of scene.frames)
    for (const frame of framesWithin(root))
      if (frame.content.kind === "journey")
        for (const v of frame.content.vertices)
          if (v.node["@id"] === nodeRef) keys.push(v.key);
  assert.ok(keys.length > 0, `${nodeRef} is shown`);
  return keys[0]!;
};

const scopeOf = (name: string): ViewerInteraction =>
  scopes(oidcDocument).find(([n]) => n === name)![1];

test("the root journey is active until a composite is opened", () => {
  const scene = buildFlowScene(
    oidcDocument,
    collapseAllJourneys(createViewerInteraction(oidcDocument)),
  );
  assert.deepEqual(
    contextPath(scene, []).map((f) => f.key),
    [APP],
  );
  assert.deepEqual(
    contextPath(scene, ["not open"]).map((f) => f.key),
    [APP],
  );
});

test("opening a composite extends the path; closing one shortens it to its parent", () => {
  const scene = buildFlowScene(oidcDocument, scopeOf("idp-mfa-challenge open"));
  const mfa = keyOf(scene, MFA);
  const lineage = lineageOf(scene, mfa);
  assert.deepEqual(lineage, [APP, keyOf(scene, IDP), mfa]);
  assert.deepEqual(
    contextPath(scene, lineage).map((f) => f.card.node["@id"]),
    [APP, IDP, MFA],
  );
  // A closed composite's lineage ends with its own key, which opens with it.
  const closed = buildFlowScene(oidcDocument, scopeOf("idp-auth-flow open"));
  assert.deepEqual(lineageOf(closed, mfa), lineage);
  assert.deepEqual(
    contextPath(closed, lineage).map((f) => f.card.node["@id"]),
    [APP, IDP],
  );
});

test("collapsing within a frame closes everything inside it and keeps the path to it", () => {
  const open = createViewerInteraction(oidcDocument);
  const scene = buildFlowScene(oidcDocument, open);
  const path = contextPath(scene, lineageOf(scene, keyOf(scene, IDP)));
  const idp = path.at(-1)!;
  const after = buildFlowScene(oidcDocument, collapseWithin(idp, open));
  const next = contextPath(
    after,
    path.map((f) => f.key),
  );
  assert.deepEqual(
    next.map((f) => f.key),
    path.map((f) => f.key),
  );
  assert.deepEqual(
    framesWithin(next.at(-1)!).map((f) => f.key),
    [idp.key],
    "nothing stays open inside the frame",
  );
  assert.ok(
    framesWithin(idp).length > 1,
    "the scope had open composites inside",
  );
});

test("rows and recursion keep their frames when collapsing within them", () => {
  for (const document of [screensFixture, hierarchyFixture]) {
    const open = createViewerInteraction(document);
    const scene = buildFlowScene(document, open);
    for (const root of scene.frames)
      for (const frame of framesWithin(root)) {
        const lineage = lineageOf(scene, frame.key);
        const after = buildFlowScene(document, collapseWithin(frame, open));
        const path = contextPath(after, lineage);
        assert.equal(
          path.at(-1)?.key,
          frame.key,
          `${document["@id"]}: ${frame.key} stays open`,
        );
        const inside = framesWithin(path.at(-1)!);
        assert.ok(
          inside.every((f) => f === inside[0] || f.card.kind === "journey"),
          `${document["@id"]}: only ${frame.key}'s own child journeys remain`,
        );
      }
  }
});
