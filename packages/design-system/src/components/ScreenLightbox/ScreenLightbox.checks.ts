import { boolean, text } from "../../dev/checks.ts";
import type { FixtureCheck } from "../../dev/checks.ts";
export const checkScreenLightboxFixture: FixtureCheck = (value) => [
  ...["title", "identity", "context", "position"].flatMap((key) => text(value, key)), ...boolean(value, "canStep"),
];
