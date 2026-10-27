import { FRAME_PAD, simplify, straighten } from "@/layout/geometry";
import type {
  LevelEdge,
  LevelInput,
  LevelLayout,
  LevelNode,
  Point,
} from "@/layout/geometry";

/**
 * The spike's own level engine: a small layered (Sugiyama-style) layout, top to bottom, with
 * orthogonal channel routing. It never sees nested content: open composites arrive as fixed-size
 * boxes with fixed ports, so every route stays inside one level by construction.
 */

const GAP = 28;
const DUMMY_GAP = 16;
const FRAME_CLEARANCE = 44;
/** Tracks keep this distance from a frame's top or bottom border, so no line runs along it. */
const FRAME_TRACK_CLEARANCE = 22;
const TRACK = 8;
const MIN_CHANNEL = 28;
const BACK_INSET = 14;
/** Shorter steps render as S-curves once corners are rounded (6px), so they read as kinks. */
const MIN_JOG = 16;
/** Separating unrelated terminals moves one aside by a full step, never into kink range. */
const NUDGE = MIN_JOG;
const SWEEPS = 16;
const PLACEMENT_ROUNDS = 8;

type Kind = LevelNode["kind"] | "dummy" | "lane";
type Side = "top" | "bottom";

interface Vertex {
  readonly id: string;
  readonly kind: Kind;
  readonly width: number;
  readonly height: number;
  readonly index: number;
  readonly node?: LevelNode;
  layer: number;
}

/** Where a path attaches to a vertex: a named port on one side. */
interface Attach {
  readonly vertex: string;
  readonly port: string;
  readonly side: Side;
}

interface Path {
  readonly edge: LevelEdge;
  readonly upper: string;
  readonly lower: string;
  readonly sourceIsUpper: boolean;
  readonly upperAttach: Attach;
  readonly lowerAttach: Attach;
  readonly chain: readonly string[];
  upperLane?: string;
  lowerLane?: string;
}

interface Terminal {
  readonly key: string;
  readonly attach: Attach;
  /** Which boundary of the channel the terminal sits on. */
  readonly boundary: Side;
}

interface Piece {
  readonly key: string;
  readonly channel: number;
  readonly a: Terminal;
  readonly b: Terminal;
  /** Where the paths through this piece start and end, so merges into one place are recognised. */
  readonly ends: Set<string>;
}

const pairKey = (a: string, b: string) => (a < b ? `${a}\n${b}` : `${b}\n${a}`);
const isReal = (vertex: Vertex) =>
  vertex.kind !== "dummy" && vertex.kind !== "lane";

