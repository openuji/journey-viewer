import { boolean, choice, object, text } from "@/dev/checks";
import type { FixtureCheck } from "@/dev/checks";
export const checkScreenLightboxFixture: FixtureCheck = (value) => [
  ...["title", "context", "position"].flatMap((key) => text(value, key)),
  ...boolean(value, "canStep"),
  ...(object(value) && value.sizingMode !== undefined
    ? choice(value, "sizingMode", ["fit", "original"])
    : []),
  ...(object(value) && value.touchpoint !== undefined
    ? text(value.touchpoint, "label").map((finding) => ({
        ...finding,
        path: ["touchpoint", ...finding.path],
      }))
    : []),
];
