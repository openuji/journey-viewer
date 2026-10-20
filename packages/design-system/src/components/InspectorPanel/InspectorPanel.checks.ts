import { choice, object, text } from "../../dev/checks.ts";
import type { FixtureCheck, FixtureFinding } from "../../dev/checks.ts";

const strings = (value: unknown, path: readonly string[]): readonly FixtureFinding[] => (
  Array.isArray(value) && value.every((item: unknown) => typeof item === "string" && item.length > 0)
    ? [] : [{ path, message: "Expected an array of non-empty strings." }]
);

export const checkInspectorPanelFixture: FixtureCheck = (value) => [
  ...["title", "kind", "identity", "context"].flatMap((key) => text(value, key)),
  ...choice(value, "level", [1, 2, 3, 4, 5, 6]),
  ...strings(object(value) ? value.touchpoints : undefined, ["touchpoints"]),
  ...(object(value) && Array.isArray(value.sections)
    ? value.sections.flatMap((section: unknown, index: number): readonly FixtureFinding[] => [
        ...text(section, "title").map((finding) => ({ ...finding, path: ["sections", String(index), ...finding.path] })),
        ...(object(section) && Array.isArray(section.items)
          ? section.items.flatMap((item: unknown, itemIndex: number): readonly FixtureFinding[] => [
              ...[...text(item, "id"), ...text(item, "label")].map((finding) => ({ ...finding, path: ["sections", String(index), "items", String(itemIndex), ...finding.path] })),
              ...strings(object(item) ? item.details : undefined, ["sections", String(index), "items", String(itemIndex), "details"]),
            ])
          : [{ path: ["sections", String(index), "items"], message: "Expected an array." }]),
      ])
    : [{ path: ["sections"], message: "Expected an array." }]),
];
