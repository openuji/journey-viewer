import { writeFileSync } from "node:fs";
import { format } from "prettier";
import type { LevelInput } from "@journey-viewer/flow-layout";
import { createViewerInteraction } from "@journey-viewer/viewer";
import {
  emptyCompositesFixture,
  hierarchyFixture,
  minimalFixture,
  oidcDocument,
  screensFixture,
} from "@/data/node-documents";
import { composeFlow } from "@/layout/compose";
import { ownLevel } from "@/layout/own-level";
import { estimate } from "@/layout/text";
import { buildFlowScene } from "@/model/flow-scene";
import { scopes } from "~/tests/scopes";

/**
 * Records every distinct level input the composer hands the engine, for the Solid-OIDC disclosure
 * scopes and the test fixtures, as test data for `@journey-viewer/flow-layout`. Sizes come from the
 * deterministic text estimator, so the file only changes when the projection or the composer does.
 * Ids are opaque to the engine; they lose their URN prefixes, and edges their default directions.
 */
const short = (id: string) =>
  id.replace(/urn:(ujg:solid-oidc|test|example):/g, "");
const compact = (input: LevelInput): LevelInput => ({
  nodes: input.nodes.map((node) => ({
    ...node,
    id: short(node.id),
    ...(node.ports
      ? { ports: node.ports.map((port) => ({ ...port, id: short(port.id) })) }
      : {}),
  })),
  edges: input.edges.map(
    ({ id, source, target, sourcePort, targetPort, forward, backward }) => ({
      id: short(id),
      source: short(source),
      target: short(target),
      ...(sourcePort ? { sourcePort: short(sourcePort) } : {}),
      ...(targetPort ? { targetPort: short(targetPort) } : {}),
      ...(forward === false ? { forward } : {}),
      ...(backward ? { backward } : {}),
    }),
  ),
});
const cases = [
  ...scopes(oidcDocument).map(
    ([name, interaction]) =>
      [`solid-oidc ${name}`, oidcDocument, interaction] as const,
  ),
  ...[
    hierarchyFixture,
    screensFixture,
    emptyCompositesFixture,
    minimalFixture,
  ].map(
    (document) =>
      [document["@id"], document, createViewerInteraction(document)] as const,
  ),
];
const seen = new Set<string>();
const levels: { name: string; input: LevelInput }[] = [];
for (const [name, document, interaction] of cases)
  composeFlow(
    buildFlowScene(document, interaction),
    (input) => {
      const level = compact(input);
      const json = JSON.stringify(level);
      if (!seen.has(json)) {
        seen.add(json);
        const header = level.nodes.find((node) => node.kind === "header")!;
        levels.push({ name: `${name}: ${header.id}`, input: level });
      }
      return ownLevel()(input);
    },
    estimate,
  );
const target = new URL(
  "../../packages/flow-layout/tests/fixtures/levels.json",
  import.meta.url,
);
writeFileSync(
  target,
  await format(
    JSON.stringify({
      source:
        "flow-spike `pnpm level-fixtures`: Solid-OIDC disclosure scopes and the spike's test fixtures",
      levels,
    }),
    { parser: "json" },
  ),
);
console.log(`${levels.length} levels`);
