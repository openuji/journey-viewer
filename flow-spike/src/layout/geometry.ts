import { minimumLengths } from "@journey-viewer/flow-layout";
import type { LayoutOptions, Point } from "@journey-viewer/flow-layout";

export type { Point } from "@journey-viewer/flow-layout";

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export const FRAME_PAD = 16;

/** Corner radius of drawn connectors. */
export const CORNER_RADIUS = 6;

/** Length of an arrowhead, from its tip to its base. */
export const ARROW_LENGTH = 7;

/** Radius of an entry or exit glyph: a connector at a contract stops at its rim. */
export const GLYPH_RADIUS = 5;

/** The drawn sizes every level is laid out for. */
export const drawnSizes: LayoutOptions = {
  cornerRadius: CORNER_RADIUS,
  arrowLength: ARROW_LENGTH,
  padding: FRAME_PAD,
};

/**
 * The engine's guarantees for those sizes: `MIN_STEP` is the shortest leg between two bends that
 * keeps both corners round, `ARRIVAL` the shortest last leg after a bend that keeps the arrowhead
 * off the corner.
 */
export const { step: MIN_STEP, arrival: ARRIVAL } = minimumLengths(drawnSizes);

/**
 * An orthogonal polyline moved `offset` to the right of its direction of travel (to the left when
 * negative). Each leg keeps its side through every corner, so two parallels never cross.
 */
export function parallel(points: readonly Point[], offset: number): Point[] {
  if (offset === 0 || points.length < 2) return [...points];
  const normal = (a: Point, b: Point): Point => {
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
