import { resolveOptions } from "@/options";
import type { LayoutOptions } from "@/options";
import { simplify, straighten } from "@/polyline";
import type {
  LevelEdge,
  LevelInput,
  LevelLayout,
  LevelNode,
  LevelNodeKind,
  Point,
} from "@/types";

/**
 * A small layered (Sugiyama-style) layout of one level, top to bottom, with orthogonal channel
 * routing. It never sees nested content: frames arrive as fixed-size boxes with fixed ports, so
 * every route stays inside one level by construction.
 */

const SWEEPS = 16;
const PLACEMENT_ROUNDS = 8;

type Kind = LevelNodeKind | "dummy" | "lane";
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
}

const pairKey = (a: string, b: string) => (a < b ? `${a}\n${b}` : `${b}\n${a}`);
const isReal = (vertex: Vertex) =>
  vertex.kind !== "dummy" && vertex.kind !== "lane";

export function layoutLevel(
  input: LevelInput,
  options: LayoutOptions = {},
): LevelLayout {
  const o = resolveOptions(options);
  const vertices = new Map<string, Vertex>(
    input.nodes.map((node, index) => [
      node.id,
      {
        id: node.id,
        kind: node.kind ?? "block",
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
    if (edge.forward ?? true) directed.push([edge.source, edge.target]);
    if (edge.backward ?? false) directed.push([edge.target, edge.source]);
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
    .filter((v) => v.kind !== "exit" && v.kind !== "header")
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
    if (v.kind === "header" || v.kind === "entry") return (v.layer = 0);
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
      if (v.kind === "exit" || v.kind === "header" || v.kind === "entry")
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
    const card = first.findIndex((id) => vertex(id).kind === "header");
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
        if (vertex(layer[i]!).kind === "header") continue;
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

  // 5. Paths and attachments. Ordinary vertices have one contact point per side, top centre and
  // bottom centre, for arrivals and departures alike; contract glyphs and frame ports are fixed.
  const portOf = (edge: LevelEdge, id: string) =>
    id === edge.source ? edge.sourcePort : edge.targetPort;
  const attach = (
    edge: LevelEdge,
    id: string,
    end: "upper" | "lower",
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
      ? { vertex: id, port: "out", side: "bottom" }
      : { vertex: id, port: "in", side: "top" };
  };
  const paths: Path[] = links.map((edge) => {
    const key = pairKey(edge.source, edge.target);
    const upper = upperOf.get(key)!;
    const sourceIsUpper = upper === edge.source;
    const lower = sourceIsUpper ? edge.target : edge.source;
    return {
      edge,
      upper,
      lower,
      sourceIsUpper,
      upperAttach: attach(edge, upper, "upper"),
      lowerAttach: attach(edge, lower, "lower"),
      chain: chains.get(key)!,
    };
  });

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

  // 7. Corridors, metro style: neighbouring dummy chains and frame lanes in a layer share one line. At rest a
  // corridor carries several connectors; activating a block draws its own routes on top of it.
  const replacement = new Map<string, string>();
  for (const layer of layers) {
    let start = 0;
    while (start < layer.length) {
      if (isReal(vertex(layer[start]!))) {
        start += 1;
        continue;
      }
      let end = start;
      while (end + 1 < layer.length && !isReal(vertex(layer[end + 1]!)))
        end += 1;
      const run = layer.slice(start, end + 1);
      const keep = run[Math.floor((run.length - 1) / 2)]!;
      for (const id of run) if (id !== keep) replacement.set(id, keep);
      layer.splice(start, run.length, keep);
      start += 1;
    }
  }
  const merged = (id: string) => replacement.get(id) ?? id;
  for (const path of paths) {
    (path as { chain: readonly string[] }).chain = path.chain.map(merged);
    if (path.upperLane) path.upperLane = merged(path.upperLane);
    if (path.lowerLane) path.lowerLane = merged(path.lowerLane);
  }

  // 8. Horizontal placement. Median: per layer, weighted isotonic regression towards the median of
  // the neighbouring attachments, alternating downward and upward passes. Aligned: columns (below).
  /** Contact points that are not at a block's centre: a left-aligned column's shared line. */
  const contact = new Map<string, number>();
  const offset = (a: Attach) => {
    const v = vertex(a.vertex);
    if (v.kind === "dummy" || v.kind === "lane") return 0;
    if (v.kind === "entry" || v.kind === "exit")
      return v.node?.anchor ?? v.width / 2;
    if (v.kind === "frame")
      return v.node?.ports?.find((p) => p.id === a.port)?.x ?? v.width / 2;
    // States and composites have one contact point per side, at its centre unless a column sets it.
    return contact.get(v.id) ?? v.width / 2;
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
  /** A self-loop is drawn beside its block's right edge, one arrival wide. */
  const loopWidth = (id: string) =>
    loops.some((edge) => edge.source === id) ? o.arrival : 0;
  const separation = (left: string, right: string) => {
    const l = vertex(left);
    const r = vertex(right);
    // Lines passing a frame keep a clear distance, so they never read as a second border.
    const gap =
      isReal(l) && isReal(r)
        ? o.blockSpacing
        : l.kind === "frame" || r.kind === "frame"
          ? o.frameLineSpacing
          : o.lineSpacing;
    return l.width + loopWidth(left) + gap;
  };
  /** Frame padding applies to what is drawn at the edge: a contract's glyph, not its label box. */
  const lowerBound = (id: string) => {
    const v = vertex(id);
    if (v.layer === 0) return 0;
    return v.kind === "exit" ? o.padding - (v.node?.anchor ?? 0) : o.padding;
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
      if (vertex(id).kind === "header") {
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
  /**
   * Brandes–Köpf vertical alignment, upward and to the left: each vertex joins the column of its
   * median upper neighbour, a block preferring the blocks directly above it, unless that crosses a
   * column already formed. Members keep their offsets within a column, so its connectors are
   * straight; the columns are then packed to the left as units.
   */
  const alignColumns = (left: boolean) => {
    const position = new Map<string, number>();
    layers.forEach((ids) => ids.forEach((id, i) => position.set(id, i)));
    // One pair per attachment. The card stays at (0, 0) and the entries beside it on the border, so
    // neither anchors a column: their connectors turn into the columns below.
    const uppers = new Map<string, [Attach, Attach][]>();
    for (const [u, l] of alignment) {
      if (vertex(u.vertex).layer === 0) continue;
      const list = uppers.get(l.vertex) ?? [];
      if (
        !list.some(
          ([a, b]) =>
            a.vertex === u.vertex && a.port === u.port && b.port === l.port,
        )
      )
        list.push([u, l]);
      uppers.set(l.vertex, list);
    }
    const root = new Map<string, string>();
    const link = new Map<string, [Attach, Attach]>();
    layers.forEach((ids) => ids.forEach((id) => root.set(id, id)));
    for (let layer = 1; layer < layerCount; layer++) {
      let reach = -1;
      for (const id of layers[layer]!) {
        // A block joins a block directly above it when it has one; corridors bend around columns.
        const all = uppers.get(id) ?? [];
        const blocks = isReal(vertex(id))
          ? all.filter(([u]) => isReal(vertex(u.vertex)))
          : [];
        const candidates = (blocks.length > 0 ? blocks : all).sort(
          ([a], [b]) => position.get(a.vertex)! - position.get(b.vertex)!,
        );
        const d = candidates.length;
        for (const m of new Set([
          Math.floor((d - 1) / 2),
          Math.ceil((d - 1) / 2),
        ])) {
          const pair = candidates[m];
          if (!pair || link.has(id)) continue;
          const at = position.get(pair[0].vertex)!;
          if (at <= reach) continue;
          root.set(id, root.get(pair[0].vertex)!);
          link.set(id, pair);
          reach = at;
        }
      }
    }
    // A left-aligned column's states and composites share one contact line: the narrowest one's
    // centre, which lies inside every member.
    if (left) {
      const block = (id: string) => vertex(id).kind === "block";
      const narrowest = new Map<string, number>();
      for (const [id, r] of root)
        if (block(id))
          narrowest.set(
            r,
            Math.min(narrowest.get(r) ?? Infinity, vertex(id).width / 2),
          );
      for (const [id, r] of root)
        if (block(id)) contact.set(id, narrowest.get(r)!);
    }
    const rel = new Map<string, number>();
    for (const ids of layers)
      for (const id of ids) {
        const pair = link.get(id);
        rel.set(
          id,
          pair
            ? rel.get(pair[0].vertex)! + offset(pair[0]) - offset(pair[1])
            : 0,
        );
      }

    // Longest path over the columns, left to right: each keeps its separation from the column to
    // its left in every layer they share, and the frame padding.
    const least = new Map<string, number>();
    const right = new Map<string, [string, number][]>();
    for (const ids of layers)
      ids.forEach((id, i) => {
        const r = root.get(id)!;
        least.set(
          r,
          Math.max(least.get(r) ?? -Infinity, lowerBound(id) - rel.get(id)!),
        );
        if (i === 0) return;
        const w = ids[i - 1]!;
        const list = right.get(root.get(w)!) ?? [];
        list.push([r, rel.get(w)! + separation(w, id) - rel.get(id)!]);
        right.set(root.get(w)!, list);
      });
    const columns = [...new Set(root.values())];
    const pending = new Map(columns.map((c) => [c, 0]));
    for (const list of right.values())
      for (const [c] of list) pending.set(c, pending.get(c)! + 1);
    const ready = columns.filter((c) => pending.get(c) === 0);
    const at = new Map(columns.map((c) => [c, least.get(c)!]));
    let placed = 0;
    while (ready.length > 0) {
      const c = ready.pop()!;
      placed += 1;
      for (const [next, gap] of right.get(c) ?? []) {
        at.set(next, Math.max(at.get(next)!, at.get(c)! + gap));
        pending.set(next, pending.get(next)! - 1);
        if (pending.get(next) === 0) ready.push(next);
      }
    }
    if (placed < columns.length) throw new Error("Aligned columns cross");
    for (const [id, r] of root) x.set(id, at.get(r)! + rel.get(id)!);
  };
  if (o.placement === "median") {
    for (let round = 0; round < PLACEMENT_ROUNDS; round++) {
      for (let layer = 1; layer < layerCount; layer++) place(layer, true);
      for (let layer = layerCount - 2; layer >= 0; layer--) place(layer, false);
    }
    for (let layer = 1; layer < layerCount; layer++) place(layer, true);
  } else alignColumns(o.placement === "aligned-left");

  // Whole pixels: equal attachments are exactly equal, so straight lines stay straight when drawn.
  const attachX = (a: Attach) => Math.round(x.get(a.vertex)! + offset(a));
  const rawX = (a: Attach) => x.get(a.vertex)! + offset(a);

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

  // 10. Remove near-misses that would draw tiny jogs.
  const move = (id: string, dx: number) => x.set(id, x.get(id)! + dx);
  const touching = (id: string) =>
    allPieces.filter(
      (p) => p.a.attach.vertex === id || p.b.attach.vertex === id,
    );
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
  /** Whether a set of vertices can move together; neighbours outside the set must keep their gap. */
  const canMoveAll = (ids: readonly string[], dx: number) => {
    const set = new Set(ids);
    return ids.every((id) => {
      const v = vertex(id);
      if (v.kind === "header") return false;
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
    goal: "straight" | "wide" = "straight",
  ): boolean => {
    if (!canMoveAll(moves, dx)) return false;
    const affected = new Set<Piece>();
    for (const id of moves) touching(id).forEach((p) => affected.add(p));
    const before = new Map([...affected].map((p) => [p, gapOf(p)]));
    for (const id of moves) move(id, dx);
    const ok = [...affected].every((p) => {
      if (!opposite(p)) return true;
      const gap = gapOf(p);
      if (p === target)
        return goal === "straight" ? gap <= 0.5 : gap >= o.step - 0.01;
      if (before.get(p)! <= 0.5) return gap <= 0.5;
      return gap <= 0.5 || gap >= o.step - 0.01;
    });
    if (ok) return true;
    for (const id of moves) move(id, -dx);
    return false;
  };
  /** When a step cannot be aligned, make it a deliberate step of at least `step`. */
  const widen = (piece: Piece, dx: number) => {
    const more = Math.sign(dx) * (o.step - Math.abs(dx));
    return (
      attempt(piece, column(piece.b.attach.vertex), -more, "wide") ||
      attempt(piece, column(piece.a.attach.vertex), more, "wide") ||
      attempt(
        piece,
        pushed(column(piece.b.attach.vertex), -more),
        -more,
        "wide",
      ) ||
      attempt(piece, pushed(column(piece.a.attach.vertex), more), more, "wide")
    );
  };
  /**
   * When no local move fixes a step, opens room for it: shifts one of its ends, and everything that
   * must follow, to the right by whole pixels. What follows a moved vertex is its right neighbour in
   * the layer and whatever attaches at or to the right of one of its attachments. So separations
   * only grow, straight lines stay straight, every other step only widens and the level only gets
   * wider. Straightening (moving the left end) is tried before widening (moving the right end).
   */
  const shiftRight = (start: string, target: Piece, dx: number) => {
    const ends = [target.a.attach.vertex, target.b.attach.vertex];
    const moves = new Set<string>();
    const queue = [start];
    while (queue.length > 0) {
      const id = queue.pop()!;
      if (moves.has(id)) continue;
      moves.add(id);
      const layer = layers[vertex(id).layer]!;
      const right = layer[layer.indexOf(id) + 1];
      if (right !== undefined) queue.push(right);
      for (const p of touching(id)) {
        if (p === target) continue;
        const [mine, other] =
          p.a.attach.vertex === id ? [p.a, p.b] : [p.b, p.a];
        if (attachX(other.attach) >= attachX(mine.attach) - 0.5)
          queue.push(other.attach.vertex);
      }
    }
    if (
      ends.every((id) => moves.has(id)) ||
      [...moves].some((id) => vertex(id).kind === "header")
    )
      return false;
    for (const id of moves) move(id, dx);
    return true;
  };
  const open = (piece: Piece) => {
    const [left, right] =
      attachX(piece.a.attach) <= attachX(piece.b.attach)
        ? [piece.a.attach.vertex, piece.b.attach.vertex]
        : [piece.b.attach.vertex, piece.a.attach.vertex];
    const gap = gapOf(piece);
    return (
      (opposite(piece) && shiftRight(left, piece, gap)) ||
      shiftRight(right, piece, Math.ceil(o.step - gap - 0.01))
    );
  };
  const snap = () => {
    let changed = false;
    for (const piece of allPieces) {
      if (gapOf(piece) >= o.step - 0.01) continue;
      // A U-turn's horizontal leg lies between two bends: it can only widen.
      if (!opposite(piece)) {
        if (open(piece)) changed = true;
        continue;
      }
      if (gapOf(piece) <= 0.5) continue;
      // Move by the unrounded distance; the result is judged on whole pixels.
      const dx = rawX(piece.a.attach) - rawX(piece.b.attach);
      const fixed =
        attempt(piece, column(piece.b.attach.vertex), dx) ||
        attempt(piece, column(piece.a.attach.vertex), -dx) ||
        attempt(piece, pushed(column(piece.b.attach.vertex), dx), dx) ||
        attempt(piece, pushed(column(piece.a.attach.vertex), -dx), -dx) ||
        widen(piece, dx) ||
        open(piece);
      if (fixed) changed = true;
    }
    return changed;
  };
  for (let round = 0; round < 8 && snap(); round++);

  // 11. One bus per channel: every connector that changes x in a channel shares a single
  // horizontal track, so parallel horizontal runs collapse into one line. The track keeps a full
  // arrival from the layer on either side. Beside a frame it also clears the frame's border, and
  // the arrival starts after the inset of the ports facing it. Below the last layer it clears the
  // enclosing frame's own border.
  const channelCount = layerCount - 1 + (trailingChannel ? 1 : 0);
  const trackY = new Map<Piece, number>();
  const channelHeight: number[] = [];
  const straight = (p: Piece) =>
    p.a.boundary !== p.b.boundary &&
    Math.abs(attachX(p.a.attach) - attachX(p.b.attach)) <= 0.5;
  const clearance = (layer: readonly string[] | undefined, facing: Side) => {
    if (layer === undefined) return o.frameTrackSpacing;
    const frames = layer.map(vertex).filter((v) => v.kind === "frame");
    if (frames.length === 0) return o.arrival;
    const inset = Math.max(
      0,
      ...frames.flatMap((v) =>
        (v.node?.ports ?? [])
          .filter((port) => port.side === facing)
          .map((port) => port.inset ?? 0),
      ),
    );
    return Math.max(o.frameTrackSpacing, inset + o.arrival);
  };
  for (let channel = 0; channel < channelCount; channel++) {
    const above = clearance(layers[channel], "bottom");
    channelHeight.push(above + clearance(layers[channel + 1], "top"));
    for (const p of allPieces)
      if (p.channel === channel && !straight(p)) trackY.set(p, above);
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

  const insetOf = (a: Attach) => {
    const v = vertex(a.vertex);
    return v.kind === "frame"
      ? (v.node?.ports?.find((port) => port.id === a.port)?.inset ?? 0)
      : 0;
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
    // A line at a port with an inset stops that far outside the frame's border.
    const route = inset(
      straighten(simplify(points)),
      insetOf(path.upperAttach),
      insetOf(path.lowerAttach),
    );
    routes.set(path.edge.id, path.sourceIsUpper ? route : [...route].reverse());
  }
  // A self-loop leaves and returns on the right; either end may carry an arrowhead, so both
  // horizontal legs are a full arrival. Its vertical leg is a full step on a block at least that
  // tall; on a shorter block it spans the whole right edge.
  for (const edge of loops) {
    const v = vertex(edge.source);
    const left = x.get(v.id)! + v.width;
    const middle = y(v.id) + v.height / 2;
    const half = Math.min(v.height, Math.max(o.step, v.height * 0.4)) / 2;
    routes.set(edge.id, [
      { x: left, y: middle - half },
      { x: left + o.arrival, y: middle - half },
      { x: left + o.arrival, y: middle + half },
      { x: left, y: middle + half },
    ]);
  }

  const positions = new Map<string, Point>();
  for (const v of vertices.values())
    if (isReal(v)) positions.set(v.id, { x: x.get(v.id)!, y: y(v.id) });
  const right = Math.max(
    ...layers.flat().map((id) => x.get(id)! + vertex(id).width + loopWidth(id)),
  );
  const exits = [...vertices.values()].some((v) => v.kind === "exit");
  const bottom = layerTop[layerCount - 1]! + layerHeight[layerCount - 1]!;
  return {
    width: right + o.padding,
    height: exits
      ? bottom
      : bottom +
        (trailingChannel ? channelHeight[channelCount - 1]! : o.padding),
    positions,
    routes,
    layers: realLayers,
  };
}

/** Moves each end of a polyline along its leg by the given lengths. */
function inset(
  points: readonly Point[],
  start: number,
  end: number,
): readonly Point[] {
  const out = [...points];
  const pull = (i: number, toward: number, by: number) => {
    if (by <= 0 || out.length < 2) return;
    const a = out[i]!;
    const b = out[toward]!;
    const length = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    out[i] = {
      x: a.x + ((b.x - a.x) / length) * by,
      y: a.y + ((b.y - a.y) / length) * by,
    };
  };
  pull(0, 1, start);
  pull(out.length - 1, out.length - 2, end);
  return out;
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
