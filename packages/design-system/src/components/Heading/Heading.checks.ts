import { choice, text } from "@/dev/checks";
import type { FixtureCheck } from "@/dev/checks";

export const checkHeadingFixture: FixtureCheck = (value) => [
  ...text(value, "children"),
  ...choice(value, "level", [1, 2, 3, 4, 5, 6]),
  ...choice(value, "size", ["xs", "sm", "md", "lg"]),
];
