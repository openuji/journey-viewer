import { choice, text } from "../../dev/checks.ts";
import type { FixtureCheck } from "../../dev/checks.ts";

export const checkBadgeFixture: FixtureCheck = (value) => [
  ...text(value, "children"),
  ...text(value, "label"),
  ...choice(value, "tone", ["default", "muted", "subtle", "entry", "exit"]),
];
