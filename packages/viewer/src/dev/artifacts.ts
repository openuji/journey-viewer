import { ARRIVAL, MIN_STEP } from "@/flow/geometry";
import type { Point, Rect } from "@/flow/geometry";
import type { Connector, FlowLayout } from "@/flow/compose";

/**
 * Geometry checks for a composed flow. The first five are the artifacts the spike must eliminate;
 * the rest describe layout quality for the engine comparison. Pure; runs in Node and the browser.
 */
export interface ArtifactReport {
  /** Segments that are neither horizontal nor vertical. */
  readonly diagonals: number;
  /** Interior segments shorter than `MIN_STEP`: their rounded corners render as a kink. */
  readonly jogs: number;
  /** Arrowhead ends whose leg after a corner is shorter than `ARRIVAL`: the head sits on the corner. */
  readonly shortArrivals: number;
  /** Segments through a state, card or contract label that is not the connector's own end. */
  readonly throughBoxes: number;
  /** Frame borders crossed, or run along, anywhere other than at a port. */
  readonly borderCrossings: number;
  /** Pairs of connectors that share no end but run along a common segment (metro corridors). */
  readonly overlaps: number;
  /** Total drawn length with shared segments counted once: the ink a reader sees. */
  readonly ink: number;
  /** Distinct straight runs drawn, with shared segments counted once. */
  readonly runs: number;
  readonly crossings: number;
  readonly bends: number;
  readonly connectors: number;
  readonly width: number;
  readonly height: number;
  /** Up to 12 human-readable findings, for debugging. */
  readonly examples: readonly string[];
}

const EPS = 0.5;

type Segment = readonly [Point, Point];

const segmentsOf = (points: readonly Point[]): Segment[] =>
  points.slice(1).map((point, i) => [points[i]!, point] as const);

const vertical = ([a, b]: Segment) => Math.abs(a.x - b.x) <= EPS;
const horizontal = ([a, b]: Segment) => Math.abs(a.y - b.y) <= EPS;
const length = ([a, b]: Segment) => Math.hypot(b.x - a.x, b.y - a.y);
const between = (value: number, a: number, b: number) =>
  value > Math.min(a, b) + EPS && value < Math.max(a, b) - EPS;

/** Whether an axis-aligned segment passes through the open interior of a rectangle. */
function enters(segment: Segment, rect: Rect): boolean {
  const [a, b] = segment;
  const left = rect.x + 1;
  const right = rect.x + rect.width - 1;
  const top = rect.y + 1;
  const bottom = rect.y + rect.height - 1;
  if (vertical(segment))
    return (
      a.x > left &&
      a.x < right &&
      Math.max(a.y, b.y) > top &&
      Math.min(a.y, b.y) < bottom
    );
  if (horizontal(segment))
    return (
      a.y > top &&
      a.y < bottom &&
      Math.max(a.x, b.x) > left &&
      Math.min(a.x, b.x) < right
    );
  return false;
}

/** Points where an axis-aligned segment crosses a rectangle's border, or `null` if it runs along one. */
function borderPoints(segment: Segment, rect: Rect): Point[] | null {
  const [a, b] = segment;
  const x0 = rect.x;
  const x1 = rect.x + rect.width;
  const y0 = rect.y;
  const y1 = rect.y + rect.height;
  if (vertical(segment)) {
    const x = a.x;
    if (x < x0 - EPS || x > x1 + EPS) return [];
    const overlapsSpan =
      Math.max(a.y, b.y) > y0 + EPS && Math.min(a.y, b.y) < y1 - EPS;
    if ((Math.abs(x - x0) <= EPS || Math.abs(x - x1) <= EPS) && overlapsSpan)
      return null;
    return [y0, y1].filter((y) => between(y, a.y, b.y)).map((y) => ({ x, y }));
  }
  if (horizontal(segment)) {
    const y = a.y;
    if (y < y0 - EPS || y > y1 + EPS) return [];
    const overlapsSpan =
      Math.max(a.x, b.x) > x0 + EPS && Math.min(a.x, b.x) < x1 - EPS;
    if ((Math.abs(y - y0) <= EPS || Math.abs(y - y1) <= EPS) && overlapsSpan)
      return null;
    return [x0, x1].filter((x) => between(x, a.x, b.x)).map((x) => ({ x, y }));
  }
  return [];
}

