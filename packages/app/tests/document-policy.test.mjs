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
const minimal = {
  "@context": "https://ujg.specs.openuji.org/ed/context.jsonld",
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

test("selected checks retain the exact canonical object and leave frozen OIDC unchanged", async () => {
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
  assert.equal(result.document, document);
  assert.deepEqual(result.findings, []);
  assert.equal(JSON.stringify(document), before);
  const empty = freeze({
    "@context": "urn:context",
    "@id": "urn:empty",
    "@type": "UJGDocument",
  });
  assert.equal(checkDocument(empty).document, empty);
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
    assert.equal("document" in result, false);
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
  assert.equal(result.document, value);
  assert.equal(result.document.nodes.length, 2);
  assert.ok(result.findings.length > 0);
  assert.ok(
    result.findings.every(
      (finding) =>
        finding.ruleId === "ujg/reference-targets" && !blocksOpening(finding),
    ),
  );
});

test("finding paths identify root, arrays and unusual property names without ambiguous dot notation", () => {
  assert.equal(findingPath([]), "$");
  assert.equal(findingPath(["nodes", 2, "@id"]), '$["nodes"][2]["@id"]');
  assert.equal(findingPath(['a.b[0]"', "~/"]), '$["a.b[0]\\\""]["~/"]');
});
