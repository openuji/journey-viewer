import type { Point } from "@/layout/geometry";

/** Direction along one axis; sub-half-pixel deltas count as none. */
const step = (delta: number) => (Math.abs(delta) <= 0.5 ? 0 : Math.sign(delta));

/** An orthogonal polyline with rounded corners. */
export function roundedPath(points: readonly Point[], radius = 6): string {
  if (points.length === 0) return "";
  let d = `M${points[0]!.x},${points[0]!.y}`;
  for (let i = 1; i < points.length - 1; i++) {
    const previous = points[i - 1]!;
    const corner = points[i]!;
    const next = points[i + 1]!;
    const r = Math.min(
      radius,
      Math.hypot(corner.x - previous.x, corner.y - previous.y) / 2,
      Math.hypot(next.x - corner.x, next.y - corner.y) / 2,
    );
    const ux = step(corner.x - previous.x);
    const uy = step(corner.y - previous.y);
    const vx = step(next.x - corner.x);
    const vy = step(next.y - corner.y);
    d += ` L${corner.x - ux * r},${corner.y - uy * r} Q${corner.x},${corner.y} ${corner.x + vx * r},${corner.y + vy * r}`;
  }
  const last = points[points.length - 1]!;
  return `${d} L${last.x},${last.y}`;
}

/** A small filled arrowhead (7 × 3.6) pointing from `from` to `to`. */
export function arrowPath(from: Point, to: Point): string {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const length = 7;
  const half = 3.6;
  const bx = to.x - Math.cos(angle) * length;
  const by = to.y - Math.sin(angle) * length;
  return `M${to.x},${to.y} L${bx - Math.sin(angle) * half},${by + Math.cos(angle) * half} L${bx + Math.sin(angle) * half},${by - Math.cos(angle) * half} Z`;
}
