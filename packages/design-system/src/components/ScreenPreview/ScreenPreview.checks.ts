import { boolean, object, text } from "@/dev/checks";
import type { FixtureCheck } from "@/dev/checks";
export const checkScreenPreviewFixture: FixtureCheck = (value) => [
  ...text(value, "title"),
  ...text(value, "context"),
  ...boolean(value, "visible"),
  ...(object(value) && value.touchpoint !== undefined
    ? [
        ...text(value.touchpoint, "label"),
        ...(object(value.touchpoint) && value.touchpoint.color !== undefined
          ? text(value.touchpoint, "color")
          : []),
      ].map((finding) => ({
        ...finding,
        path: ["touchpoint", ...finding.path],
      }))
    : []),
];
