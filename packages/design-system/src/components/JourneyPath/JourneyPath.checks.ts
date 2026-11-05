import { object, text } from "@/dev/checks";
import type { FixtureCheck, FixtureFinding } from "@/dev/checks";

/** Choices name journeys with unique ids, and include the step's own journey. */
const choiceFindings = (item: unknown): readonly FixtureFinding[] => {
  const choices = object(item) ? item.choices : undefined;
  if (choices === undefined) return [];
  if (!Array.isArray(choices) || choices.length < 2)
    return [{ path: ["choices"], message: "Expected two or more choices." }];
  const ids = choices.map((choice) => (object(choice) ? choice.id : undefined));
  return [
    ...choices.flatMap((choice, index): readonly FixtureFinding[] =>
      [...text(choice, "id"), ...text(choice, "title")].map((finding) => ({
        ...finding,
        path: ["choices", String(index), ...finding.path],
      })),
    ),
    ...(new Set(ids).size === ids.length
      ? []
      : [{ path: ["choices"], message: "Expected unique choice ids." }]),
    ...(object(item) && ids.includes(item.id)
      ? []
      : [{ path: ["choices"], message: "Expected the step's own journey." }]),
  ];
};

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
        ...choiceFindings(item),
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
