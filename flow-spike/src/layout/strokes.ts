import type { Point } from "@/layout/geometry";
import { ARROW_LENGTH, CORNER_RADIUS, parallel } from "@/layout/geometry";
import type { Connector } from "@/layout/compose";
import type { ActiveRoute, End } from "@/model/presentation";

export type RouteTone = "incoming" | "outgoing";
/** A side relative to the direction of travel. */
export type Side = "left" | "right";

/**
 * A run of one active route, in its direction of travel. A run alone on its stretch is drawn at
 * full width on the corridor's centre line. Where an arrival and a departure share a stretch, each
 * keeps to one half of the same width, on the same side of its travel through every corner.
 */
export interface RouteStroke {
  readonly tone: RouteTone;
  readonly points: readonly Point[];
  /** Set on a shared stretch: the half this route keeps to. */
  readonly half?: Side;
}

/** An arrowhead where a route arrives; half of one, on its route's half, when the stretch is shared. */
export interface RouteTip {
  readonly tone: RouteTone;
  readonly from: Point;
  readonly to: Point;
  readonly half?: Side;
  /** Every arrival here resolves through a child journey's default entry. */
  readonly viaDefault: boolean;
}

export interface ActiveInk {
  readonly strokes: readonly RouteStroke[];
  readonly tips: readonly RouteTip[];
}

export const ROUTE_WIDTH = 2.4;
/** A half's centre line lies a quarter of the full width off the corridor's, so two halves fill it. */
export const HALF_OFFSET = ROUTE_WIDTH / 4;
/** Half the base of a full arrowhead; its length is a layout input (`ARROW_LENGTH`). */
export const ARROW_WIDTH = 3.6;
/** The base of half an arrowhead, a little wider so it reads beside the other half's line. */
export const HALF_ARROW_WIDTH = 4.4;

const EPS = 0.5;

type Span = readonly [number, number];
interface Line {
  readonly vertical: boolean;
  readonly at: number;
}
interface Route {
  readonly tone: RouteTone;
  /** In the direction of travel, ending where it arrives. */
  readonly path: readonly Point[];
  readonly connector: Connector;
  readonly end: End;
}
/** A stretch of a line, between junctions, that an arrival and a departure both use. */
interface Stretch {
  readonly key: string;
  readonly lo: number;
  readonly hi: number;
}
/** A straight piece of a route, on one stretch or on none. */
interface Piece {
  from: Point;
  to: Point;
  readonly stretch: number | undefined;
  /** With the stretch's choice: whether this piece keeps to the right of its travel. */
  readonly flip: number;
}

const lineOf = (a: Point, b: Point): Line | undefined =>
  Math.abs(a.x - b.x) <= EPS
    ? { vertical: true, at: Math.round(a.x * 2) / 2 }
    : Math.abs(a.y - b.y) <= EPS
      ? { vertical: false, at: Math.round(a.y * 2) / 2 }
      : undefined;
const along = (p: Point, line: Line) => (line.vertical ? p.y : p.x);
const spanOf = (a: Point, b: Point, line: Line): Span => {
  const [p, q] = [along(a, line), along(b, line)];
  return [Math.min(p, q), Math.max(p, q)];
};
const keyOf = (line: Line) => `${line.vertical ? "x" : "y"}${line.at}`;
const same = (p: Point, q: Point) =>
  Math.abs(p.x - q.x) < 0.01 && Math.abs(p.y - q.y) < 0.01;
const distance = (p: Point, q: Point) => Math.hypot(q.x - p.x, q.y - p.y);
/** Positive for a right turn at `b` (screen coordinates, y down), negative for a left one. */
const turn = (a: Point, b: Point, c: Point) =>
  Math.sign((b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x));
const toward = (from: Point, to: Point, length: number): Point => {
  const total = distance(from, to) || 1;
  return {
    x: from.x + ((to.x - from.x) / total) * length,
    y: from.y + ((to.y - from.y) / total) * length,
  };
};

const union = (spans: readonly Span[]): Span[] => {
  const sorted = [...spans].sort((p, q) => p[0] - q[0]);
  const out: [number, number][] = [];
  for (const [from, to] of sorted) {
    const last = out[out.length - 1];
    if (last && from <= last[1] + EPS) last[1] = Math.max(last[1], to);
    else out.push([from, to]);
  }
  return out;
};
const intersect = (left: readonly Span[], right: readonly Span[]): Span[] => {
  const out: Span[] = [];
  for (const [a, b] of left)
    for (const [c, d] of right) {
      const from = Math.max(a, c);
      const to = Math.min(b, d);
      if (to - from > EPS) out.push([from, to]);
    }
  return out;
};

