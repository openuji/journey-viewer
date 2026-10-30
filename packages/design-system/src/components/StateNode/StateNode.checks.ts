import { boolean, choice, object, text } from "@/dev/checks";
import type { FixtureCheck, FixtureFinding } from "@/dev/checks";

/** One to `most` non-empty, pre-wrapped lines. */
export const checkLines = (
  value: unknown,
  key: string,
  most: number,
): readonly FixtureFinding[] => {
  const lines = object(value) ? value[key] : undefined;
  return Array.isArray(lines) &&
    lines.length >= 1 &&
    lines.length <= most &&
    lines.every((line) => typeof line === "string" && line.length > 0)
    ? []
    : [{ path: [key], message: `Expected 1–${most} non-empty lines.` }];
};

export const checkStateNodeFixture: FixtureCheck = (value) => [
  ...text(value, "label"),
  ...checkLines(value, "lines", 3),
  ...boolean(value, "selected"),
  ...(object(value) && value.tone !== undefined
    ? choice(value, "tone", ["incoming", "outgoing", "both"])
    : []),
];
