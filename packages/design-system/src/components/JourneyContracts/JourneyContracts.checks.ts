import { object, text } from "@/dev/checks";
import type { FixtureCheck, FixtureFinding } from "@/dev/checks";

export const checkJourneyContractsFixture: FixtureCheck = (value) => {
  return (["entries", "exits"] as const).flatMap(
    (key): readonly FixtureFinding[] => {
      const items = object(value) ? value[key] : undefined;
      if (!Array.isArray(items)) {
        return [{ path: [key], message: "Expected an array." }];
      }
      return [
        ...items.flatMap(
          (item: unknown, index: number): readonly FixtureFinding[] => [
            ...[...text(item, "id"), ...text(item, "label")].map((finding) => ({
              ...finding,
              path: [key, String(index), ...finding.path],
            })),
            ...(key === "entries" &&
            object(item) &&
            item.default !== undefined &&
            typeof item.default !== "boolean"
              ? [
                  {
                    path: [key, String(index), "default"],
                    message: "Expected a boolean.",
                  },
                ]
              : []),
          ],
        ),
        ...(key === "entries" &&
        items.filter((item: unknown) => object(item) && item.default === true)
          .length > 1
          ? [{ path: [key], message: "At most one entry can be the default." }]
          : []),
      ];
    },
  );
};
