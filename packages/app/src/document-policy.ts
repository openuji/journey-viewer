import { lint } from "@journey-viewer/lint";
import type { Finding } from "@journey-viewer/lint";
import {
  documentShape,
  referenceTargets,
  uniqueNodeIds,
} from "@journey-viewer/lint/ujg";
import type { UjgDocument } from "@journey-viewer/ujg-jsonld";

// Rule selection and severity are application policy, never parser/viewer behavior.
const rules = [documentShape, uniqueNodeIds, referenceTargets] as const;
export function blocksOpening(finding: Finding): boolean {
  return (
    finding.ruleId === "ujg/document-shape" ||
    finding.ruleId === "ujg/unique-node-ids"
  );
}

export type DocumentCheck = Readonly<
  | { kind: "blocked"; findings: readonly Finding[] }
  | { kind: "ready"; document: UjgDocument; findings: readonly Finding[] }
>;

/** Receives the original parsed value. Does not parse, repair, copy or fetch it. */
export function checkDocument(value: unknown): DocumentCheck {
  const findings = lint(value, rules);
  return findings.some(blocksOpening)
    ? { kind: "blocked", findings }
    : { kind: "ready", document: value as UjgDocument, findings };
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
