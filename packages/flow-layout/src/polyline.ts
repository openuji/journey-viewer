import type { Point } from "@/types";

/** Drops repeated points and the middle of collinear runs. */
export function simplify(points: readonly Point[]): readonly Point[] {
  const unique = points.filter(
    (point, index) =>
      index === 0 ||
      Math.abs(point.x - points[index - 1]!.x) > 0.5 ||
      Math.abs(point.y - points[index - 1]!.y) > 0.5,
  );
  return unique.filter((point, index) => {
    if (index === 0 || index === unique.length - 1) return true;
    const before = unique[index - 1]!;
    const after = unique[index + 1]!;
    const vertical =
      Math.abs(before.x - point.x) <= 0.5 && Math.abs(point.x - after.x) <= 0.5;
    const horizontal =
      Math.abs(before.y - point.y) <= 0.5 && Math.abs(point.y - after.y) <= 0.5;
    return !vertical && !horizontal;
  });
}
