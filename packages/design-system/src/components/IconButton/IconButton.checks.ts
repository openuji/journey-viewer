import { boolean, choice, text } from "../../dev/checks.ts";
import type { FixtureCheck } from "../../dev/checks.ts";

export const checkIconButtonFixture: FixtureCheck = (value) => [
  ...text(value, "label"),
  ...choice(value, "variant", ["solid", "outline", "ghost", "row"]),
  ...choice(value, "size", ["sm", "md"]),
  ...boolean(value, "disabled"),
];
