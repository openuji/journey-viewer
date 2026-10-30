import { boolean, choice, object, text } from "@/dev/checks";
import type { FixtureCheck } from "@/dev/checks";
import { checkLines } from "@/components/StateNode/StateNode.checks";

export const checkCompositeCardFixture: FixtureCheck = (value) => [
  ...checkLines(value, "title", 2),
  ...choice(value, "toggle", ["expand", "collapse", null]),
  ...checkLines(value, "caption", 2),
  ...boolean(value, "heading"),
  ...boolean(value, "current"),
  ...boolean(value, "selected"),
  ...(object(value) && value.tone !== undefined
    ? choice(value, "tone", ["incoming", "outgoing", "both"])
    : []),
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
  ...(object(value) && value.current === true && value.heading !== true
    ? [
        {
          path: ["current"],
          message: "Only a heading marks the current journey.",
        },
      ]
    : []),
  ...(object(value) && value.heading === true && value.toggle === "expand"
    ? [{ path: ["toggle"], message: "A heading's journey is already open." }]
    : []),
];