/** Stretches that both tones use, cut wherever any active route turns, joins, leaves or ends. */
function sharedStretches(travelled: readonly Route[]): Stretch[] {
  const byLine = new Map<
    string,
    { line: Line; incoming: Span[]; outgoing: Span[] }
  >();
  for (const { tone, path } of travelled)
    for (let i = 1; i < path.length; i++) {
      const line = lineOf(path[i - 1]!, path[i]!);
      if (!line) continue;
      const entry = byLine.get(keyOf(line)) ?? {
        line,
        incoming: [],
        outgoing: [],
      };
      entry[tone].push(spanOf(path[i - 1]!, path[i]!, line));
      byLine.set(keyOf(line), entry);
    }
  const stretches: Stretch[] = [];
  for (const [key, { line, incoming, outgoing }] of byLine) {
    const junctions = travelled
      .flatMap(({ path }) => path)
      .filter((p) => Math.abs((line.vertical ? p.x : p.y) - line.at) <= EPS)
      .map((p) => along(p, line));
    for (const [lo, hi] of union(intersect(union(incoming), union(outgoing)))) {
      const cuts = [
        lo,
        ...junctions.filter((at) => at > lo + EPS && at < hi - EPS),
        hi,
      ].sort((a, b) => a - b);
      for (let i = 1; i < cuts.length; i++)
        if (cuts[i]! - cuts[i - 1]! > EPS)
          stretches.push({ key, lo: cuts[i - 1]!, hi: cuts[i]! });
    }
  }
  return stretches;
}

/** A route as straight pieces, cut at stretch boundaries. */
function piecesOf(route: Route, stretches: readonly Stretch[]): Piece[] {
  const pieces: Piece[] = [];
  const { path, tone } = route;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1]!;
    const b = path[i]!;
    const line = lineOf(a, b);
    const cuts: Point[] = [a, b];
    const onLine = line ? stretches.filter((s) => s.key === keyOf(line)) : [];
    if (line)
      for (const at of onLine.flatMap((s) => [s.lo, s.hi])) {
        const [min, max] = spanOf(a, b, line);
        if (at > min + EPS && at < max - EPS)
          cuts.push(line.vertical ? { x: a.x, y: at } : { x: at, y: a.y });
      }
    cuts.sort((p, q) => distance(a, p) - distance(a, q));
    for (let k = 1; k < cuts.length; k++) {
      const from = cuts[k - 1]!;
      const to = cuts[k]!;
      if (distance(from, to) < 0.01) continue;
      const middle =
        line && along({ x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 }, line);
      const index = line
        ? stretches.findIndex(
            (s) => s.key === keyOf(line) && middle! > s.lo && middle! < s.hi,
          )
        : -1;
      // Arrivals take the stretch's chosen half and departures the other; seen from the route,
      // that half is to the right of travel or to the left depending on its direction.
      const forward = line ? along(to, line) > along(from, line) : true;
      const rightIsPositive = line?.vertical ? !forward : forward;
      pieces.push({
        from,
        to,
        stretch: index >= 0 ? index : undefined,
        flip: 1 ^ Number(tone === "outgoing") ^ Number(rightIsPositive),
      });
    }
  }
  return pieces;
}

const offsetOf = (half: Side | undefined) =>
  half === "right" ? HALF_OFFSET : half === "left" ? -HALF_OFFSET : 0;
const vertical = (a: Point, b: Point) => Math.abs(a.x - b.x) < 0.01;
const inside = (v: number, p: number, q: number, margin: number) =>
  v > Math.min(p, q) + margin && v < Math.max(p, q) - margin;
/** Whether a vertical and a horizontal segment cross inside both. */
const cross = (a: Point, b: Point, c: Point, d: Point, margin: number) => {
  if (vertical(a, b) === vertical(c, d)) return false;
  const [v, w, h, k] = vertical(a, b) ? [a, b, c, d] : [c, d, a, b];
  return inside(v.x, h.x, k.x, margin) && inside(h.y, v.y, w.y, margin);
};

/**
 * Where an arrival's ink crosses a departure's, other than where the corridors themselves cross:
 * the crossings a choice of halves causes at junctions.
 */