const shareEnd = (a: Connector, b: Connector) =>
  a.from === b.from || a.from === b.to || a.to === b.from || a.to === b.to;

export function measureArtifacts(layout: FlowLayout): ArtifactReport {
  const examples: string[] = [];
  const note = (text: string) => {
    if (examples.length < 12) examples.push(text);
  };
  const segments = new Map(
    layout.connectors.map((c) => [c, segmentsOf(c.points)]),
  );
  let diagonals = 0;
  let jogs = 0;
  let shortArrivals = 0;
  let throughBoxes = 0;
  let borderCrossings = 0;
  let overlaps = 0;
  let crossings = 0;
  let bends = 0;

  const boxes = [
    ...layout.states.map((s) => ({ key: s.key, rect: s.rect })),
    ...layout.cards.map((c) => ({ key: c.key, rect: c.rect })),
    ...layout.contracts.map((c) => ({ key: c.key, rect: c.rect })),
  ];
  const portsOf = new Map<string, Point[]>();
  for (const port of layout.ports)
    portsOf.set(port.frame, [...(portsOf.get(port.frame) ?? []), port.point]);

  // A short step on a longer line that another connector also draws is a junction, not a kink.
  const onBus = (connector: Connector, segment: Segment) =>
    layout.connectors.some(
      (other) =>
        other !== connector &&
        segments
          .get(other)!
          .some(
            (t) =>
              length(t) >= MIN_STEP - 0.01 &&
              ((horizontal(segment) &&
                horizontal(t) &&
                Math.abs(t[0].y - segment[0].y) <= EPS &&
                Math.min(t[0].x, t[1].x) <=
                  Math.min(segment[0].x, segment[1].x) + EPS &&
                Math.max(t[0].x, t[1].x) >=
                  Math.max(segment[0].x, segment[1].x) - EPS) ||
                (vertical(segment) &&
                  vertical(t) &&
                  Math.abs(t[0].x - segment[0].x) <= EPS &&
                  Math.min(t[0].y, t[1].y) <=
                    Math.min(segment[0].y, segment[1].y) + EPS &&
                  Math.max(t[0].y, t[1].y) >=
                    Math.max(segment[0].y, segment[1].y) - EPS)),
          ),
    );
  for (const connector of layout.connectors) {
    const list = segments.get(connector)!;
    bends += Math.max(0, connector.points.length - 2);
    list.forEach((segment, i) => {
      if (!vertical(segment) && !horizontal(segment)) {
        diagonals += 1;
        note(`diagonal in ${connector.key}`);
      }
      const interior = i > 0 && i < list.length - 1;
      if (
        interior &&
        length(segment) < MIN_STEP - 0.01 &&
        !onBus(connector, segment)
      ) {
        jogs += 1;
        note(`jog ${length(segment).toFixed(1)}px in ${connector.key}`);
      }
      const arrives =
        (i === 0 && connector.arrowStart) ||
        (i === list.length - 1 && connector.arrowEnd);
      if (arrives && list.length > 1 && length(segment) < ARRIVAL - 0.01) {
        shortArrivals += 1;
        note(`arrival ${length(segment).toFixed(1)}px in ${connector.key}`);
      }
      for (const box of boxes) {
        if (box.key === connector.from || box.key === connector.to) continue;
        if (enters(segment, box.rect)) {
          throughBoxes += 1;
          note(`${connector.key} crosses ${box.key}`);
        }
      }
      for (const frame of layout.frames) {
        const crossing = borderPoints(segment, frame.rect);
        const ports = portsOf.get(frame.key) ?? [];
        if (crossing === null) {
          borderCrossings += 1;
          note(`${connector.key} runs along ${frame.key}`);
          continue;
        }
        for (const point of crossing)
          if (
            !ports.some(
              (p) =>
                Math.abs(p.x - point.x) <= 2 && Math.abs(p.y - point.y) <= 2,
            )
          ) {
            borderCrossings += 1;
            note(
              `${connector.key} crosses border of ${frame.key} at ${point.x.toFixed(0)},${point.y.toFixed(0)}`,
            );
          }
      }
    });
  }

  const all = layout.connectors;
  for (let i = 0; i < all.length; i++)
    for (let j = i + 1; j < all.length; j++) {
      const a = all[i]!;
      const b = all[j]!;
      const related = shareEnd(a, b);
      let overlapping = false;
      for (const s of segments.get(a)!)
        for (const t of segments.get(b)!) {
          if (!related && !overlapping) {
            if (
              vertical(s) &&
              vertical(t) &&
              Math.abs(s[0].x - t[0].x) <= EPS
            ) {
              const low = Math.max(
                Math.min(s[0].y, s[1].y),
                Math.min(t[0].y, t[1].y),
              );
              const high = Math.min(
                Math.max(s[0].y, s[1].y),
                Math.max(t[0].y, t[1].y),
              );
              if (high - low > 1) overlapping = true;
            } else if (
              horizontal(s) &&
              horizontal(t) &&
              Math.abs(s[0].y - t[0].y) <= EPS
            ) {
              const low = Math.max(
                Math.min(s[0].x, s[1].x),
                Math.min(t[0].x, t[1].x),
              );
              const high = Math.min(
                Math.max(s[0].x, s[1].x),
                Math.max(t[0].x, t[1].x),
              );
              if (high - low > 1) overlapping = true;
            }
          }
          const [v, h] =
            vertical(s) && horizontal(t)
              ? [s, t]
              : vertical(t) && horizontal(s)
                ? [t, s]
                : [];
          if (
            v &&
            h &&
            between(v[0].x, h[0].x, h[1].x) &&
            between(h[0].y, v[0].y, v[1].y)
          )
            crossings += 1;
        }
      if (overlapping) {
        overlaps += 1;
        note(`${a.key} overlaps ${b.key}`);
      }
    }

  const union = (axis: "x" | "y") => {
    // Horizontal runs grouped by y (axis "x" spans), vertical runs grouped by x.
    const groups = new Map<number, [number, number][]>();
    for (const list of segments.values())
      for (const segment of list) {
        const along = axis === "x" ? horizontal(segment) : vertical(segment);
        if (!along || length(segment) < EPS) continue;
        const at = Math.round(axis === "x" ? segment[0].y : segment[0].x);
        const [a, b] =
          axis === "x"
            ? [segment[0].x, segment[1].x]
            : [segment[0].y, segment[1].y];
        groups.set(at, [
          ...(groups.get(at) ?? []),
          [Math.min(a, b), Math.max(a, b)],
        ]);
      }
    let total = 0;
    let count = 0;
    for (const spans of groups.values()) {
      spans.sort((p, q) => p[0] - q[0]);
      let [from, to] = spans[0]!;
      for (const [a, b] of spans.slice(1)) {
        if (a <= to + EPS) to = Math.max(to, b);
        else {
          total += to - from;
          count += 1;
          [from, to] = [a, b];
        }
      }
      total += to - from;
      count += 1;
    }
    return { total, count };
  };
  const horizontalInk = union("x");
  const verticalInk = union("y");
  return {
    ink: Math.round(horizontalInk.total + verticalInk.total),
    runs: horizontalInk.count + verticalInk.count,
    diagonals,
    jogs,
    shortArrivals,
    throughBoxes,
    borderCrossings,
    overlaps,
    crossings,
    bends,
    connectors: layout.connectors.length,
    width: Math.round(layout.width),
    height: Math.round(layout.height),
    examples,
  };
}
