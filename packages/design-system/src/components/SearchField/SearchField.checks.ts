import { boolean, object, text } from "../../dev/checks.ts";
import type { FixtureCheck } from "../../dev/checks.ts";

export const checkSearchFieldFixture: FixtureCheck = (value) => [
  ...text(value, "label"),
  ...(object(value) && typeof value.value === "string" ? [] : [{ path: ["value"], message: "Expected a string." }]),
  ...(object(value) && value.placeholder !== undefined ? text(value, "placeholder") : []),
  ...(object(value) && value.open !== undefined ? boolean(value, "open") : []),
  ...(object(value) && value.status !== undefined ? text(value, "status") : []),
];
