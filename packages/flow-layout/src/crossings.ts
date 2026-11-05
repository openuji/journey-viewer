/**
 * Crossings between neighbouring layers, for the ordering step of the level layout. Both functions
 * only read an ordering and return a number, so the ordering can try a swap without making it.
 */

/** A connection between consecutive layers: the vertex above, then the vertex below. */
export type OrderLink = readonly [upper: string, lower: string];

/** Vertices layer by layer, left to right. */
export type Order = readonly (readonly string[])[];

/** Where each vertex stands within its layer. */
export type Positions = ReadonlyMap<string, number>;

/** The vertices a vertex connects to on the layer above and on the layer below. */
export interface Neighbours {
  readonly above: ReadonlyMap<string, readonly string[]>;
  readonly below: ReadonlyMap<string, readonly string[]>;
}

export const positionsOf = (order: Order): Map<string, number> =>
  new Map(order.flatMap((layer) => layer.map((id, i) => [id, i] as const)));

/**
 * Pairs of connections that cross. `byLayer[k]` holds the links between layers `k` and `k + 1`,
 * and only links of one layer pair can cross.
 */
export function countCrossings(
  byLayer: readonly (readonly OrderLink[])[],
  position: Positions,
): number {
  let count = 0;
  for (const links of byLayer) {
    // Each end is looked up once per link, not once per pair of links.
    const upper = links.map(([u]) => position.get(u)!);
    const lower = links.map(([, l]) => position.get(l)!);
    for (let i = 0; i < links.length; i++)
      for (let j = i + 1; j < links.length; j++)
        if ((upper[i]! - upper[j]!) * (lower[i]! - lower[j]!) < 0) count += 1;
  }
  return count;
}

/** What swapping the neighbours on one side changes: a pair crosses before, or after, never both. */
const sideGain = (
  left: readonly string[] = [],
  right: readonly string[] = [],
  position: Positions,
) => {
  let gain = 0;
  for (const x of left)
    for (const y of right) {
      const side = position.get(x)! - position.get(y)!;
      if (side < 0) gain += 1;
      else if (side > 0) gain -= 1;
    }
  return gain;
};

/**
 * The change in `countCrossings` when `left` and `right`, standing next to each other on one layer
 * with `left` first, trade places: negative when the swap removes crossings. Only pairs made of one
 * connection of each vertex can change, and the layers around them do not move.
 */
export function swapGain(
  left: string,
  right: string,
  { above, below }: Neighbours,
  position: Positions,
): number {
  return (
    sideGain(above.get(left), above.get(right), position) +
    sideGain(below.get(left), below.get(right), position)
  );
}
