export interface Point {
  readonly x: number;
  readonly y: number;
}

/**
 * What a node is in its level:
 * - `header`: pinned at the level's top-left corner, (0, 0), such as the title of the frame the
 *   level is drawn in.
 * - `entry`: a contact on the level's top border, in the first layer beside the header. Its line
 *   leaves from its bottom edge at `anchor`.
 * - `exit`: a contact on the level's bottom border, in the last layer. Its line arrives at its top
 *   edge at `anchor`.
 * - `block`: an ordinary box. It has one contact point per side, at the centre of its top and
 *   bottom edges unless an aligned-left column moves it.
 * - `frame`: an opaque box with fixed `ports`, such as nested content laid out beforehand. Lines
 *   meet it only at its ports and keep clear of its border elsewhere.
 */
export type LevelNodeKind = "header" | "entry" | "exit" | "block" | "frame";

export interface LevelNode {
  readonly id: string;
  /** Defaults to `block`. */
  readonly kind?: LevelNodeKind;
  readonly width: number;
  readonly height: number;
  /** A frame's fixed ports, relative to its top-left corner. */
  readonly ports?: readonly LevelPort[];
  /** x of an entry's or exit's contact, relative to the node's left edge. Defaults to the centre. */
  readonly anchor?: number;
}

export interface LevelPort {
  readonly id: string;
  readonly side: "top" | "bottom";
  /** Relative to the frame's left edge. */
  readonly x: number;
  /**
   * How far outside the border the line stops, for a mark drawn on the border at the port (the rim
   * of a glyph). Routes end there, and keep their full arrival room after it. Defaults to 0.
   */
  readonly inset?: number;
}

/**
 * One connector between two nodes. Several connectors between the same pair of nodes share one
 * trunk. `forward` and `backward` say in which directions it is travelled, source to target and
 * target to source; they decide which way it runs down the layers.
 */
export interface LevelEdge {
  readonly id: string;
  readonly source: string;
  readonly target: string;
  /** A port id of a frame source. */
  readonly sourcePort?: string;
  /** A port id of a frame target. */
  readonly targetPort?: string;
  /** Defaults to `true`. */
  readonly forward?: boolean;
  /** Defaults to `false`. */
  readonly backward?: boolean;
}

export interface LevelInput {
  readonly nodes: readonly LevelNode[];
  readonly edges: readonly LevelEdge[];
}

/** Coordinates are relative to the level's frame: the header sits at (0, 0). */
export interface LevelLayout {
  readonly width: number;
  readonly height: number;
  /** Top-left corner of every node. */
  readonly positions: ReadonlyMap<string, Point>;
  /** Orthogonal polyline per edge, from its source to its target. */
  readonly routes: ReadonlyMap<string, readonly Point[]>;
  /** Node ids per layer, top to bottom, in their order across the layer. */
  readonly layers: readonly (readonly string[])[];
}

/**
 * How a level places its blocks across. `median` puts each one under the median of its
 * connections, for the fewest bends. The aligned placements stack each block in a column under
 * one neighbour and pack the columns to the left: `aligned-center` lines up a column's centres,
 * `aligned-left` its left edges.
 */
export type Placement = "median" | "aligned-center" | "aligned-left";
