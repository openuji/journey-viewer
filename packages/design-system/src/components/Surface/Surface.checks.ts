import { boolean, choice } from "@/dev/checks";
import type { FixtureCheck } from "@/dev/checks";

export const checkSurfaceFixture: FixtureCheck = (value) => [
  ...choice(value, "as", ["div", "article", "section", "aside", "span"]),
  ...choice(value, "tone", ["default", "muted"]),
  ...choice(value, "radius", ["sm", "lg", "full"]),
  ...boolean(value, "raised"),
];
