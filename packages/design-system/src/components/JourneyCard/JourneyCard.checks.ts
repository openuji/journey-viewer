import { choice, object, text } from "../../dev/checks.ts";
import type { FixtureCheck } from "../../dev/checks.ts";
import { checkTouchpointDotFixture } from "../TouchpointDot/TouchpointDot.checks.ts";

export const checkJourneyCardFixture: FixtureCheck = (value) => [
  ...text(value, "title"),
  ...text(value, "count"),
  ...choice(value, "level", [1, 2, 3, 4, 5, 6]),
  ...checkTouchpointDotFixture(
    object(value) ? value.touchpoint : undefined,
  ).map((finding) => ({ ...finding, path: ["touchpoint", ...finding.path] })),
];
