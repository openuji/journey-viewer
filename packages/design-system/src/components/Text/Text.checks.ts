import { choice, text } from "@/dev/checks";
import type { FixtureCheck } from "@/dev/checks";

export const checkTextFixture: FixtureCheck = (value) => [
  ...text(value, "children"),
  ...choice(value, "as", ["span", "p", "code", "strong"]),
  ...choice(value, "variant", ["body", "label", "caption", "code"]),
  ...choice(value, "tone", [
    "default",
    "muted",
    "subtle",
    "entry",
    "exit",
    "accent",
  ]),
  ...choice(value, "weight", ["regular", "medium", "semibold"]),
];
