import { boolean, choice, object, text } from "../../dev/checks.ts";
import type { FixtureCheck } from "../../dev/checks.ts";
import { checkTouchpointDotFixture } from "../TouchpointDot/TouchpointDot.checks.ts";

export const checkJourneyHeadFixture: FixtureCheck = (value) => [
  ...text(value, "title"),
  ...boolean(value, "filtered"),
  ...text(value, "count"),
  ...choice(value, "level", [1, 2, 3, 4, 5, 6]),
  ...checkTouchpointDotFixture(
    object(value) ? value.touchpoint : undefined,
  ).map((finding) => ({ ...finding, path: ["touchpoint", ...finding.path] })),
];
