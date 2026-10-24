import { boolean, choice, text } from "@/dev/checks";
import type { FixtureCheck } from "@/dev/checks";

export const checkIconButtonFixture: FixtureCheck = (value) => [
  ...text(value, "label"),
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
];
