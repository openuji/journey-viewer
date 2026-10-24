import { boolean, choice, text } from "@/dev/checks";
import type { FixtureCheck } from "@/dev/checks";

export const checkButtonFixture: FixtureCheck = (value) => [
  ...text(value, "children"),
  ...choice(value, "variant", [
    "solid",
    "outline",
    "ghost",
    "row",
    "bare",
    "pill",
    "segment",
    "chip",
    "panel",
  ]),
  ...choice(value, "size", ["xs", "sm", "md"]),
  ...boolean(value, "disabled"),
  ...boolean(value, "selected"),
];