function crossings(strokes: readonly RouteStroke[]): number {
  const drawn = strokes.map((stroke) => {
    const ink = parallel(stroke.points, offsetOf(stroke.half));
    const xs = ink.map((p) => p.x);
    const ys = ink.map((p) => p.y);
    return {
      stroke,
      ink,
      box: [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)],
    };
  });
  let count = 0;
  for (const a of drawn) {
    if (a.stroke.tone !== "incoming") continue;
    for (const b of drawn) {
      if (
        b.stroke.tone !== "outgoing" ||
        a.box[1]! < b.box[0]! - 1 ||
        b.box[1]! < a.box[0]! - 1 ||
        a.box[3]! < b.box[2]! - 1 ||
        b.box[3]! < a.box[2]! - 1
      )
        continue;
      for (let i = 1; i < a.ink.length; i++)
        for (let j = 1; j < b.ink.length; j++)
          if (
            cross(a.ink[i - 1]!, a.ink[i]!, b.ink[j - 1]!, b.ink[j]!, 0.05) &&
            !cross(
              a.stroke.points[i - 1]!,
              a.stroke.points[i]!,
              b.stroke.points[j - 1]!,
              b.stroke.points[j]!,
              1,
            )
          )
            count++;
    }
  }
  return count;
}

/** Strokes and arrowheads for a choice of halves (per stretch: 1 when the arrival takes +x/+y). */
function draw(
  split: readonly { route: Route; pieces: readonly Piece[] }[],
  chosen: readonly number[],
): ActiveInk {
  const halfOf = (piece: Piece): Side | undefined =>
    piece.stretch === undefined
      ? undefined
      : chosen[piece.stretch]! ^ piece.flip
        ? "right"
        : "left";
  const strokes: RouteStroke[] = [];
  const seen = new Set<string>();
  const tips = new Map<string, RouteTip>();
  for (const { route, pieces } of split) {
    const { path } = route;
    const arrival = pieces[pieces.length - 1];
    const tipHalf = arrival && halfOf(arrival);
    // Half a pixel under the head, so no seam shows between line and arrowhead.
    const kept = pieces.map((p) => ({ ...p }));
    let remaining = ARROW_LENGTH - 0.5;
    while (remaining > 0 && kept.length > 0) {
      const last = kept[kept.length - 1]!;
      const length = distance(last.from, last.to);
      if (length <= remaining) {
        kept.pop();
        remaining -= length;
      } else {
        last.to = toward(last.to, last.from, remaining);
        remaining = 0;
      }
    }
    const runs: { half: Side | undefined; points: Point[] }[] = [];
    for (const piece of kept) {
      const half = halfOf(piece);
      const last = runs[runs.length - 1];
      if (last && last.half === half) last.points.push(piece.to);
      else runs.push({ half, points: [piece.from, piece.to] });
    }
    // Where a route turns onto or off a shared stretch, its full-width line keeps the corner, so it
    // stays rounded, and runs on a little under the halves, which are drawn on top.
    for (let i = 1; i < runs.length; i++) {
      const before = runs[i - 1]!;
      const after = runs[i]!;
      if ((before.half === undefined) === (after.half === undefined)) continue;
      const joint = before.points[before.points.length - 1]!;
      const k = path.findIndex((p) => same(p, joint));
      if (k <= 0 || k >= path.length - 1) continue;
      if (turn(path[k - 1]!, joint, path[k + 1]!) === 0) continue;
      const [full, along] = before.half
        ? [after, before.points[before.points.length - 2]!]
        : [before, after.points[1]!];
      const moved = toward(
        joint,
        along,
        Math.min(2 * CORNER_RADIUS, distance(joint, along) / 2),
      );
      if (before.half) full.points.unshift(moved);
      else full.points.push(moved);
    }
    // Same-tone routes along one corridor draw once.
    for (const { half, points } of runs) {
      if (points.length < 2) continue;
      const key = `${route.tone}|${half}|${points.map((p) => `${p.x},${p.y}`).join(" ")}`;
      if (seen.has(key)) continue;
      seen.add(key);
      strokes.push({ tone: route.tone, points, ...(half ? { half } : {}) });
    }

    // One arrowhead per arrival, halved on its route's half where its last stretch is shared.
    // Arrivals meeting at one point from one direction share it; it stays hollow only if all of
    // them use a default entry.
    const to = path[path.length - 1]!;
    const from = path[path.length - 2]!;
    const into =
      route.end === "end"
        ? route.connector.bundle?.forward
        : route.connector.bundle?.backward;
    const viaDefault =
      (into?.length ?? 0) > 0 && into!.every((t) => t.viaDefault);
    const key = `${route.tone}|${to.x},${to.y}|${Math.sign(to.x - from.x)},${Math.sign(to.y - from.y)}|${tipHalf ?? "full"}`;
    const previous = tips.get(key);
    tips.set(key, {
      tone: route.tone,
      from,
      to,
      ...(tipHalf ? { half: tipHalf } : {}),
      viaDefault: previous ? previous.viaDefault && viaDefault : viaDefault,
    });
  }
  // Halves over full-width lines: where a full line keeps a corner, the other route's half covers it.
  return {
    strokes: [
      ...strokes.filter((s) => !s.half),
      ...strokes.filter((s) => s.half),
    ],
    tips: [...tips.values()],
  };
}

