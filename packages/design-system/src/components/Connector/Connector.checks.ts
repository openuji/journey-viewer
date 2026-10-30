import { boolean, choice, object, text } from "@/dev/checks";
import type { FixtureCheck, FixtureFinding } from "@/dev/checks";

const finite = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

/** At least two finite points, each leg horizontal or vertical. */
export const checkPoints = (
  value: unknown,
  key: string,
): readonly FixtureFinding[] => {
  const points = object(value) ? value[key] : undefined;
  if (
    !Array.isArray(points) ||
    points.length < 2 ||
    !points.every(
      (point) => object(point) && finite(point.x) && finite(point.y),
    )
  )
    return [{ path: [key], message: "Expected two or more finite points." }];
  const legs = points.slice(1).map((point, index) => [points[index], point]);
  return legs.every(([a, b]) => a.x === b.x || a.y === b.y)
    ? []
    : [{ path: [key], message: "Expected horizontal or vertical legs." }];
};

export const checkConnectorFixture: FixtureCheck = (value) => [
  ...choice(value, "kind", ["bundle", "association"]),
  ...checkPoints(value, "points"),
  ...boolean(value, "rest"),
  ...(object(value) && value.title !== undefined ? text(value, "title") : []),
];
