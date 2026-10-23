import { boolean, choice, text } from "../../dev/checks.ts";
import type { FixtureCheck } from "../../dev/checks.ts";

export const checkButtonFixture: FixtureCheck = (value) => [
  ...text(value, "children"),
  ...choice(value, "variant", ["solid", "outline", "ghost", "row", "bare", "pill", "segment", "chip", "panel"]),
  ...choice(value, "size", ["xs", "sm", "md"]),
  ...boolean(value, "disabled"),
  ...boolean(value, "selected"),
];
