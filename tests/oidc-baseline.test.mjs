import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(
  new URL("../examples/solid-oidc/solid-oidc.ujg.jsonld", import.meta.url),
  "utf8",
);
const baseline = JSON.parse(await readFile(
  new URL("../examples/solid-oidc/baseline.json", import.meta.url),
  "utf8",
));
const document = JSON.parse(source);

test("keeps the OIDC export byte-for-byte identical to the captured baseline", () => {
  assert.equal(
    createHash("sha256").update(source).digest("hex"),
    baseline.export.sha256,
  );
  assert.equal(document["@id"], "urn:ujg:solid-oidc");
  assert.equal(document["@type"], "UJGDocument");
});

test("preserves the source hierarchy's journey, state, transition, and surface counts", () => {
  assert.deepEqual({
    journeys: document.nodes.filter((node) => node["@type"] === "Journey").length,
    states: document.nodes.filter((node) => ["State", "CompositeState"].includes(node["@type"])).length,
    transitions: document.nodes.filter((node) => node["@type"] === "Transition").length,
    screens: document.nodes.filter((node) => node["@type"] === "Surface").length,
  }, { journeys: 10, states: 47, transitions: 120, screens: 37 });
  assert.deepEqual(baseline.counts, {
    journeys: 10, states: 47, transitions: 120, screens: 37,
  });
  assert.equal(baseline.screens.length, 37);
});

test("preserves the root entry and explicit nested boundary contracts", () => {
  const root = document.nodes.find((node) => node["@id"] === baseline.rootJourneyRef);
  assert.equal(root.defaultEntryRef, "urn:ujg:solid-oidc:app-auth-entry");
  const entry = document.nodes.find((node) => node["@id"] === root.defaultEntryRef);
  assert.equal(entry.stateRef, "urn:ujg:solid-oidc:app-sign-in-required");

  const enterIdp = document.nodes.find((node) => node["@id"] === "urn:ujg:solid-oidc:app-starts-idp-auth");
  assert.equal(enterIdp.toEntryRef, "urn:ujg:solid-oidc:idp-login-entry");

  const leaveIdp = document.nodes.find((node) => node["@id"] === "urn:ujg:solid-oidc:app-continues-after-idp-failed");
  assert.equal(leaveIdp.fromExitRef, "urn:ujg:solid-oidc:idp-auth-failed");
});
