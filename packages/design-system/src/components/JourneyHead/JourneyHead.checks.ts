import { boolean, choice, object, text } from "@/dev/checks";
import type { FixtureCheck } from "@/dev/checks";
import { checkTouchpointDotFixture } from "@/components/TouchpointDot/TouchpointDot.checks";

export const checkJourneyHeadFixture: FixtureCheck = (value) => [
  ...text(value, "title"),
  ...boolean(value, "filtered"),
  ...boolean(value, "matched"),
  ...text(value, "count"),
  ...choice(value, "level", [1, 2, 3, 4, 5, 6]),
  ...(object(value) && value.crumb !== undefined ? text(value, "crumb") : []),
  ...(object(value) && value.filtered === true && value.matched === true
    ? [
        {
          path: ["matched"],
          message: "A journey cannot be both filtered and matched.",
        },
      ]
    : []),
  ...(object(value) && value.touchpoints !== undefined
    ? Array.isArray(value.touchpoints)
      ? value.touchpoints.flatMap((item, index) =>
          [
            ...text(item, "id"),
            ...text(item, "label"),
            ...(object(item) && item.color === undefined
              ? []
              : text(item, "color")),
          ].map((finding) => ({
            ...finding,
            path: ["touchpoints", String(index), ...finding.path],
          })),
        )
      : [{ path: ["touchpoints"], message: "Expected an array." }]
    : []),
  ...checkTouchpointDotFixture(
    object(value) ? value.touchpoint : undefined,
  ).map((finding) => ({ ...finding, path: ["touchpoint", ...finding.path] })),
];
