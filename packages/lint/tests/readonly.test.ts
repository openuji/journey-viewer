import { lint } from "@journey-viewer/lint";
import type { Finding, Rule } from "@journey-viewer/lint";
import { documentShape, referenceTargets, uniqueNodeIds } from "@journey-viewer/lint/ujg";

export function readonlyContract(value: unknown, finding: Finding, rules: readonly Rule[]): void {
  // @ts-expect-error findings are readonly
  finding.message = "Changed";
  // @ts-expect-error locations are readonly
  finding.path.push("changed");
  // @ts-expect-error rule lists are readonly
  rules.push(documentShape);

  const results = lint(value, rules);
  // @ts-expect-error result arrays are readonly
  results.pop();
  // @ts-expect-error rules must be explicitly supplied
  lint(value);

  const genericRule: Rule<string> = (input) => input.length > 0 ? [] : [{
    ruleId: "custom/non-empty", path: [], message: "Expected text.",
  }];
  lint("text", [genericRule]);
  // @ts-expect-error typed rule inputs must match
  lint(42, [genericRule]);

  lint(value, [referenceTargets, uniqueNodeIds, documentShape]);
}
