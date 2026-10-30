import { object, text } from "@/dev/checks";
import type { FixtureCheck, FixtureFinding } from "@/dev/checks";

export const checkJourneyPathFixture: FixtureCheck = (value) => {
  const items = object(value) ? value.items : undefined;
  if (!Array.isArray(items) || items.length === 0)
    return [{ path: ["items"], message: "Expected one or more steps." }];
  const ids = items.map((item) => (object(item) ? item.id : undefined));
  return [
    ...items.flatMap((item, index): readonly FixtureFinding[] =>
      [
        ...text(item, "id"),
        ...text(item, "title"),
        ...(object(item) && item.touchpoint !== undefined
          ? text(item.touchpoint, "label").map((finding) => ({
              ...finding,
              path: ["touchpoint", ...finding.path],
            }))
          : []),
      ].map((finding) => ({
        ...finding,
        path: ["items", String(index), ...finding.path],
      })),
    ),
    ...(new Set(ids).size === ids.length
      ? []
      : [{ path: ["items"], message: "Expected unique step ids." }]),
    ...(object(value) && value.label !== undefined ? text(value, "label") : []),
  ];
};
