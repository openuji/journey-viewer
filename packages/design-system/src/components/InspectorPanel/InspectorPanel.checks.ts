import { boolean, choice, count, object, text } from "../../dev/checks.ts";
import type { FixtureCheck, FixtureFinding } from "../../dev/checks.ts";

const at = (path: readonly string[], findings: readonly FixtureFinding[]) => findings.map((finding) => ({ ...finding, path: [...path, ...finding.path] }));
const list = (value: unknown, path: readonly string[], check: (item: unknown, path: readonly string[]) => readonly FixtureFinding[]): readonly FixtureFinding[] => (
  value === undefined ? [] : Array.isArray(value) ? value.flatMap((item: unknown, index: number) => check(item, [...path, String(index)]))
    : [{ path, message: "Expected an array." }]
);
const strings = (value: unknown, path: readonly string[]): readonly FixtureFinding[] => (
  Array.isArray(value) && value.every((item: unknown) => typeof item === "string" && item.length > 0)
    ? [] : [{ path, message: "Expected an array of non-empty strings." }]
);
const optionalText = (value: unknown, key: string) => object(value) && value[key] !== undefined ? text(value, key) : [];

export const checkInspectorPanelFixture: FixtureCheck = (value) => [
  ...["title", "typeLabel", "identity", "crumb"].flatMap((key) => text(value, key)),
  ...optionalText(value, "footnote"),
  ...choice(value, "level", [1, 2, 3, 4, 5, 6]),
  ...(object(value) && Array.isArray(value.touchpoints) ? list(value.touchpoints, ["touchpoints"], (item, path) => at(path, [
    ...text(item, "id"), ...text(item, "label"), ...optionalText(item, "color"),
  ])) : [{ path: ["touchpoints"], message: "Expected an array." }]),
  ...(object(value) && Array.isArray(value.sections) ? list(value.sections, ["sections"], (section, path) => [
    ...at(path, [
      ...text(section, "title"),
      ...(object(section) && section.direction !== undefined ? choice(section, "direction", ["incoming", "outgoing"]) : []),
      ...(object(section) && section.count !== undefined ? count(section, "count") : []),
      ...optionalText(section, "empty"),
    ]),
    ...list(object(section) ? section.details : undefined, [...path, "details"], (detail, detailPath) => at(detailPath, [
      ...text(detail, "id"), ...text(detail, "label"), ...text(detail, "sub"), ...optionalText(detail, "note"),
    ])),
    ...list(object(section) ? section.groups : undefined, [...path, "groups"], (group, groupPath) => [
      ...at(groupPath, [...text(group, "id"), ...text(group, "label"), ...boolean(group, "exit")]),
      ...(object(group) && Array.isArray(group.items) ? list(group.items, [...groupPath, "items"], (item, itemPath) => [
        ...at(itemPath, [...text(item, "id"), ...text(item, "label"), ...optionalText(item, "annotation")]),
        ...strings(object(item) ? item.tags : undefined, [...itemPath, "tags"]),
      ]) : [{ path: [...groupPath, "items"], message: "Expected an array." }]),
    ]),
    ...(object(section) && section.direction === undefined && Array.isArray(section.groups) && section.groups.length > 0
      ? [{ path: [...path, "direction"], message: "Transition groups require a direction." }] : []),
  ]) : [{ path: ["sections"], message: "Expected an array." }]),
];
