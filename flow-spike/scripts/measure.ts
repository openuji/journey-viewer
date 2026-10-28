import { readFileSync, statSync, writeFileSync } from "node:fs";
import { format } from "prettier";
import { oidcDocument } from "@/data/node-documents";
import { measureArtifacts } from "@/layout/artifacts";
import { composeFlow, composeFlowAsync } from "@/layout/compose";
import { elkLevel, elkLevelUnmerged } from "@/layout/elk-level";
import { ownLevel } from "@/layout/own-level";
import { estimate } from "@/layout/text";
import { buildFlowScene } from "@/model/flow-scene";
import { scopes } from "~/tests/scopes";

/**
 * Own engine vs ELK layered on identical input for every disclosure scope. Text is measured by the
 * deterministic estimator; the browser capture repeats the artifact check with real text metrics.
 */
const RUNS = 7;
const median = (values: number[]) =>
  [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)]!;
const pick = (report: ReturnType<typeof measureArtifacts>) => ({
  diagonals: report.diagonals,
  jogs: report.jogs,
  shortArrivals: report.shortArrivals,
  throughBoxes: report.throughBoxes,
  borderCrossings: report.borderCrossings,
  overlaps: report.overlaps,
  ink: report.ink,
  runs: report.runs,
  crossings: report.crossings,
  bends: report.bends,
  connectors: report.connectors,
  width: report.width,
  height: report.height,
});

const rows = [];
for (const [name, interaction] of scopes(oidcDocument)) {
  const scene = buildFlowScene(oidcDocument, interaction);
  const ownTimes: number[] = [];
  const elkTimes: number[] = [];
  let own = composeFlow(scene, ownLevel(), estimate);
  let elk = await composeFlowAsync(scene, elkLevel, estimate);
  const unmerged = await composeFlowAsync(scene, elkLevelUnmerged, estimate);
  for (let run = 0; run < RUNS; run++) {
    let started = performance.now();
    own = composeFlow(scene, ownLevel(), estimate);
    ownTimes.push(performance.now() - started);
    started = performance.now();
    elk = await composeFlowAsync(scene, elkLevel, estimate);
    elkTimes.push(performance.now() - started);
  }
  rows.push({
    scope: name,
    own: {
      ...pick(measureArtifacts(own)),
      milliseconds: Number(median(ownTimes).toFixed(1)),
    },
    elk: {
      ...pick(measureArtifacts(elk)),
      milliseconds: Number(median(elkTimes).toFixed(1)),
    },
    elkUnmerged: pick(measureArtifacts(unmerged)),
    ownAlignedCenter: pick(
      measureArtifacts(
        composeFlow(scene, ownLevel("aligned-center"), estimate),
      ),
    ),
    ownAlignedLeft: pick(
      measureArtifacts(composeFlow(scene, ownLevel("aligned-left"), estimate)),
    ),
  });
}

const lines = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8").split("\n").length;
// The engine (@journey-viewer/flow-layout) plus the spike's composer, sizes and metrics.
const ownLines = [
  ...["index", "layout-level", "options", "polyline", "types"].map(
    (f) => `../../packages/flow-layout/src/${f}.ts`,
  ),
  ...["geometry", "own-level", "compose", "artifacts"].map(
    (f) => `../src/layout/${f}.ts`,
  ),
].reduce((sum, path) => sum + lines(path), 0);
const elkBytes = statSync(
  new URL("../node_modules/elkjs/lib/elk.bundled.js", import.meta.url),
).size;
const result = {
  method: `Solid-OIDC, ${RUNS} warm runs per scope after one discarded run, median milliseconds; Node ${process.version}; estimator text metrics.`,
  sizes: { ownLayoutSourceLines: ownLines, elkBundledBytes: elkBytes },
  scopes: rows,
};
const target = new URL("../evidence/metrics.json", import.meta.url);
writeFileSync(target, await format(JSON.stringify(result), { parser: "json" }));
console.log(
  "| Scope | Own: ink / runs / crossings / kinks / ms | ELK merged: ink / runs / crossings / kinks / ms | ELK unmerged: ink / runs / crossings / kinks |",
);
console.log("| --- | --- | --- | --- |");
for (const row of rows)
  console.log(
    `| ${row.scope} | ${row.own.ink} / ${row.own.runs} / ${row.own.crossings} / ${row.own.jogs} / ${row.own.milliseconds} | ${row.elk.ink} / ${row.elk.runs} / ${row.elk.crossings} / ${row.elk.jogs} / ${row.elk.milliseconds} | ${row.elkUnmerged.ink} / ${row.elkUnmerged.runs} / ${row.elkUnmerged.crossings} / ${row.elkUnmerged.jogs} |`,
  );
console.log(JSON.stringify(result.sizes));
