import { choice, object } from "@/dev/checks";
import type { FixtureCheck, FixtureFinding } from "@/dev/checks";
import { checkPoints } from "@/components/Connector/Connector.checks";

const point = (value: unknown) =>
  object(value) &&
  typeof value.x === "number" &&
  Number.isFinite(value.x) &&
  typeof value.y === "number" &&
  Number.isFinite(value.y);

const each = (
  value: unknown,
  key: string,
  check: FixtureCheck,
): readonly FixtureFinding[] => {
  const list = object(value) ? value[key] : undefined;
  return Array.isArray(list)
    ? list.flatMap((item, index) =>
        check(item).map((finding) => ({
          ...finding,
          path: [key, String(index), ...finding.path],
        })),
      )
    : [{ path: [key], message: "Expected a list." }];
};

const tone = (value: unknown) =>
  choice(value, "tone", ["incoming", "outgoing"]);
const half = (value: unknown) =>
  object(value) && value.half !== undefined
    ? choice(value, "half", ["left", "right"])
    : [];

export const checkRouteOverlayFixture: FixtureCheck = (value) => {
  if (!object(value) || !object(value.ink))
    return [{ path: ["ink"], message: "Expected strokes and tips." }];
  return [
    ...each(value.ink, "strokes", (stroke) => [
      ...tone(stroke),
      ...checkPoints(stroke, "points"),
      ...half(stroke),
    ]),
    ...each(value.ink, "tips", (tip) => [
      ...tone(tip),
      ...half(tip),
      ...(object(tip) &&
      point(tip.from) &&
      point(tip.to) &&
      object(tip.from) &&
      object(tip.to) &&
      (tip.from.x !== tip.to.x || tip.from.y !== tip.to.y)
        ? []
        : [{ path: ["from"], message: "Expected two distinct points." }]),
    ]),
  ].map((finding) => ({ ...finding, path: ["ink", ...finding.path] }));
};
