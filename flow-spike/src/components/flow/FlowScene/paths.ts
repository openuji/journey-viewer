import type { Point } from "@/layout/geometry";
import { ARROW_LENGTH, CORNER_RADIUS, parallel } from "@/layout/geometry";
import { ARROW_WIDTH, HALF_ARROW_WIDTH } from "@/layout/strokes";
import type { Side } from "@/layout/strokes";

/** Direction along one axis; sub-half-pixel deltas count as none. */
const step = (delta: number) => (Math.abs(delta) <= 0.5 ? 0 : Math.sign(delta));

/**
 * An orthogonal polyline with rounded corners. With an `offset` it is drawn that far to the right
 * of its direction of travel (left when negative), as a true parallel: each corner keeps the centre
 * line's corner centre, tighter on the inside of the turn and wider on the outside.
 */
export function roundedPath(
  points: readonly Point[],
  radius = CORNER_RADIUS,
  offset = 0,
): string {
  if (points.length === 0) return "";
  const at = parallel(points, offset);
  let d = `M${at[0]!.x},${at[0]!.y}`;
  for (let i = 1; i < points.length - 1; i++) {
    const previous = points[i - 1]!;
    const corner = points[i]!;
    const next = points[i + 1]!;
    const ux = step(corner.x - previous.x);
    const uy = step(corner.y - previous.y);
    const vx = step(next.x - corner.x);
    const vy = step(next.y - corner.y);
    // Positive for a right turn (screen coordinates), where a right-hand offset is the inside.
    const turn = ux * vy - uy * vx;
    const r = Math.max(
      0,
      Math.min(
        radius,
        Math.hypot(corner.x - previous.x, corner.y - previous.y) / 2,
        Math.hypot(next.x - corner.x, next.y - corner.y) / 2,
      ) -
        turn * offset,
    );
    const c = at[i]!;
    d += ` L${c.x - ux * r},${c.y - uy * r} Q${c.x},${c.y} ${c.x + vx * r},${c.y + vy * r}`;
  }
  const last = at[at.length - 1]!;
  return `${d} L${last.x},${last.y}`;
}

/** The base centre of an arrowhead ending at `to`, and the right-hand normal of its direction. */
const head = (from: Point, to: Point) => {
  const length = Math.hypot(to.x - from.x, to.y - from.y) || 1;
  const direction = {
    x: (to.x - from.x) / length,
    y: (to.y - from.y) / length,
  };
  return {
    base: {
      x: to.x - direction.x * ARROW_LENGTH,
      y: to.y - direction.y * ARROW_LENGTH,
    },
    normal: { x: -direction.y, y: direction.x },
  };
};

/** A small filled arrowhead pointing from `from` to `to`. */
export function arrowPath(from: Point, to: Point): string {
  const { base, normal } = head(from, to);
  return `M${to.x},${to.y} L${base.x + normal.x * ARROW_WIDTH},${base.y + normal.y * ARROW_WIDTH} L${base.x - normal.x * ARROW_WIDTH},${base.y - normal.y * ARROW_WIDTH} Z`;
}

/**
 * Half an arrowhead on one side of the direction of travel: the tip, the wing and the base centre.
 * It sits on the half of a shared line its route keeps to.
 */
export function halfArrowPath(from: Point, to: Point, side: Side): string {
  const { base, normal } = head(from, to);
  const sign = side === "right" ? 1 : -1;
  return `M${to.x},${to.y} L${base.x + normal.x * HALF_ARROW_WIDTH * sign},${base.y + normal.y * HALF_ARROW_WIDTH * sign} L${base.x},${base.y} Z`;
}