/**
 * For each stretch, which physical half the arrival takes. A route keeps its half from one stretch
 * to the next (stretches it links move together), and the linked groups then take the halves that
 * leave the fewest crossings where routes join and part. Ties keep to the right of travel.
 */
function chooseHalves(
  split: readonly { route: Route; pieces: readonly Piece[] }[],
  count: number,
): number[] {
  const pairs: [number, number, number][] = [];
  const bias: [number, number][] = [];
  for (const { pieces } of split)
    pieces.forEach((piece, i) => {
      if (piece.stretch === undefined) return;
      bias.push([piece.stretch, 1 ^ piece.flip]);
      const next = pieces[i + 1];
      if (next?.stretch !== undefined && next.stretch !== piece.stretch)
        pairs.push([piece.stretch, next.stretch, piece.flip ^ next.flip]);
    });

  const parent = Array.from({ length: count }, (_, i) => i);
  const parity = Array.from({ length: count }, () => 0);
  const find = (i: number): [number, number] => {
    let p = 0;
    while (parent[i] !== i) {
      p ^= parity[i]!;
      i = parent[i]!;
    }
    return [i, p];
  };
  for (const [a, b, wanted] of pairs) {
    const [ra, pa] = find(a);
    const [rb, pb] = find(b);
    if (ra === rb) continue;
    parent[rb] = ra;
    parity[rb] = pa ^ pb ^ wanted;
  }
  const group = Array.from({ length: count }, () => 0);
  const values = () =>
    Array.from({ length: count }, (_, i) => {
      const [root, p] = find(i);
      return group[root]! ^ p;
    });
  // A route that switches halves between stretches crosses the other one there too.
  const cost = () => {
    const chosen = values();
    return (
      crossings(draw(split, chosen).strokes) +
      pairs.filter(([a, b, wanted]) => (chosen[a]! ^ chosen[b]!) !== wanted)
        .length +
      0.001 * bias.filter(([s, wanted]) => chosen[s] !== wanted).length
    );
  };
  const roots = [...new Set(group.map((_, i) => find(i)[0]))];
  for (const root of roots) {
    // Start from keeping to the right.
    const members = bias.filter(([s]) => find(s)[0] === root);
    const right = members.filter(
      ([s, wanted]) => (find(s)[1] ^ 0) === wanted,
    ).length;
    group[root] = right * 2 >= members.length ? 0 : 1;
  }
  let best = cost();
  for (let pass = 0; pass < 4 && best >= 1; pass++) {
    let improved = false;
    for (const root of roots) {
      group[root] = group[root]! ^ 1;
      const next = cost();
      if (next < best - 1e-9) {
        best = next;
        improved = true;
      } else group[root] = group[root]! ^ 1;
    }
    if (!improved) break;
  }
  return values();
}

/**
 * Geometry for the active step's routes, computed from the composed connectors and the routes the
 * highlight assigns them. Pure and deterministic; drawing and colours are the renderer's.
 */
export function activeStrokes(
  connectors: readonly Connector[],
  routes: ReadonlyMap<string, ActiveRoute>,
): ActiveInk {
  const travelled: Route[] = [];
  for (const connector of connectors) {
    const route = routes.get(connector.key);
    if (!route || connector.points.length < 2) continue;
    for (const tone of ["incoming", "outgoing"] as const)
      for (const end of route[tone])
        travelled.push({
          tone,
          connector,
          end,
          path:
            end === "end" ? connector.points : [...connector.points].reverse(),
        });
  }
  const stretches = sharedStretches(travelled);
  const split = travelled.map((route) => ({
    route,
    pieces: piecesOf(route, stretches),
  }));
  return draw(split, chooseHalves(split, stretches.length));
}
