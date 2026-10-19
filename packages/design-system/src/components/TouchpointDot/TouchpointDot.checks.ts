import { text } from "../../dev/checks.ts";
import type { FixtureCheck } from "../../dev/checks.ts";

export const checkTouchpointDotFixture: FixtureCheck = (value) => [
  ...text(value, "label"),
  ...text(value, "color"),
];
