/**
 * Horizontal positions as a system of difference constraints, the formulation behind Brandes–Köpf
 * compaction. Vertices joined by straight lines share a column; every other rule says how far one
 * point must lie to the right of another. Longest paths over the columns (Bellman–Ford) solve it.
 *
 * A vertex's position is its left edge. A point on it is the left edge plus an offset: a contact,
 * a port or the left edge itself. Columns sit at whole pixels, and points that must line up are
 * compared at whole pixels, so a straight line is exactly straight when drawn.
 */

/** A point on a vertex: its left edge plus `offset`. */
export interface Anchor {
  readonly vertex: string;
  readonly offset: number;
}

/** `to` lies at least `gap` right of `from`; with `whole`, compared at whole pixels. */
export interface Spacing {
  readonly from: Anchor;
  readonly to: Anchor;
  readonly gap: number;
  readonly whole?: boolean;
}

export interface Rules {
  /** Point pairs drawn as one straight vertical line. */
  readonly ties: readonly (readonly [Anchor, Anchor])[];
  readonly spacings: readonly Spacing[];
  /** Least position per vertex. */
  readonly bounds: ReadonlyMap<string, number>;
  /** Vertices with a fixed position. */
  readonly pins: ReadonlyMap<string, number>;
}

export interface Preference {
  /** Where each vertex would rather be. */
  readonly x: ReadonlyMap<string, number>;
  /** How far each vertex reaches right of its position. */
  readonly extent: (vertex: string) => number;
}

/** Rounds to whole pixels, ignoring floating-point noise around halves. */
export const whole = (value: number) =>
  Math.round(Math.round(value * 1024) / 1024);

export interface Columns {
  /** The column a vertex belongs to, and its position relative to that column. */
  readonly of: (vertex: string) => {
    readonly column: string;
    readonly rel: number;
  };
}

/** Joins tied vertices into columns, or `undefined` when two ties in one column disagree. */
export function columnsOf(
  vertices: readonly string[],
  ties: Rules["ties"],
): Columns | undefined {
  const parent = new Map(vertices.map((id) => [id, id]));
  /** Position relative to the parent. */
  const shift = new Map(vertices.map((id) => [id, 0]));
  const find = (id: string): { column: string; rel: number } => {
    let rel = 0;
    let at = id;
    while (parent.get(at) !== at) {
      rel += shift.get(at)!;
      at = parent.get(at)!;
    }
    return { column: at, rel };
  };
  for (const [a, b] of ties) {
    const ra = find(a.vertex);
    const rb = find(b.vertex);
    // x_b + b.offset = x_a + a.offset, with x = column + rel.
    const delta = ra.rel + a.offset - b.offset - rb.rel;
    if (ra.column === rb.column) {
      if (whole(ra.rel + a.offset) !== whole(rb.rel + b.offset))
        return undefined;
      continue;
    }
    parent.set(rb.column, ra.column);
    shift.set(rb.column, delta);
  }
  return { of: find };
}

/**
 * Positions satisfying every rule, or `undefined` when there are none. Without a preference each
 * column takes its least position. With one, each column starts at its preference, within the
 * wider of the least layout and the preferred one. Where that breaks a rule, the result is the
 * midpoint of the least solution above the start and the greatest one below it, so both sides of
 * every broken rule give way equally. Solutions form a convex set, so the midpoint is one too.
 */
export function solve(
  vertices: readonly string[],
  rules: Rules,
  preferred?: Preference,
): ReadonlyMap<string, number> | undefined {
  const columns = columnsOf(vertices, rules.ties);
  if (!columns) return undefined;
  const at = new Map(vertices.map((id) => [id, columns.of(id)]));
  const index = new Map<string, number>();
  for (const { column } of at.values())
    if (!index.has(column)) index.set(column, index.size);
  const n = index.size;
  const col = (id: string) => index.get(at.get(id)!.column)!;
  const rel = (id: string) => at.get(id)!.rel;

  // X[to] - X[from] >= gap, between whole-pixel column positions.
  const edges: [number, number, number][] = [];
  for (const { from, to, gap, whole: exact } of rules.spacings) {
    const a = rel(from.vertex) + from.offset;
    const b = rel(to.vertex) + to.offset;
    const least = Math.ceil(
      (exact ? gap - whole(b) + whole(a) : gap - b + a) - 1e-6,
    );
    if (col(from.vertex) !== col(to.vertex))
      edges.push([col(from.vertex), col(to.vertex), least]);
    else if (least > 0) return undefined;
  }
  const lower = Array.from({ length: n }, () => -Infinity);
  for (const id of vertices) {
    const bound = rules.bounds.get(id);
    if (bound !== undefined)
      lower[col(id)] = Math.max(
        lower[col(id)]!,
        Math.ceil(bound - rel(id) - 1e-6),
      );
  }
  const pinned = new Map<number, number>();
  for (const [id, x] of rules.pins) {
    const value = whole(x - rel(id));
    if ((pinned.get(col(id)) ?? value) !== value) return undefined;
    pinned.set(col(id), value);
  }

  for (const [c, value] of pinned) if (lower[c]! > value) return undefined;
  const lo = lower.map(
    (value, c) => pinned.get(c) ?? (value === -Infinity ? 0 : value),
  );
  if (!relax(lo, edges, "up")) return undefined;
  for (const [c, value] of pinned) if (lo[c] !== value) return undefined;
  const place = (X: readonly number[]) =>
    new Map(vertices.map((id) => [id, X[col(id)]! + rel(id)]));
  if (!preferred) return place(lo);

  // The widest the level may be: its least layout or its preferred one, whichever is wider.
  const right = Math.max(
    ...vertices.map(
      (id) =>
        Math.max(lo[col(id)]! + rel(id), preferred.x.get(id) ?? -Infinity) +
        preferred.extent(id),
    ),
  );
  const hi = Array.from({ length: n }, () => Infinity);
  for (const id of vertices)
    hi[col(id)] = Math.min(
      hi[col(id)]!,
      Math.floor(right - preferred.extent(id) - rel(id) + 1e-6),
    );
  for (const [c, value] of pinned) hi[c] = value;
  relax(hi, edges, "down");

  const sum = new Array<number>(n).fill(0);
  const count = new Array<number>(n).fill(0);
  for (const id of vertices) {
    const x = preferred.x.get(id);
    if (x === undefined) continue;
    sum[col(id)] = sum[col(id)]! + x - rel(id);
    count[col(id)] = count[col(id)]! + 1;
  }
  const start = lo.map((least, c) =>
    count[c]
      ? Math.min(hi[c]!, Math.max(least, Math.round(sum[c]! / count[c]!)))
      : least,
  );
  const above = [...start];
  const below = [...start];
  relax(above, edges, "up");
  relax(below, edges, "down");
  return place(above.map((up, c) => Math.floor((up + below[c]!) / 2)));
}

/**
 * Bellman–Ford over `X[to] - X[from] >= gap`: "up" raises each `to` as far as needed, "down" lowers
 * each `from`. False when the rules contradict each other (a positive cycle).
 */
function relax(
  X: number[],
  edges: readonly (readonly [number, number, number])[],
  direction: "up" | "down",
): boolean {
  for (let pass = 0; pass <= X.length; pass++) {
    let changed = false;
    for (const [from, to, gap] of edges)
      if (direction === "up" && X[from]! + gap > X[to]!) {
        X[to] = X[from]! + gap;
        changed = true;
      } else if (direction === "down" && X[to]! - gap < X[from]!) {
        X[from] = X[to]! - gap;
        changed = true;
      }
    if (!changed) return true;
  }
  return false;
}
