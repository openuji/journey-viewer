import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { blocksOpening, checkDocument, findingPath } from "@/document-policy";

const freeze = (value) => {
  if (value && typeof value === "object") {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
};
const ed = (module) =>
  `https://ujg.specs.openuji.org/ed/ns/${module}.context.jsonld`;
const minimal = {
  "@context": [ed("core"), ed("graph")],
  "@id": "urn:local:document",
  "@type": "UJGDocument",
  nodes: [
    {
      "@id": "urn:local:journey",
      "@type": "Journey",
      entryRefs: ["urn:local:entry"],
      stateRefs: ["urn:local:state"],
    },
    {
      "@id": "urn:local:entry",
      "@type": "JourneyEntry",
      stateRef: "urn:local:state",
    },
    { "@id": "urn:local:state", "@type": "State", label: "Local state" },
  ],
};

test("selected checks derive the graph and leave frozen OIDC unchanged", async () => {
  const document = freeze(
    JSON.parse(
      await readFile(
        new URL(
          "../../../examples/solid-oidc/solid-oidc.ujg.jsonld",
          import.meta.url,
        ),
        "utf8",
      ),
    ),
  );
  const before = JSON.stringify(document);
  const result = checkDocument(document);
  assert.equal(result.kind, "ready");
  assert.equal(result.graph.id, document["@id"]);
  assert.equal(result.graph.journeys.length, 10);
  assert.deepEqual(result.findings, []);
  assert.equal(JSON.stringify(document), before);
  const empty = freeze({
    "@context": ed("core"),
    "@id": "urn:empty",
    "@type": "UJGDocument",
  });
  assert.deepEqual(checkDocument(empty).graph.journeys, []);
});

test("the app blocks structural findings and ambiguous IDs without changing source or independent rule order", () => {
  for (const value of [
    null,
    [],
    2,
    {},
    { ...minimal, nodes: "bad" },
    { ...minimal, nodes: [...minimal.nodes, minimal.nodes[2]] },
  ]) {
    freeze(value);
    const before = JSON.stringify(value);
    const result = checkDocument(value);
    assert.equal(result.kind, "blocked");
    assert.ok(result.findings.some(blocksOpening));
    assert.equal("graph" in result, false);
    assert.equal(JSON.stringify(value), before);
  }
});

test("unresolved references are nonblocking app warnings and never repair the document", () => {
  const value = freeze({
    ...minimal,
    nodes: minimal.nodes.slice(0, 2),
    imports: ["https://example.invalid/not-fetched.jsonld"],
  });
  const result = checkDocument(value);
  assert.equal(result.kind, "ready");
  assert.equal(value.nodes.length, 2);
  // The unresolved state is left out of the graph, not invented.
  assert.deepEqual(result.graph.journeys[0].states, []);
  assert.ok(result.findings.length > 0);
  assert.ok(
    result.findings.every(
      (finding) =>
        finding.ruleId === "ujg/reference-targets" && !blocksOpening(finding),
    ),
  );
});

test("unknown, mixed and missing UJG versions block opening before any other check", () => {
  const dated =
    "https://ujg.specs.openuji.org/2027-01-15/ns/core.context.jsonld";
  for (const [context, named] of [
    [dated, dated],
    [[ed("core"), dated], dated],
    ["https://example.test/ujg", "https://example.test/ujg"],
    [undefined, "No UJG context"],
  ]) {
    const value = freeze({ ...minimal, "@context": context, nodes: "bad" });
    const result = checkDocument(value);
    assert.equal(result.kind, "blocked");
    // Only the version finding: the Editor's Draft rules never judge another version.
    assert.deepEqual(
      result.findings.map((finding) => [finding.ruleId, finding.path]),
      [["app/ujg-version", ["@context"]]],
    );
    assert.ok(blocksOpening(result.findings[0]));
    assert.ok(result.findings[0].message.includes(named));
  }
});

test("finding paths identify root, arrays and unusual property names without ambiguous dot notation", () => {
  assert.equal(findingPath([]), "$");
  assert.equal(findingPath(["nodes", 2, "@id"]), '$["nodes"][2]["@id"]');
  assert.equal(findingPath(['a.b[0]"', "~/"]), '$["a.b[0]\\\""]["~/"]');
});
