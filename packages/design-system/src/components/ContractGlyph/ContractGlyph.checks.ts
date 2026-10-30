import { boolean, choice, object, text } from "@/dev/checks";
import type { FixtureCheck } from "@/dev/checks";
import { checkLines } from "@/components/StateNode/StateNode.checks";

export const checkContractGlyphFixture: FixtureCheck = (value) => [
  ...choice(value, "kind", ["entry", "exit"]),
  ...boolean(value, "isDefault"),
  ...checkLines(value, "lines", 2),
  ...text(value, "label"),
  ...boolean(value, "selected"),
  ...(object(value) && value.isDefault === true && value.kind !== "entry"
    ? [{ path: ["isDefault"], message: "Only an entry can be the default." }]
    : []),
];
