import { count, object, text } from "../../dev/checks.ts";
import type { FixtureCheck } from "../../dev/checks.ts";

export const checkStateSummaryFixture: FixtureCheck = (value) => [
  ...text(value, "label"),
  ...count(value, "entryCount"),
  ...count(value, "directExitCount"),
  ...(object(value)
    ? Object.keys(value)
        .filter((key) => !["label", "entryCount", "directExitCount"].includes(key))
        .map((key) => ({ path: [key], message: "Not a state-summary fixture property." }))
    : []),
];
