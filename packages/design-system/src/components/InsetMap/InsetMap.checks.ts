import { choice, object, text } from "@/dev/checks";
import type { FixtureCheck, FixtureFinding } from "@/dev/checks";

const finite = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const positive = (value: unknown, key: string): readonly FixtureFinding[] =>
  object(value) && finite(value[key]) && (value[key] as number) > 0
    ? []
    : [{ path: [key], message: "Expected a positive number." }];

const rect = (value: unknown): boolean =>
  object(value) &&
  finite(value.x) &&
  finite(value.y) &&
  finite(value.width) &&
  finite(value.height) &&
  value.width >= 0 &&
  value.height >= 0;

const optional = (value: unknown, key: string) =>
  !object(value) || value[key] === undefined || typeof value[key] === "boolean";

/** Each item named and placed: frames with their context, blocks with optional marks. */
const items = (
  value: unknown,
  key: string,
  each: (item: unknown) => readonly FixtureFinding[],
): readonly FixtureFinding[] => {
  const list = object(value) ? value[key] : undefined;
  if (!Array.isArray(list))
    return [{ path: [key], message: "Expected a list." }];
  return list.flatMap((item, index) =>
    [
      ...text(item, "id"),
      ...(object(item) && rect(item.rect)
        ? []
        : [{ path: ["rect"], message: "Expected a finite rectangle." }]),
      ...each(item),
    ].map((finding) => ({
      ...finding,
      path: [key, `${index}`, ...finding.path],
    })),
  );
};

export const checkInsetMapFixture: FixtureCheck = (value) => [
  ...positive(value, "width"),
  ...positive(value, "height"),
  ...items(value, "frames", (frame) =>
    choice(frame, "context", ["current", "outside"]),
  ),
  ...items(value, "blocks", (block) => [
    ...(optional(block, "selected")
      ? []
      : [{ path: ["selected"], message: "Expected a boolean." }]),
    ...(optional(block, "receded")
      ? []
      : [{ path: ["receded"], message: "Expected a boolean." }]),
    ...(optional(block, "dot")
      ? []
      : [{ path: ["dot"], message: "Expected a boolean." }]),
  ]),
  ...(object(value) && value.view !== null && !rect(value.view)
    ? [{ path: ["view"], message: "Expected a finite rectangle or null." }]
    : []),
];
