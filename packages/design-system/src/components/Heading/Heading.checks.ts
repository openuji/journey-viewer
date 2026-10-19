import { choice, text } from "../../dev/checks.ts";
import type { FixtureCheck } from "../../dev/checks.ts";

export const checkHeadingFixture: FixtureCheck = (value) => [
  ...text(value, "children"),
  ...choice(value, "level", [1, 2, 3, 4, 5, 6]),
  ...choice(value, "size", ["sm", "md", "lg"]),
];
