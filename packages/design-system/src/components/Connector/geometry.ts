/** A point on a flow canvas, in CSS pixels from its top-left corner. */
export interface FlowPoint {
  readonly x: number;
  readonly y: number;
}

/**
 * The sizes the flow primitives draw. A layout engine must reserve room for them: a corner needs
 * `cornerRadius` of leg on each side and an arrowhead `arrowLength` of straight line before it.
 */
export const flowGeometry = Object.freeze({
  /** Corner radius of drawn connectors and routes. */
  cornerRadius: 6,
  /** Length of an arrowhead, from its tip to its base. */
  arrowLength: 7,
  /** Half the base of a full arrowhead. */
  arrowWidth: 3.6,
  /** The base of half an arrowhead, a little wider so it reads beside the other half's line. */
  halfArrowWidth: 4.4,
  /** Width of an active route; two halves of a shared stretch fill it together. */
  routeWidth: 2.4,
  /** Radius of an entry or exit glyph: a connector at a contract stops at its rim. */
  glyphRadius: 5,
  /** The glyph's centre from the contract's leading edge. */
  glyphCentre: 7,
});

/** A half's centre line lies a quarter of the full width off the corridor's, so two halves fill it. */
export const halfOffset = flowGeometry.routeWidth / 4;

/**
 * An orthogonal polyline moved `offset` to the right of its direction of travel (to the left when
 * negative). Each leg keeps its side through every corner, so two parallels never cross.
 */
export function parallel(
  points: readonly FlowPoint[],
  offset: number,
): FlowPoint[] {
  if (offset === 0 || points.length < 2) return [...points];
  const normal = (a: FlowPoint, b: FlowPoint): FlowPoint => {
    const length = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    return { x: -(b.y - a.y) / length, y: (b.x - a.x) / length };
  };
  return points.map((point, i) => {
    const before = i > 0 ? normal(points[i - 1]!, point) : undefined;
    const after =
      i < points.length - 1 ? normal(point, points[i + 1]!) : undefined;
    // At a corner both legs' shifts apply; on a straight joint the shared one applies once.
    const turns =
      before &&
      after &&
      Math.abs(before.x * after.x + before.y * after.y) < 0.5;
    const shift = turns
      ? { x: before.x + after.x, y: before.y + after.y }
      : (before ?? after)!;
    return { x: point.x + shift.x * offset, y: point.y + shift.y * offset };
  });
}

/** Direction along one axis; sub-half-pixel deltas count as none. */
const step = (delta: number) => (Math.abs(delta) <= 0.5 ? 0 : Math.sign(delta));

/**
 * An orthogonal polyline with rounded corners. With an `offset` it is drawn that far to the right
 * of its direction of travel (left when negative), as a true parallel: each corner keeps the centre
 * line's corner centre, tighter on the inside of the turn and wider on the outside.
 */
export function roundedPath(
  points: readonly FlowPoint[],
  offset = 0,
  radius: number = flowGeometry.cornerRadius,
): string {
  if (points.length === 0) return "";
  const at = parallel(points, offset);
  const corners = points.slice(1, -1).map((corner, index) => {
    const previous = points[index]!;
    const next = points[index + 2]!;
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
    const c = at[index + 1]!;
    return ` L${c.x - ux * r},${c.y - uy * r} Q${c.x},${c.y} ${c.x + vx * r},${c.y + vy * r}`;
  });
  const last = at[at.length - 1]!;
  return `M${at[0]!.x},${at[0]!.y}${corners.join("")} L${last.x},${last.y}`;
}

/** The base centre of an arrowhead ending at `to`, and the right-hand normal of its direction. */
const head = (from: FlowPoint, to: FlowPoint) => {
  const length = Math.hypot(to.x - from.x, to.y - from.y) || 1;
  const direction = {
    x: (to.x - from.x) / length,
    y: (to.y - from.y) / length,
  };
  return {
    base: {
      x: to.x - direction.x * flowGeometry.arrowLength,
      y: to.y - direction.y * flowGeometry.arrowLength,
    },
    normal: { x: -direction.y, y: direction.x },
  };
};

/** A small filled arrowhead pointing from `from` to `to`. */
export function arrowPath(from: FlowPoint, to: FlowPoint): string {
  const { base, normal } = head(from, to);
  const width = flowGeometry.arrowWidth;
  return `M${to.x},${to.y} L${base.x + normal.x * width},${base.y + normal.y * width} L${base.x - normal.x * width},${base.y - normal.y * width} Z`;
}

/**
 * Half an arrowhead on one side of the direction of travel: the tip, the wing and the base centre.
 * It sits on the half of a shared line its route keeps to.
 */
export function halfArrowPath(
  from: FlowPoint,
  to: FlowPoint,
  side: "left" | "right",
): string {
  const { base, normal } = head(from, to);
  const width = flowGeometry.halfArrowWidth * (side === "right" ? 1 : -1);
  return `M${to.x},${to.y} L${base.x + normal.x * width},${base.y + normal.y * width} L${base.x},${base.y} Z`;
}
