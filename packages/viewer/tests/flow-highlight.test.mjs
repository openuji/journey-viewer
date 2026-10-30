import assert from "node:assert/strict";
import test from "node:test";
import {
  collapseAllJourneys,
  createViewerInteraction,
  toggleChildJourneys,
} from "@journey-viewer/viewer";
import { id, oidcDocument } from "~/tests/flow-scopes.mjs";
import { composeFlow } from "@/flow/compose";
import { flowLevel } from "@/flow/geometry";
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
test("an active exit lights the parent connector that takes it", () => {
  const result = layout(idpOpen);
  const highlight = flowHighlight(result, {
    kind: "exit",
    journeyRef: id("idp-auth-journey"),
    nodeRef: id("idp-auth-success"),
  });
  const continuation = result.connectors.find(
    (c) => c.bundle?.a.port === `exit:${id("idp-auth-success")}`,
  );
  assert.ok(continuation, "the parent continues from the exit port");
  assert.deepEqual(highlight.routes.get(continuation.key), {
    incoming: [],
    outgoing: ["end"],
  });
  const arrival = [...highlight.routes.values()].filter((r) =>
    r.incoming.includes("end"),
  );
  assert.ok(arrival.length > 0, "the transitions into the exit arrive");
});
test("a two-way connector carries both colours, each with its own arrowhead", () => {
  const result = layout(closed);
  const highlight = flowHighlight(result, {
    kind: "state",
    journeyRef: id("app-auth-journey"),
    nodeRef: id("app-access-denied"),
  });
  const twoWay = [...highlight.routes.values()].find(
    (r) => r.incoming.length > 0 && r.outgoing.length > 0,
  );
  assert.ok(
    twoWay,
    "Access denied ↔ IdP is one connector with both directions",
  );
  assert.notDeepEqual(twoWay.incoming, twoWay.outgoing);
});
test("rest and activation never change geometry", () => {
  const result = layout(idpOpen);
  const before = JSON.stringify(result.connectors.map((c) => c.points));
  flowHighlight(result, {
    kind: "state",
    journeyRef: id("idp-auth-journey"),
    nodeRef: id("idp-login"),
  });
  assert.equal(JSON.stringify(result.connectors.map((c) => c.points)), before);
});
