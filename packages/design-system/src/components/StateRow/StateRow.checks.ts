import { boolean, count, object, text } from "../../dev/checks.ts";
import type { FixtureCheck } from "../../dev/checks.ts";

export const checkStateRowFixture: FixtureCheck = (value) => [
  ...text(value, "label"),
  ...text(value, "description"),
  ...boolean(value, "composite"),
  ...boolean(value, "expanded"),
  ...boolean(value, "selected"),
  ...boolean(value, "filtered"),
  ...count(value, "entryCount"),
  ...count(value, "exitCount"),
  ...(object(value) && value.expanded === true && value.composite === false
    ? [{ path: ["expanded"], message: "Expanded rows must be composite." }]
    : []),
];
