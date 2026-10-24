import { text } from "@/dev/checks";
import type { FixtureCheck } from "@/dev/checks";

export const checkTouchpointDotFixture: FixtureCheck = (value) => [
  ...text(value, "label"),
  ...text(value, "color"),
];
