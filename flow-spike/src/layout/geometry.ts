export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/**
 * One journey level: its card, contracts and local vertices. An open composite is an opaque box
 * with fixed ports, already laid out by the composer, so edges never route across its border.
 */
export interface LevelNode {
  readonly id: string;
  readonly kind: "card" | "entry" | "exit" | "state" | "composite" | "frame";
  readonly width: number;
  readonly height: number;
  /** Fixed ports of an open composite, relative to its top-left corner. */
  readonly ports?: readonly LevelPort[];
  /** x of a contract glyph, relative to the node's left edge. */
  readonly anchor?: number;
}

export interface LevelPort {
  readonly id: string;
  readonly side: "top" | "bottom";
  readonly x: number;
}

/** One connector. `forward`/`backward` say which directions its transitions run. */
export interface LevelEdge {
  readonly id: string;
  readonly source: string;
  readonly target: string;
  readonly sourcePort?: string;
  readonly targetPort?: string;
  readonly forward: boolean;
  readonly backward: boolean;
}

export interface LevelInput {
  readonly nodes: readonly LevelNode[];
  readonly edges: readonly LevelEdge[];
}

/** Coordinates are relative to the level's frame: the card sits at (0, 0). */
export interface LevelLayout {
  readonly width: number;
  readonly height: number;
  readonly positions: ReadonlyMap<string, Point>;
  /** Polyline per edge, from its source attachment to its target attachment. */
  readonly routes: ReadonlyMap<string, readonly Point[]>;
  /** Real node ids per layer after ordering (own engine only), for stability checks. */
  readonly layers?: readonly (readonly string[])[];
}

export type LevelEngine = (
  input: LevelInput,
) => LevelLayout | Promise<LevelLayout>;

export const FRAME_PAD = 16;

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
