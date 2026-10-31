import { lint } from "@journey-viewer/lint";
import type { Finding } from "@journey-viewer/lint";
import {
  documentShape,
  referenceTargets,
  uniqueNodeIds,
} from "@journey-viewer/lint/ujg";
import {
  detectUjgVersion,
  projectJourneyGraph,
} from "@journey-viewer/ujg-jsonld";
import type { JourneyGraph } from "@journey-viewer/ujg-jsonld";

// Rule selection and severity are application policy, never parser/viewer behavior. The rules
// check the Editor's Draft, the one version the app reads.
const rules = [documentShape, uniqueNodeIds, referenceTargets] as const;
const versionRule = "app/ujg-version";
export function blocksOpening(finding: Finding): boolean {
  return (
    finding.ruleId === versionRule ||
    finding.ruleId === "ujg/document-shape" ||
    finding.ruleId === "ujg/unique-node-ids"
  );
}

export type DocumentCheck = Readonly<
  | { kind: "blocked"; findings: readonly Finding[] }
  | { kind: "ready"; graph: JourneyGraph; findings: readonly Finding[] }
>;

/**
 * Receives the original parsed value. Refuses a UJG version it cannot read before checking the
 * rest, then derives the graph the viewer shows. Does not parse, repair, copy or fetch it.
 */
export function checkDocument(value: unknown): DocumentCheck {
  const version = detectUjgVersion(value);
  if (version.kind === "unsupported")
    return {
      kind: "blocked",
      findings: [
        {
          ruleId: versionRule,
          path: ["@context"],
          message: version.contexts.length
            ? `Unsupported UJG version: ${version.contexts.join(", ")}. The app reads the UJG Editor's Draft.`
            : "No UJG context. The app reads documents whose @context names the UJG Editor's Draft.",
        },
      ],
    };
  const findings = lint(value, rules);
  return findings.some(blocksOpening)
    ? { kind: "blocked", findings }
    : { kind: "ready", graph: projectJourneyGraph(value), findings };
}

export function findingPath(path: Finding["path"]): string {
  return (
    "$" +
    path
      .map(
        (part) => `[${typeof part === "number" ? part : JSON.stringify(part)}]`,
      )
      .join("")
  );
}
