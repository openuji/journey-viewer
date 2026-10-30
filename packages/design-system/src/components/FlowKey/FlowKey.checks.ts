import { text } from "@/dev/checks";
import type { FixtureCheck } from "@/dev/checks";

export const checkFlowKeyFixture: FixtureCheck = (value) => [
  ...text(value, "label"),
];
