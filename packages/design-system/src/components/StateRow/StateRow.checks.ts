import { boolean, choice, count, object, text } from "@/dev/checks";
import type { FixtureCheck } from "@/dev/checks";

const nested = (value: unknown, key: string, check: FixtureCheck) =>
  object(value) && value[key] !== undefined
    ? check(value[key]).map((finding) => ({
        ...finding,
        path: [key, ...finding.path],
      }))
    : [];

export const checkStateRowFixture: FixtureCheck = (value) => [
  ...text(value, "label"),
  ...text(value, "description"),
  ...boolean(value, "composite"),
  ...boolean(value, "expanded"),
  ...boolean(value, "selected"),
  ...boolean(value, "filtered"),
  ...(object(value) && value.tone !== undefined
    ? choice(value, "tone", ["active", "incoming", "outgoing", "both", "dim"])
    : []),
  ...nested(value, "marks", (marks) => [
    ...count(marks, "incoming"),
    ...count(marks, "outgoing"),
    ...(object(marks) && marks.title !== undefined ? text(marks, "title") : []),
  ]),
  ...nested(value, "crossing", (crossing) => [
    ...text(crossing, "label"),
    ...(object(crossing) && crossing.color !== undefined
      ? text(crossing, "color")
      : []),
  ]),
  ...(object(value) && value.expanded === true && value.composite === false
    ? [{ path: ["expanded"], message: "Expanded rows must be composite." }]
    : []),
];
