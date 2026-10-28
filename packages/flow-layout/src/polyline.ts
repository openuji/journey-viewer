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

/**
 * Absorbs sub-stroke horizontal steps (< 2px, narrower than a line is wide) left over after
 * placement, by moving the adjacent interior vertical; endpoints never move.
 */
export function straighten(points: readonly Point[]): readonly Point[] {
  const out = points.map((point) => ({ ...point }));
  for (let i = 1; i < out.length - 2; i++) {
    const a = out[i]!;
    const b = out[i + 1]!;
    const step = Math.abs(a.x - b.x);
    if (Math.abs(a.y - b.y) > 0.01 || step < 0.01 || step >= 2) continue;
    // Shift the vertical after the step when it is interior, else the one before it.
    if (i + 2 < out.length - 1) {
      const next = out[i + 2]!;
      if (Math.abs(next.x - b.x) < 0.01) next.x = a.x;
      b.x = a.x;
    } else if (i - 1 > 0) {
      const previous = out[i - 1]!;
      if (Math.abs(previous.x - a.x) < 0.01) previous.x = b.x;
      a.x = b.x;
    }
  }
  return simplify(out);
}
