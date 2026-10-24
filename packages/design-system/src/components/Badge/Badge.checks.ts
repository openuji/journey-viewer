import { choice, text } from "@/dev/checks";
import type { FixtureCheck } from "@/dev/checks";

export const checkBadgeFixture: FixtureCheck = (value) => [
  ...text(value, "children"),
  ...text(value, "label"),
  ...choice(value, "tone", ["default", "muted", "subtle", "entry", "exit"]),
];
