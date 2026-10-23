import { boolean, object, text } from "../../dev/checks.ts";
import type { FixtureCheck } from "../../dev/checks.ts";
export const checkScreenLightboxFixture: FixtureCheck = (value) => [
  ...["title", "context", "position"].flatMap((key) => text(value, key)), ...boolean(value, "canStep"),
  ...(object(value) && value.touchpoint !== undefined
    ? text(value.touchpoint, "label").map((finding) => ({ ...finding, path: ["touchpoint", ...finding.path] })) : []),
];
