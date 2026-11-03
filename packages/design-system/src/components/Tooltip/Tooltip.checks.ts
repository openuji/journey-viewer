import { text } from "@/dev/checks";
import type { FixtureCheck } from "@/dev/checks";

export const checkTooltipFixture: FixtureCheck = (value) => [
  ...text(value, "label"),
];