export function layeredLevel(input: LevelInput): LevelLayout {
  const vertices = new Map<string, Vertex>(
    input.nodes.map((node, index) => [
      node.id,
      {
        id: node.id,
        kind: node.kind,
        width: node.width,
        height: node.height,
        index,
        node,
        layer: -1,
      },
    ]),
  );
  const vertex = (id: string) => vertices.get(id)!;
  const edges = input.edges.filter(
    (edge) => vertices.has(edge.source) && vertices.has(edge.target),
  );
  const loops = edges.filter((edge) => edge.source === edge.target);
  const links = edges.filter((edge) => edge.source !== edge.target);

  // 1. Cycle breaking: depth-first in model order, entries first; back edges only flip for layering.
  const directed: [string, string][] = [];
  for (const edge of links) {
    if (edge.forward) directed.push([edge.source, edge.target]);
    if (edge.backward) directed.push([edge.target, edge.source]);
  }
  const successors = new Map<string, string[]>();
  for (const [from, to] of directed) {
    const list = successors.get(from) ?? [];
    if (!list.includes(to)) list.push(to);
    successors.set(from, list);
  }
  const color = new Map<string, 1 | 2>();
  const back = new Set<string>();
  const visit = (start: string) => {
    if (color.has(start)) return;
    const stack: [string, number][] = [[start, 0]];
    color.set(start, 1);
    while (stack.length > 0) {
      const top = stack[stack.length - 1]!;
      const next = successors.get(top[0])?.[top[1]];
      if (next === undefined) {
        color.set(top[0], 2);
        stack.pop();
        continue;
      }
      top[1] += 1;
      const state = color.get(next);
      if (state === 1) back.add(`${top[0]}\n${next}`);
      else if (state === undefined) {
        color.set(next, 1);
        stack.push([next, 0]);
      }
    }
  };
  const ordered = [...vertices.values()];
  ordered.filter((v) => v.kind === "entry").forEach((v) => visit(v.id));
  ordered
    .filter((v) => v.kind !== "exit" && v.kind !== "card")
    .forEach((v) => visit(v.id));
  ordered.filter((v) => v.kind === "exit").forEach((v) => visit(v.id));

  const upperOf = new Map<string, string>();
  for (const [from, to] of directed) {
    const key = pairKey(from, to);
    if (!upperOf.has(key) && !back.has(`${from}\n${to}`))
      upperOf.set(key, from);
  }
  for (const [from, to] of directed) {
    const key = pairKey(from, to);
    if (!upperOf.has(key)) upperOf.set(key, to);
  }

  // 2. Longest-path layering: card and entries on layer 0, exits below everything else.
  const predecessors = new Map<string, string[]>();
  for (const [key, upper] of upperOf) {
    const [a, b] = key.split("\n") as [string, string];
    const lower = a === upper ? b : a;
    predecessors.set(lower, [...(predecessors.get(lower) ?? []), upper]);
  }
  const layerOf = (
    id: string,
    seen: ReadonlySet<string> = new Set(),
  ): number => {
    const v = vertex(id);
    if (v.layer >= 0) return v.layer;
    if (v.kind === "card" || v.kind === "entry") return (v.layer = 0);
    if (seen.has(id)) return 1;
    const inner = new Set(seen).add(id);
    const preds = (predecessors.get(id) ?? []).filter(
      (p) => vertex(p).kind !== "exit",
    );
    v.layer = Math.max(1, ...preds.map((p) => layerOf(p, inner) + 1));
    return v.layer;
  };
  ordered.filter((v) => v.kind !== "exit").forEach((v) => layerOf(v.id));
  // Balancing: a vertex with more outgoing than incoming connections sinks toward its successors
  // (an approximation of network-simplex layering), shortening long connectors.
  const deepest = Math.max(
    0,
    ...ordered.filter((v) => v.kind !== "exit").map((v) => v.layer),
  );
  const successorsOf = new Map<string, string[]>();
  for (const [lower, uppers] of predecessors)
    for (const upper of uppers)
      successorsOf.set(upper, [...(successorsOf.get(upper) ?? []), lower]);
  for (let round = 0; round < 4; round++) {
    let moved = false;
    for (const v of [...ordered].reverse()) {
      if (v.kind === "exit" || v.kind === "card" || v.kind === "entry")
        continue;
      const preds = (predecessors.get(v.id) ?? []).map(vertex);
      const succs = (successorsOf.get(v.id) ?? [])
        .map(vertex)
        .filter((w) => w.kind !== "exit");
      if (
        succs.length + (successorsOf.get(v.id) ?? []).length - succs.length <=
        preds.length
      )
        continue;
      const highest = succs.length
        ? Math.min(...succs.map((w) => w.layer)) - 1
        : deepest;
      if (highest > v.layer) {
        v.layer = highest;
        moved = true;
      }
    }
    if (!moved) break;
  }
  const lastInner = Math.max(
    0,
    ...ordered.filter((v) => v.kind !== "exit").map((v) => v.layer),
  );
  ordered
    .filter((v) => v.kind === "exit")
    .forEach((v) => (v.layer = lastInner + 1));

  // 3. Dummy chains, one per vertex pair: parallel connectors share one trunk.
  const chains = new Map<string, string[]>();
  for (const [key, upper] of upperOf) {
    const [a, b] = key.split("\n") as [string, string];
    const lower = a === upper ? b : a;
    const chain: string[] = [];
    for (
      let layer = vertex(upper).layer + 1;
      layer < vertex(lower).layer;
      layer++
    ) {
      const id = `dummy\n${key}\n${layer}`;
      vertices.set(id, {
        id,
        kind: "dummy",
        width: 0,
        height: 0,
        index: vertex(upper).index + 0.5,
        layer,
      });
      chain.push(id);
    }
    chains.set(key, chain);
  }

  const layerCount =
    Math.max(...[...vertices.values()].map((v) => v.layer)) + 1;
  const layers: string[][] = Array.from({ length: layerCount }, () => []);
  [...vertices.values()]
    .sort((a, b) => a.index - b.index)
    .forEach((v) => layers[v.layer]!.push(v.id));
  const pinCard = () => {
    const first = layers[0]!;
    const card = first.findIndex((id) => vertex(id).kind === "card");
    if (card > 0) first.unshift(...first.splice(card, 1));
  };
  pinCard();

  // 4. Ordering on the vertex-pair graph only, so opening a composite never reorders siblings.
  const orderLinks: [string, string][] = [];
  for (const [key, upper] of upperOf) {
    const [a, b] = key.split("\n") as [string, string];
    const sequence = [upper, ...chains.get(key)!, a === upper ? b : a];
    for (let i = 1; i < sequence.length; i++)
      orderLinks.push([sequence[i - 1]!, sequence[i]!]);
  }
  const above = new Map<string, string[]>();
  const below = new Map<string, string[]>();
  for (const [u, l] of orderLinks) {
    above.set(l, [...(above.get(l) ?? []), u]);
    below.set(u, [...(below.get(u) ?? []), l]);
  }
  const crossings = (order: string[][]) => {
    const position = new Map<string, number>();
    order.forEach((layer) => layer.forEach((id, i) => position.set(id, i)));
    let count = 0;
    for (let layer = 0; layer < order.length - 1; layer++) {
      const between = orderLinks.filter(([u]) => vertex(u).layer === layer);
      for (let i = 0; i < between.length; i++)
        for (let j = i + 1; j < between.length; j++) {
          const [u1, l1] = between[i]!;
          const [u2, l2] = between[j]!;
          const du = position.get(u1)! - position.get(u2)!;
          const dl = position.get(l1)! - position.get(l2)!;
          if (du * dl < 0) count += 1;
        }
    }
    return count;
  };
  let useMedian = false;
  const sweep = (
    layer: number,
    neighbours: Map<string, string[]>,
    reference: number,
  ) => {
    const position = new Map(layers[reference]!.map((id, i) => [id, i]));
    const current = new Map(layers[layer]!.map((id, i) => [id, i]));
    const key = (id: string) => {
      const list = (neighbours.get(id) ?? [])
        .filter((n) => position.has(n))
        .map((n) => position.get(n)!)
        .sort((a, b) => a - b);
      if (list.length === 0) return current.get(id)!;
      if (useMedian)
        return list.length % 2
          ? list[(list.length - 1) / 2]!
          : (list[list.length / 2 - 1]! + list[list.length / 2]!) / 2;
      return list.reduce((sum, n) => sum + n, 0) / list.length;
    };
    const keys = new Map(layers[layer]!.map((id) => [id, key(id)]));
    layers[layer]!.sort(
      (a, b) =>
        keys.get(a)! - keys.get(b)! || current.get(a)! - current.get(b)!,
    );
  };
  const initial = layers.map((layer) => [...layer]);
  let best = layers.map((layer) => [...layer]);
  let bestCrossings = crossings(best);
  for (const median of [false, true]) {
    useMedian = median;
    initial.forEach((layer, i) => (layers[i] = [...layer]));
    for (let round = 0; round < SWEEPS && bestCrossings > 0; round++) {
      for (let layer = 1; layer < layerCount; layer++)
        sweep(layer, above, layer - 1);
      for (let layer = layerCount - 2; layer >= 0; layer--)
        sweep(layer, below, layer + 1);
      pinCard();
      const count = crossings(layers);
      if (count < bestCrossings) {
        best = layers.map((layer) => [...layer]);
        bestCrossings = count;
      }
    }
  }
  best.forEach((layer, i) => (layers[i] = layer));
  // Transpose: swap neighbours while that removes crossings (the card stays first).
  for (let round = 0; round < 4 && bestCrossings > 0; round++) {
    let improved = false;
    for (const layer of layers)
      for (let i = 0; i < layer.length - 1; i++) {
        if (vertex(layer[i]!).kind === "card") continue;
        [layer[i], layer[i + 1]] = [layer[i + 1]!, layer[i]!];
        const count = crossings(layers);
        if (count < bestCrossings) {
          bestCrossings = count;
          improved = true;
        } else [layer[i], layer[i + 1]] = [layer[i + 1]!, layer[i]!];
      }
    if (!improved) break;
  }
  const realLayers = layers.map((layer) =>
    layer.filter((id) => isReal(vertex(id))),
  );

  // 5. Paths and attachments. Ordinary vertices take forward connectors at their centre and
  // returns at a separate inset port; contract glyphs and frame ports are fixed.
  const portOf = (edge: LevelEdge, id: string) =>
    id === edge.source ? edge.sourcePort : edge.targetPort;
  const attach = (
    edge: LevelEdge,
    id: string,
    end: "upper" | "lower",
    downward: boolean,
  ): Attach => {
    const v = vertex(id);
    if (v.kind === "frame") {
      const port = v.node?.ports?.find((p) => p.id === portOf(edge, id));
      return {
        vertex: id,
        port: port?.id ?? "",
        side: port?.side ?? (end === "upper" ? "bottom" : "top"),
      };
    }
    if (v.kind === "entry" || v.kind === "exit")
      return {
        vertex: id,
        port: "anchor",
        side: end === "upper" ? "bottom" : "top",
      };
    return end === "upper"
      ? { vertex: id, port: downward ? "out" : "back-in", side: "bottom" }
      : { vertex: id, port: downward ? "in" : "back-out", side: "top" };
  };
  // Returns attach on the side facing the rest of their path, so they do not cut across forward lines.
  const facing = (path: Path, end: "upper" | "lower"): Attach => {
    const a = end === "upper" ? path.upperAttach : path.lowerAttach;
    if (a.port !== "back-in" && a.port !== "back-out") return a;
    const other =
      end === "upper"
        ? (path.chain[0] ?? path.lower)
        : (path.chain[path.chain.length - 1] ?? path.upper);
    const layerOfA = layers[vertex(a.vertex).layer]!;
    const layerOfOther = layers[vertex(other).layer]!;
    const left =
      layerOfOther.indexOf(other) / Math.max(1, layerOfOther.length - 1) <
      layerOfA.indexOf(a.vertex) / Math.max(1, layerOfA.length - 1);
    return { ...a, port: `${a.port}-${left ? "left" : "right"}` };
  };
  const paths: Path[] = links.map((edge) => {
    const key = pairKey(edge.source, edge.target);
    const upper = upperOf.get(key)!;
    const sourceIsUpper = upper === edge.source;
    const lower = sourceIsUpper ? edge.target : edge.source;
    const downward = sourceIsUpper ? edge.forward : edge.backward;
    return {
      edge,
      upper,
      lower,
      sourceIsUpper,
      upperAttach: attach(edge, upper, "upper", downward),
      lowerAttach: attach(edge, lower, "lower", downward),
      chain: chains.get(key)!,
    };
  });
  for (const path of paths) {
    (path as { upperAttach: Attach }).upperAttach = facing(path, "upper");
    (path as { lowerAttach: Attach }).lowerAttach = facing(path, "lower");
  }

  // 6. Lanes: a frame port on the "wrong" side (a return into an entry, a departure from an exit
  // that climbs) turns in the adjacent channel and passes the frame in a lane beside it.
  let trailingChannel = false;
  const lanes = new Map<string, string>();
  const ratio = (id: string) => {
    const layer = layers[vertex(id).layer]!;
    return (layer.indexOf(id) + 0.5) / layer.length;
  };
  const addLane = (frame: string, toward: string, end: "upper" | "lower") => {
    // One lane per frame side and direction: returns into (or out of) a frame share one trunk.
    const side = ratio(toward) < ratio(frame) ? "left" : "right";
    const key = `${frame}\n${end}\n${side}`;
    const existing = lanes.get(key);
    if (existing) return existing;
    const f = vertex(frame);
    const id = `lane\n${key}`;
    vertices.set(id, {
      id,
      kind: "lane",
      width: 0,
      height: 0,
      index: f.index,
      layer: f.layer,
    });
    const layer = layers[f.layer]!;
    const at = layer.indexOf(frame);
    layer.splice(side === "left" ? at : at + 1, 0, id);
    lanes.set(key, id);
    return id;
  };
  for (const path of paths) {
    if (path.upperAttach.side === "top") {
      const next = path.chain[0] ?? path.lower;
      path.upperLane = addLane(path.upper, next, "upper");
    }
    if (path.lowerAttach.side === "bottom") {
      const previous = path.chain[path.chain.length - 1] ?? path.upper;
      path.lowerLane = addLane(path.lower, previous, "lower");
      if (vertex(path.lower).layer === layerCount - 1) trailingChannel = true;
    }
  }

  // 7. Concentration: neighbouring dummy chains bound for the same port merge into one trunk
  // (and chains leaving the same port stay merged while they remain neighbours), so several
  // connectors into one block never run side by side.
  const attachKey = (a: Attach) => `${a.vertex}@${a.port}`;
  const chainEnds = new Map<
    string,
    { upper: Set<string>; lower: Set<string> }
  >();
  for (const path of paths) {
    if (path.chain.length === 0) continue;
    const key = pairKey(path.upper, path.lower);
    const ends = chainEnds.get(key) ?? {
      upper: new Set<string>(),
      lower: new Set<string>(),
    };
    ends.upper.add(
      path.upperLane ? path.upperLane : attachKey(path.upperAttach),
    );
    ends.lower.add(
      path.lowerLane ? path.lowerLane : attachKey(path.lowerAttach),
    );
    chainEnds.set(key, ends);
  }
  const replacement = new Map<string, string>();
  const resolve = (id: string): string => {
    const next = replacement.get(id);
    return next === undefined ? id : resolve(next);
  };
  // A dummy joins at most one kind of merge: a fan-in trunk never also becomes a fan-out trunk,
  // which would draw an ambiguous bus.
  const merged = new Set<string>();
  const concentrate = (fromLowerEnd: boolean) => {
    const keys = [...chainEnds.keys()];
    const depth = Math.max(0, ...keys.map((k) => chains.get(k)!.length));
    for (let step = 0; step < depth; step++) {
      // Group chains by their shared end and by their already merged neighbour toward that end.
      const groups = new Map<string, string[]>();
      for (const key of keys) {
        const chain = chains.get(key)!;
        const ends = chainEnds.get(key)!;
        const end = fromLowerEnd ? ends.lower : ends.upper;
        if (end.size !== 1 || step >= chain.length) continue;
        const id = chain[fromLowerEnd ? chain.length - 1 - step : step]!;
        if (!fromLowerEnd && merged.has(resolve(id))) continue;
        const toward =
          step === 0
            ? [...end][0]!
            : resolve(chain[fromLowerEnd ? chain.length - step : step - 1]!);
        const group = `${vertex(id).layer}\n${toward}`;
        groups.set(group, [...(groups.get(group) ?? []), id]);
      }
      for (const ids of groups.values()) {
        if (ids.length < 2) continue;
        const layer = layers[vertex(ids[0]!).layer]!;
        const sorted = ids
          .map(resolve)
          .filter((id, i, all) => all.indexOf(id) === i)
          .sort((a, b) => layer.indexOf(a) - layer.indexOf(b));
        // Merge only runs of dummies that are direct neighbours in the layer order.
        let run = [sorted[0]!];
        const flush = () => {
          if (run.length > 1) {
            const keep = run[Math.floor((run.length - 1) / 2)]!;
            merged.add(keep);
            for (const id of run)
              if (id !== keep) {
                replacement.set(id, keep);
                layer.splice(layer.indexOf(id), 1);
              }
          }
        };
        for (const id of sorted.slice(1)) {
          const previous = run[run.length - 1]!;
          const gap = layer.slice(
            layer.indexOf(previous) + 1,
            layer.indexOf(id),
          );
          if (gap.length === 0) run.push(id);
          else {
            flush();
            run = [id];
          }
        }
        flush();
      }
    }
  };
  concentrate(true);
  concentrate(false);
  const concentrated = (chain: readonly string[]) =>
    chain.map(resolve).filter((id, i, all) => i === 0 || all[i - 1] !== id);
  for (const path of paths)
    (path as { chain: readonly string[] }).chain = concentrated(path.chain);

  // 8. Horizontal placement: per layer, weighted isotonic regression towards the median of the
  // neighbouring attachments, alternating downward and upward passes.
  const nudges = new Map<string, number>();
  const offset = (a: Attach) => {
    const v = vertex(a.vertex);
    if (v.kind === "dummy" || v.kind === "lane") return 0;
    if (v.kind === "entry" || v.kind === "exit")
      return v.node?.anchor ?? v.width / 2;
    if (v.kind === "frame")
      return v.node?.ports?.find((p) => p.id === a.port)?.x ?? v.width / 2;
    const base =
      a.port === "out" || a.port === "in"
        ? v.width / 2
        : a.port.endsWith("-left")
          ? BACK_INSET
          : v.width - BACK_INSET;
    return base + (nudges.get(`${a.vertex}@${a.port}`) ?? 0);
  };
  const plain = (id: string): Attach => ({
    vertex: id,
    port: "",
    side: "bottom",
  });
  const sequenceOf = (path: Path): Attach[] => [
    path.upperLane ? plain(path.upperLane) : path.upperAttach,
    ...path.chain.map(plain),
    path.lowerLane ? plain(path.lowerLane) : path.lowerAttach,
  ];
  const alignment: [Attach, Attach][] = [];
  for (const path of paths) {
    const sequence = sequenceOf(path);
    for (let i = 1; i < sequence.length; i++)
      alignment.push([sequence[i - 1]!, sequence[i]!]);
  }
  const x = new Map<string, number>();
  const separation = (left: string, right: string) => {
    const l = vertex(left);
    const r = vertex(right);
    // Lines passing a frame keep a clear distance, so they never read as a second border.
    const gap =
      isReal(l) && isReal(r)
        ? GAP
        : l.kind === "frame" || r.kind === "frame"
          ? FRAME_CLEARANCE
          : DUMMY_GAP;
    return l.width + gap;
  };
  /** Frame padding applies to what is drawn at the edge: a contract's glyph, not its label box. */
  const lowerBound = (id: string) => {
    const v = vertex(id);
    if (v.layer === 0) return 0;
    return v.kind === "exit" ? FRAME_PAD - (v.node?.anchor ?? 0) : FRAME_PAD;
  };
  const pack = (layer: number) => {
    const ids = layers[layer]!;
    ids.forEach((id, i) =>
      x.set(
        id,
        i === 0
          ? Math.max(x.get(id) ?? 0, lowerBound(id))
          : Math.max(
              x.get(id) ?? 0,
              x.get(ids[i - 1]!)! + separation(ids[i - 1]!, id),
            ),
      ),
    );
  };
  for (let layer = 0; layer < layerCount; layer++) pack(layer);
  const place = (layer: number, downward: boolean) => {
    const ids = layers[layer]!;
    if (ids.length === 0) return;
    const offsets: number[] = [0];
    for (let i = 1; i < ids.length; i++)
      offsets.push(offsets[i - 1]! + separation(ids[i - 1]!, ids[i]!));
    const targets: number[] = [];
    const weights: number[] = [];
    ids.forEach((id, i) => {
      if (vertex(id).kind === "card") {
        targets.push(0 - offsets[i]!);
        weights.push(1e6);
        return;
      }
      const wishes = alignment
        .filter(([u, l]) => (downward ? l.vertex === id : u.vertex === id))
        .map(([u, l]) =>
          downward
            ? x.get(u.vertex)! + offset(u) - offset(l)
            : x.get(l.vertex)! + offset(l) - offset(u),
        )
        .sort((a, b) => a - b);
      const median =
        wishes.length === 0
          ? undefined
          : wishes[Math.floor((wishes.length - 1) / 2)]!;
      targets.push((median ?? x.get(id)!) - offsets[i]!);
      weights.push(median === undefined ? 0.01 : wishes.length);
    });
    const blocks: { weight: number; sum: number; count: number }[] = [];
    targets.forEach((target, i) => {
      blocks.push({ weight: weights[i]!, sum: weights[i]! * target, count: 1 });
      while (blocks.length > 1) {
        const last = blocks[blocks.length - 1]!;
        const previous = blocks[blocks.length - 2]!;
        if (previous.sum / previous.weight <= last.sum / last.weight) break;
        blocks.splice(-2, 2, {
          weight: previous.weight + last.weight,
          sum: previous.sum + last.sum,
          count: previous.count + last.count,
        });
      }
    });
    let i = 0;
    for (const block of blocks)
      for (let k = 0; k < block.count; k++, i++)
        x.set(ids[i]!, block.sum / block.weight + offsets[i]!);
    ids.forEach((id, k) =>
      x.set(
        id,
        k === 0
          ? Math.max(x.get(id)!, lowerBound(id))
          : Math.max(
              x.get(id)!,
              x.get(ids[k - 1]!)! + separation(ids[k - 1]!, id),
            ),
      ),
    );
  };
  for (let round = 0; round < PLACEMENT_ROUNDS; round++) {
    for (let layer = 1; layer < layerCount; layer++) place(layer, true);
    for (let layer = layerCount - 2; layer >= 0; layer--) place(layer, false);
  }
  for (let layer = 1; layer < layerCount; layer++) place(layer, true);

  // Whole pixels: equal attachments are exactly equal, so straight lines stay straight when drawn.
  const attachX = (a: Attach) => Math.round(x.get(a.vertex)! + offset(a));
  const rawX = (a: Attach) => x.get(a.vertex)! + offset(a);
  const canMove = (id: string, dx: number) => {
    const v = vertex(id);
    if (v.kind === "card") return false;
    const layer = layers[v.layer]!;
    const i = layer.indexOf(id);
    const next = x.get(id)! + dx;
    const left = layer[i - 1];
    const right = layer[i + 1];
    return (
      next >= lowerBound(id) - 0.01 &&
      (left === undefined ||
        x.get(left)! + separation(left, id) <= next + 0.01) &&
      (right === undefined ||
        next + separation(id, right) <= x.get(right)! + 0.01)
    );
  };

  // 9. Channel pieces. A dummy or lane is one terminal per channel; real vertices attach at ports.
  const terminalKey = (a: Attach) =>
    isReal(vertex(a.vertex)) ? `${a.vertex}@${a.port}` : a.vertex;
  const pieces = new Map<string, Piece>();
  const pathPieces = new Map<Path, Piece[]>();
  const addPiece = (path: Path, channel: number, a: Terminal, b: Terminal) => {
    const key = `${channel}|${[a.key + a.boundary, b.key + b.boundary].sort().join("|")}`;
    const piece = pieces.get(key) ?? {
      key,
      channel,
      a,
      b,
      ends: new Set<string>(),
    };
    piece.ends.add(`from ${path.upperAttach.vertex}@${path.upperAttach.port}`);
    piece.ends.add(`to ${path.lowerAttach.vertex}@${path.lowerAttach.port}`);
    pieces.set(key, piece);
    pathPieces.set(path, [...(pathPieces.get(path) ?? []), piece]);
  };
  for (const path of paths) {
    const sequence = sequenceOf(path);
    if (path.upperLane) {
      const lane = plain(path.upperLane);
      addPiece(
        path,
        vertex(path.upper).layer - 1,
        {
          key: terminalKey(path.upperAttach),
          attach: path.upperAttach,
          boundary: "bottom",
        },
        { key: terminalKey(lane), attach: lane, boundary: "bottom" },
      );
    }
    for (let i = 1; i < sequence.length; i++) {
      const u = sequence[i - 1]!;
      const l = sequence[i]!;
      addPiece(
        path,
        vertex(u.vertex).layer,
        { key: terminalKey(u), attach: u, boundary: "top" },
        { key: terminalKey(l), attach: l, boundary: "bottom" },
      );
    }
    if (path.lowerLane) {
      const lane = plain(path.lowerLane);
      addPiece(
        path,
        vertex(path.lower).layer,
        { key: terminalKey(lane), attach: lane, boundary: "top" },
        {
          key: terminalKey(path.lowerAttach),
          attach: path.lowerAttach,
          boundary: "top",
        },
      );
    }
  }
  const allPieces = [...pieces.values()];

  // 10. Remove near-misses that would draw tiny jogs, then separate unrelated terminals that share
  // an x: one net would otherwise appear to continue into another.
  const move = (id: string, dx: number) => x.set(id, x.get(id)! + dx);
  const touching = (id: string) =>
    allPieces.filter(
      (p) => p.a.attach.vertex === id || p.b.attach.vertex === id,
    );
  const portKey = (a: Attach) => `${a.vertex}@${a.port}`;
  const opposite = (p: Piece) => p.a.boundary !== p.b.boundary;
  const gapOf = (p: Piece) =>
    Math.abs(attachX(p.a.attach) - attachX(p.b.attach));
  /** A straight run of dummies and lanes through `id`, which can move sideways as one column. */
  const column = (id: string): string[] => {
    if (isReal(vertex(id))) return [id];
    const run = new Set([id]);
    const grow = (from: string) => {
      for (const p of touching(from)) {
        if (!opposite(p) || gapOf(p) > 0.5) continue;
        const other =
          p.a.attach.vertex === from ? p.b.attach.vertex : p.a.attach.vertex;
        if (!isReal(vertex(other)) && !run.has(other)) {
          run.add(other);
          grow(other);
        }
      }
    };
    grow(id);
    return [...run];
  };
  /** Unrelated terminals sharing an x across a channel, which would read as one continuing line. */
  /**
   * Unrelated terminals sharing an x across a channel would read as one continuing line. Lines that
   * start or end at the same place may join: that join is the truth.
   */
  const conflicts = (channel: number): [Attach, Attach][] => {
    const inChannel = allPieces.filter((p) => p.channel === channel);
    const connected = new Set(inChannel.map((p) => `${p.a.key}\n${p.b.key}`));
    const tops = new Map<string, { attach: Attach; ends: Set<string> }>();
    const bottoms = new Map<string, { attach: Attach; ends: Set<string> }>();
    for (const p of inChannel)
      for (const t of [p.a, p.b]) {
        const side = t.boundary === "top" ? tops : bottoms;
        const entry = side.get(t.key) ?? {
          attach: t.attach,
          ends: new Set<string>(),
        };
        p.ends.forEach((end) => entry.ends.add(end));
        side.set(t.key, entry);
      }
    const found: [Attach, Attach][] = [];
    for (const [topKey, top] of tops)
      for (const [bottomKey, bottom] of bottoms) {
        if (
          topKey === bottomKey ||
          Math.abs(attachX(top.attach) - attachX(bottom.attach)) >= 3
        )
          continue;
        if (connected.has(`${topKey}\n${bottomKey}`)) continue;
        if ([...top.ends].some((end) => bottom.ends.has(end))) continue;
        found.push([top.attach, bottom.attach]);
      }
    return found;
  };
  const coincides = (channel: number) => conflicts(channel).length > 0;
  /** Whether a set of vertices can move together; neighbours outside the set must keep their gap. */
  const canMoveAll = (ids: readonly string[], dx: number) => {
    const set = new Set(ids);
    return ids.every((id) => {
      const v = vertex(id);
      if (v.kind === "card") return false;
      const layer = layers[v.layer]!;
      const i = layer.indexOf(id);
      const next = x.get(id)! + dx;
      const left = layer[i - 1];
      const right = layer[i + 1];
      return (
        next >= lowerBound(id) - 0.01 &&
        (left === undefined ||
          set.has(left) ||
          x.get(left)! + separation(left, id) <= next + 0.01) &&
        (right === undefined ||
          set.has(right) ||
          next + separation(id, right) <= x.get(right)! + 0.01)
      );
    });
  };
  /** Adds the neighbours a move would collide with, so a tight row shifts as one. */
  const pushed = (ids: readonly string[], dx: number) => {
    const set = new Set(ids);
    for (const id of ids) {
      const layer = layers[vertex(id).layer]!;
      let i = layer.indexOf(id);
      let edge = x.get(id)! + dx;
      for (;;) {
        const neighbour = layer[dx > 0 ? i + 1 : i - 1];
        if (neighbour === undefined || set.has(neighbour)) break;
        const fits =
          dx > 0
            ? edge + separation(layer[i]!, neighbour) <=
              x.get(neighbour)! + 0.01
            : x.get(neighbour)! + separation(neighbour, layer[i]!) <=
              edge + 0.01;
        if (fits) break;
        set.add(neighbour);
        edge = x.get(neighbour)! + dx;
        i += dx > 0 ? 1 : -1;
      }
    }
    return [...set];
  };
  /** Applies a candidate change, keeping it only if no line becomes a jog and no straight line bends. */
  const attempt = (
    target: Piece,
    moves: readonly string[],
    dx: number,
    port?: Attach,
    goal: "straight" | "wide" = "straight",
  ): boolean => {
    if (!canMoveAll(moves, dx)) return false;
    if (port) {
      const v = vertex(port.vertex);
      const next = offset(port) + dx;
      if (
        (v.kind !== "state" && v.kind !== "composite") ||
        next < 8 ||
        next > v.width - 8
      )
        return false;
    }
    const affected = new Set<Piece>();
    for (const id of moves) touching(id).forEach((p) => affected.add(p));
    if (port)
      touching(port.vertex)
        .filter(
          (p) =>
            portKey(p.a.attach) === portKey(port) ||
            portKey(p.b.attach) === portKey(port),
        )
        .forEach((p) => affected.add(p));
    const before = new Map([...affected].map((p) => [p, gapOf(p)]));
    for (const id of moves) move(id, dx);
    if (port) nudges.set(portKey(port), (nudges.get(portKey(port)) ?? 0) + dx);
    const ok =
      [...affected].every((p) => {
        if (!opposite(p)) return true;
        const gap = gapOf(p);
        if (p === target)
          return goal === "straight" ? gap <= 0.5 : gap >= MIN_JOG - 0.01;
        if (before.get(p)! <= 0.5) return gap <= 0.5;
        return gap <= 0.5 || gap >= MIN_JOG - 0.01;
      }) && ![...new Set([...affected].map((p) => p.channel))].some(coincides);
    if (ok) return true;
    for (const id of moves) move(id, -dx);
    if (port) nudges.set(portKey(port), (nudges.get(portKey(port)) ?? 0) - dx);
    return false;
  };
  /** When a step cannot be aligned, make it a deliberate step of at least MIN_JOG. */
  const widen = (piece: Piece, dx: number) => {
    const more = Math.sign(dx) * (MIN_JOG - Math.abs(dx));
    return (
      attempt(piece, column(piece.b.attach.vertex), -more, undefined, "wide") ||
      attempt(piece, column(piece.a.attach.vertex), more, undefined, "wide") ||
      attempt(piece, [], more, piece.a.attach, "wide") ||
      attempt(piece, [], -more, piece.b.attach, "wide") ||
      attempt(
        piece,
        pushed(column(piece.b.attach.vertex), -more),
        -more,
        undefined,
        "wide",
      ) ||
      attempt(
        piece,
        pushed(column(piece.a.attach.vertex), more),
        more,
        undefined,
        "wide",
      )
    );
  };
  const snap = () => {
    let changed = false;
    for (const piece of allPieces) {
      if (!opposite(piece)) continue;
      if (gapOf(piece) <= 0.5 || gapOf(piece) >= MIN_JOG - 0.01) continue;
      // Move by the unrounded distance; the result is judged on whole pixels.
      const dx = rawX(piece.a.attach) - rawX(piece.b.attach);
      const fixed =
        attempt(piece, column(piece.b.attach.vertex), dx) ||
        attempt(piece, column(piece.a.attach.vertex), -dx) ||
        attempt(piece, [], dx, piece.b.attach) ||
        attempt(piece, [], -dx, piece.a.attach) ||
        attempt(piece, pushed(column(piece.b.attach.vertex), dx), dx) ||
        attempt(piece, pushed(column(piece.a.attach.vertex), -dx), -dx) ||
        widen(piece, dx);
      if (fixed) changed = true;
    }
    return changed;
  };
  const nudge = (a: Attach): boolean => {
    const v = vertex(a.vertex);
    if (v.kind === "dummy" || v.kind === "lane") {
      for (const dx of [NUDGE, -NUDGE, 2 * NUDGE, -2 * NUDGE])
        if (canMove(v.id, dx)) {
          move(v.id, dx);
          return true;
        }
      return false;
    }
    if (v.kind === "state" || v.kind === "composite") {
      const key = `${a.vertex}@${a.port}`;
      const current = nudges.get(key) ?? 0;
      for (const dx of [NUDGE, -NUDGE, 2 * NUDGE, -2 * NUDGE]) {
        const next = offset(a) + dx;
        if (next >= 8 && next <= v.width - 8) {
          nudges.set(key, current + dx);
          return true;
        }
      }
    }
    return false;
  };
  const separate = () => {
    let changed = false;
    for (let channel = 0; channel < layerCount; channel++)
      for (const [top, bottom] of conflicts(channel))
        if (nudge(bottom) || nudge(top)) changed = true;
    return changed;
  };
  // Separation first; snapping never re-creates a coincidence, so the two converge.
  for (let round = 0; round < 8; round++) {
    const separated = separate();
    const snapped = snap();
    if (!snapped && !separated) break;
  }

  // 11. Nets and tracks. Pieces sharing a top terminal form a fan-out comb; remaining pieces
  // sharing a bottom terminal form a fan-in comb. Nets never merge transitively beyond that.
  const channelCount = layerCount - 1 + (trailingChannel ? 1 : 0);
  const trackY = new Map<Piece, number>();
  const channelHeight: number[] = [];
  const straight = (p: Piece) =>
    p.a.boundary !== p.b.boundary &&
    Math.abs(attachX(p.a.attach) - attachX(p.b.attach)) <= 0.5;
  for (let channel = 0; channel < channelCount; channel++) {
    const inChannel = allPieces.filter((p) => p.channel === channel);
    const parent = new Map<Piece, Piece>(inChannel.map((p) => [p, p]));
    const find = (p: Piece): Piece =>
      parent.get(p) === p ? p : find(parent.get(p)!);
    const unite = (a: Piece, b: Piece) => parent.set(find(a), find(b));
    const byTop = new Map<string, Piece>();
    for (const p of inChannel)
      for (const t of [p.a, p.b].filter((t) => t.boundary === "top")) {
        const seen = byTop.get(t.key);
        if (seen) unite(p, seen);
        else byTop.set(t.key, p);
      }
    const size = new Map<Piece, number>();
    for (const p of inChannel) size.set(find(p), (size.get(find(p)) ?? 0) + 1);
    const byBottom = new Map<string, Piece>();
    for (const p of inChannel) {
      if (size.get(find(p))! > 1) continue;
      for (const t of [p.a, p.b].filter((t) => t.boundary === "bottom")) {
        const seen = byBottom.get(t.key);
        if (seen && size.get(find(seen))! <= 1) unite(p, seen);
        else if (!seen) byBottom.set(t.key, p);
      }
    }
    const nets = new Map<Piece, Piece[]>();
    for (const p of inChannel)
      nets.set(find(p), [...(nets.get(find(p)) ?? []), p]);
    const routed = [...nets.values()]
      .map((members) => {
        const bent = members.filter((p) => !straight(p));
        const xs = bent.flatMap((p) => [
          attachX(p.a.attach),
          attachX(p.b.attach),
        ]);
        const terminals = members.flatMap((p) => [p.a, p.b]);
        const tops = terminals
          .filter((t) => t.boundary === "top")
          .map((t) => attachX(t.attach));
        const bottoms = terminals
          .filter((t) => t.boundary === "bottom")
          .map((t) => attachX(t.attach));
        const mean = (values: number[]) =>
          values.reduce((s, v) => s + v, 0) / Math.max(1, values.length);
        const top = tops.length ? mean(tops) : mean(xs);
        const bottom = bottoms.length ? mean(bottoms) : mean(xs);
        return {
          members,
          bent,
          tops,
          bottoms,
          from: Math.min(...xs),
          to: Math.max(...xs),
          top,
          rightward: bottom > top,
        };
      })
      .filter((net) => net.bent.length > 0)
      .sort((a, b) =>
        a.rightward !== b.rightward
          ? a.rightward
            ? -1
            : 1
          : a.rightward
            ? b.top - a.top
            : a.top - b.top,
      );
    // Where one net starts at an x and another ends at the same x (two connectors merging into a
    // shared trunk), the starting net must turn first, or its line would seem to continue.
    const above = new Map(routed.map((net) => [net, new Set<typeof net>()]));
    for (const upper of routed)
      for (const lower of routed)
        if (
          upper !== lower &&
          upper.tops.some((t) => lower.bottoms.some((b) => Math.abs(t - b) < 3))
        )
          above.get(lower)!.add(upper);
    type Net = (typeof routed)[number];
    const assign = (order: readonly Net[]) => {
      const tracks: { from: number; to: number }[][] = [];
      const trackOf = new Map<Net, number>();
      const pending = [...order];
      while (pending.length > 0) {
        const index = Math.max(
          0,
          pending.findIndex((net) =>
            [...above.get(net)!].every(
              (u) => trackOf.has(u) || !pending.includes(u),
            ),
          ),
        );
        const net = pending.splice(index, 1)[0]!;
        let track = Math.max(
          0,
          ...[...above.get(net)!]
            .filter((u) => trackOf.has(u))
            .map((u) => trackOf.get(u)! + 1),
        );
        while (
          tracks[track]?.some(
            (span) => net.from - TRACK < span.to && span.from < net.to + TRACK,
          )
        )
          track += 1;
        (tracks[track] ??= []).push({ from: net.from, to: net.to });
        trackOf.set(net, track);
      }
      return { tracks, trackOf };
    };
    // Drawn crossings inside this channel for one assignment: verticals against other nets' tracks.
    const straightPieces = inChannel
      .filter(straight)
      .map((p) => attachX(p.a.attach));
    const cost = ({ trackOf }: ReturnType<typeof assign>) => {
      let count = 0;
      for (const [a, ta] of trackOf) {
        for (const [b, tb] of trackOf) {
          if (a === b) continue;
          for (const x of a.tops)
            if (x > b.from + 0.5 && x < b.to - 0.5 && tb < ta) count += 1;
          for (const x of a.bottoms)
            if (x > b.from + 0.5 && x < b.to - 0.5 && tb > ta) count += 1;
        }
        for (const x of straightPieces)
          if (x > a.from + 0.5 && x < a.to - 0.5) count += 1;
      }
      return count;
    };
    const candidates = [
      routed,
      [...routed].reverse(),
      [...routed].sort((a, b) => a.from - b.from),
      [...routed].sort((a, b) => b.to - a.to),
      [...routed].sort((a, b) => a.to - a.from - (b.to - b.from)),
    ].map(assign);
    const chosen = candidates.reduce((best, next) =>
      cost(next) < cost(best) ? next : best,
    );
    const tracks = chosen.tracks;
    const assigned = new Map<Piece, number>();
    for (const [net, track] of chosen.trackOf)
      for (const p of net.members) assigned.set(p, track);
    const frameAbove =
      layers[channel]?.some((id) => vertex(id).kind === "frame") ?? false;
    const frameBelow =
      layers[channel + 1]?.some((id) => vertex(id).kind === "frame") ?? false;
    const padTop = frameAbove ? FRAME_TRACK_CLEARANCE : TRACK;
    const padBottom = frameBelow ? FRAME_TRACK_CLEARANCE : TRACK;
    const height = Math.max(
      MIN_CHANNEL,
      padTop + padBottom + Math.max(0, tracks.length - 1) * TRACK,
    );
    channelHeight.push(height);
    const first =
      padTop +
      (height - padTop - padBottom - Math.max(0, tracks.length - 1) * TRACK) /
        2;
    for (const [p, track] of assigned) trackY.set(p, first + track * TRACK);
  }

  // 12. Vertical placement: nodes top-aligned in their layer; exits bottom-aligned on the border.
  const layerHeight = layers.map((ids) =>
    Math.max(0, ...ids.map((id) => vertex(id).height)),
  );
  const layerTop: number[] = [];
  let cursor = 0;
  for (let layer = 0; layer < layerCount; layer++) {
    layerTop.push(cursor);
    cursor +=
      layerHeight[layer]! + (layer < channelCount ? channelHeight[layer]! : 0);
  }
  const channelTop = (channel: number) =>
    layerTop[channel]! + layerHeight[channel]!;
  const y = (id: string) => {
    const v = vertex(id);
    return v.kind === "exit"
      ? layerTop[v.layer]! + layerHeight[v.layer]! - v.height
      : layerTop[v.layer]!;
  };
  const attachY = (t: Terminal, channel: number) => {
    const v = vertex(t.attach.vertex);
    if (!isReal(v))
      return t.boundary === "top"
        ? channelTop(channel)
        : (layerTop[channel + 1] ??
            channelTop(channel) + channelHeight[channel]!);
    return t.attach.side === "bottom" ? y(v.id) + v.height : y(v.id);
  };

  const routes = new Map<string, readonly Point[]>();
  for (const path of paths) {
    const points: Point[] = [];
    for (const p of pathPieces.get(path) ?? []) {
      const ordered =
        p.a.boundary === p.b.boundary
          ? sequenceStart(points, p, attachX)
          : [p.a, p.b];
      const [first, second] = ordered as [Terminal, Terminal];
      const x1 = attachX(first.attach);
      const x2 = attachX(second.attach);
      const y1 = attachY(first, p.channel);
      const y2 = attachY(second, p.channel);
      if (straight(p)) points.push({ x: x1, y: y1 }, { x: x2, y: y2 });
      else {
        const ty = channelTop(p.channel) + trackY.get(p)!;
        points.push(
          { x: x1, y: y1 },
          { x: x1, y: ty },
          { x: x2, y: ty },
          { x: x2, y: y2 },
        );
      }
    }
    const route = straighten(simplify(points));
    routes.set(path.edge.id, path.sourceIsUpper ? route : [...route].reverse());
  }
  for (const edge of loops) {
    const v = vertex(edge.source);
    const left = x.get(v.id)! + v.width;
    const top = y(v.id);
    routes.set(edge.id, [
      { x: left, y: top + v.height * 0.3 },
      { x: left + 12, y: top + v.height * 0.3 },
      { x: left + 12, y: top + v.height * 0.7 },
      { x: left, y: top + v.height * 0.7 },
    ]);
  }

  const positions = new Map<string, Point>();
  for (const v of vertices.values())
    if (isReal(v)) positions.set(v.id, { x: x.get(v.id)!, y: y(v.id) });
  const right = Math.max(
    ...layers
      .flat()
      .map(
        (id) =>
          x.get(id)! +
          vertex(id).width +
          (loops.some((e) => e.source === id) ? 12 : 0),
      ),
  );
  const exits = [...vertices.values()].some((v) => v.kind === "exit");
  const bottom = layerTop[layerCount - 1]! + layerHeight[layerCount - 1]!;
  return {
    width: right + FRAME_PAD,
    height: exits
      ? bottom
      : bottom +
        (trailingChannel ? channelHeight[channelCount - 1]! : FRAME_PAD),
    positions,
    routes,
    layers: realLayers,
  };
}

/**
 * A U-turn piece joins two terminals on the same boundary. Its direction follows the path: the
 * terminal the path already reached comes first.
 */
function sequenceStart(
  points: readonly Point[],
  piece: Piece,
  attachX: (a: Attach) => number,
): [Terminal, Terminal] {
  const last = points[points.length - 1];
  if (!last)
    return piece.a.attach.port ? [piece.a, piece.b] : [piece.b, piece.a];
  return Math.abs(attachX(piece.a.attach) - last.x) <=
    Math.abs(attachX(piece.b.attach) - last.x)
    ? [piece.a, piece.b]
    : [piece.b, piece.a];
}
