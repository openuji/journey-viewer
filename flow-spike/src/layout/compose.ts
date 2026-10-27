import { FRAME_PAD, simplify } from "@/layout/geometry";
import type {
  LevelEdge,
  LevelEngine,
  LevelInput,
  LevelLayout,
  LevelNode,
  LevelPort,
  Point,
  Rect,
} from "@/layout/geometry";
import { fonts, widest, wrap } from "@/layout/text";
import type { Measure } from "@/layout/text";
import type {
  FlowAssociation,
  FlowBundle,
  FlowCard,
  FlowContract,
  FlowFrame,
  FlowJourney,
  FlowScene,
  FlowStateVertex,
  FlowTerminal,
} from "@/model/flow-scene";

/** Absolute geometry for one scene. Pure data: rendering and metrics both read it. */
export interface FlowLayout {
  readonly width: number;
  readonly height: number;
  readonly frames: readonly FrameBox[];
  readonly cards: readonly CardBox[];
  readonly states: readonly StateBox[];
  readonly contracts: readonly ContractBox[];
  readonly connectors: readonly Connector[];
  readonly ports: readonly PortMark[];
  readonly levels: readonly LevelRecord[];
}

export interface FrameBox {
  readonly key: string;
  readonly rect: Rect;
  readonly depth: number;
  readonly frame: FlowFrame;
}

export interface CardBox {
  readonly key: string;
  readonly rect: Rect;
  readonly card: FlowCard;
  readonly title: readonly string[];
  readonly caption: readonly string[];
  /** The card heads an open frame (rather than standing for a closed composite). */
  readonly heads: boolean;
}

export interface StateBox {
  readonly key: string;
  readonly rect: Rect;
  readonly vertex: FlowStateVertex;
  readonly lines: readonly string[];
}

export interface ContractBox {
  readonly key: string;
  readonly rect: Rect;
  readonly glyph: Point;
  readonly contract: FlowContract;
  readonly lines: readonly string[];
}

export interface Connector {
  readonly key: string;
  readonly kind: "bundle" | "association";
  readonly points: readonly Point[];
  readonly bundle?: FlowBundle;
  readonly association?: FlowAssociation;
  /** Vertex keys (cards, states, contracts, frames) at each end, for highlighting and metrics. */
  readonly from: string;
  readonly to: string;
  readonly arrowStart: boolean;
  readonly arrowEnd: boolean;
}

export interface PortMark {
  readonly frame: string;
  readonly id: string;
  readonly point: Point;
}

export interface LevelRecord {
  readonly frame: string;
  readonly layers?: readonly (readonly string[])[];
  readonly milliseconds: number;
}

export const GLYPH_RADIUS = 5;
const CONTRACT_ANCHOR = 7;
const CONTRACT_TEXT = 18;
const ROOT_GAP = 48;
const ROW_GAP = 24;

const label = (node: { readonly label?: unknown; readonly "@id": string }) =>
  typeof node.label === "string" ? node.label : node["@id"];

/** Text and size of every box, from labels only; identical whether a composite is open or not. */
export function cardText(card: FlowCard, measure: Measure) {
  const title = wrap(label(card.node), fonts.title, 176, measure, 2);
  const states =
    card.kind === "journey" ? card.journey.stateRefs.length : undefined;
  const parts =
    card.kind === "journey"
      ? [`${states} ${states === 1 ? "state" : "states"}`]
      : card.children.length === 0
        ? ["No child journey"]
        : card.children.map((child) =>
            card.recursive.includes(child)
              ? `${label(child)} (repeats an enclosing journey)`
              : label(child),
          );
  const caption = wrap(parts.join(" · "), fonts.caption, 176, measure, 2);
  const width = Math.max(
    168,
    // Caption lines follow a touchpoint dot (8px + 6px gap).
    Math.max(
      widest(title, fonts.title, measure),
      widest(caption, fonts.caption, measure) + 14,
    ) +
      16 +
      12 +
      (card.toggle ? 30 : 0),
  );
  return {
    title,
    caption,
    width,
    height: 12 + title.length * 17 + caption.length * 16 + 10,
  };
}

export function stateText(vertex: FlowStateVertex, measure: Measure) {
  const lines = wrap(label(vertex.node), fonts.body, 168, measure, 3);
  const screen = vertex.surfaces > 0 ? 24 : 0;
  return {
    lines,
    width: Math.max(112, widest(lines, fonts.body, measure) + 16 + 12 + screen),
    height: 16 + lines.length * 17,
  };
}

export function contractText(contract: FlowContract, measure: Measure) {
  const lines = wrap(label(contract.node), fonts.caption, 132, measure, 2);
  return {
    lines,
    width: CONTRACT_TEXT + widest(lines, fonts.caption, measure) + 4,
    height: 6 + lines.length * 16,
  };
}

/** Relative layout of one frame, before it is nested in its parent. */
interface Local {
  width: number;
  height: number;
  frames: FrameBox[];
  cards: CardBox[];
  states: StateBox[];
  contracts: ContractBox[];
  connectors: Connector[];
  ports: PortMark[];
  levels: LevelRecord[];
  /** Ports this frame exposes to its parent, relative to its top-left corner. */
  exposed: LevelPort[];
  /** This frame's own exit contracts, which sit on its bottom border. */
  exits: string[];
}

const shift = (local: Local, dx: number, dy: number, depth: number): Local => {
  const p = (point: Point) => ({ x: point.x + dx, y: point.y + dy });
  const r = (rect: Rect) => ({ ...rect, x: rect.x + dx, y: rect.y + dy });
  return {
    ...local,
    frames: local.frames.map((f) => ({
      ...f,
      rect: r(f.rect),
      depth: f.depth + depth,
    })),
    cards: local.cards.map((c) => ({ ...c, rect: r(c.rect) })),
    states: local.states.map((s) => ({ ...s, rect: r(s.rect) })),
    contracts: local.contracts.map((c) => ({
      ...c,
      rect: r(c.rect),
      glyph: p(c.glyph),
    })),
    connectors: local.connectors.map((c) => ({
      ...c,
      points: c.points.map(p),
    })),
    ports: local.ports.map((m) => ({ ...m, point: p(m.point) })),
  };
};

const merge = (into: Local, part: Local) => {
  into.frames.push(...part.frames);
  into.cards.push(...part.cards);
  into.states.push(...part.states);
  into.contracts.push(...part.contracts);
  into.connectors.push(...part.connectors);
  into.ports.push(...part.ports);
  into.levels.push(...part.levels);
};

/** Bottom-aligns a frame's exits on a taller border (sibling child frames share one height). */
const stretch = (local: Local, frameKey: string, height: number): Local => {
  const delta = height - local.height;
  if (delta <= 0) return local;
  const exits = new Set(local.exits);
  return {
    ...local,
    height,
    frames: local.frames.map((f) =>
      f.key === frameKey ? { ...f, rect: { ...f.rect, height } } : f,
    ),
    contracts: local.contracts.map((c) =>
      exits.has(c.key)
        ? {
            ...c,
            rect: { ...c.rect, y: c.rect.y + delta },
            glyph: { ...c.glyph, y: c.glyph.y + delta },
          }
        : c,
    ),
    connectors: local.connectors.map((c) =>
      exits.has(c.to)
        ? {
            ...c,
            points: c.points.map((pt, i) =>
              i === c.points.length - 1 ? { ...pt, y: pt.y + delta } : pt,
            ),
          }
        : c,
    ),
  };
};

/**
 * Lays out a scene bottom-up. Yields one level input at a time and receives its layout, so the
 * same composition drives the synchronous own engine and the asynchronous ELK baseline.
 */
function* composeSteps(
  scene: FlowScene,
  measure: Measure,
): Generator<LevelInput, FlowLayout, LevelLayout> {
  function* frameLayout(
    frame: FlowFrame,
  ): Generator<LevelInput, Local, LevelLayout> {
    const card = cardText(frame.card, measure);
    if (frame.content.kind === "row") {
      const children: Local[] = [];
      for (const child of frame.content.frames)
        children.push(yield* frameLayout(child));
      const height = Math.max(
        card.height + FRAME_PAD,
        ...children.map((c) => c.height),
      );
      const local: Local = emptyLocal();
      let cursor = card.width + ROW_GAP;
      const ports: LevelPort[] = [];
      frame.content.frames.forEach((child, i) => {
        const stretched = stretch(children[i]!, child.key, height);
        merge(local, shift(stretched, cursor, 0, 1));
        ports.push(
          ...stretched.exposed.map((port) => ({ ...port, x: port.x + cursor })),
        );
        cursor += stretched.width + ROW_GAP;
      });
      const width = cursor - ROW_GAP + FRAME_PAD;
      local.width = width;
      local.height = height;
      local.frames.push({
        key: frame.key,
        rect: { x: 0, y: 0, width, height },
        depth: 0,
        frame,
      });
      local.cards.push({
        key: frame.card.key,
        rect: { x: 0, y: 0, width: card.width, height: card.height },
        card: frame.card,
        title: card.title,
        caption: card.caption,
        heads: true,
      });
      local.exposed = [
        ...ports.map((port) => ({ ...port, id: port.id })),
        { id: "card", side: "top", x: card.width / 2 },
        { id: "out", side: "bottom", x: card.width / 2 },
      ];
      return local;
    }
    return yield* journeyLayout(frame, frame.content, card);
  }

  function* journeyLayout(
    frame: FlowFrame,
    journey: FlowJourney,
    card: ReturnType<typeof cardText>,
  ): Generator<LevelInput, Local, LevelLayout> {
    const nested = new Map<string, Local>();
    for (const vertex of journey.vertices)
      if (vertex.kind === "frame")
        nested.set(vertex.key, yield* frameLayout(vertex.frame));
    const states = new Map(
      journey.vertices.flatMap((v) =>
        v.kind === "state" ? [[v.key, stateText(v, measure)] as const] : [],
      ),
    );
    const closed = new Map(
      journey.vertices.flatMap((v) =>
        v.kind === "composite"
          ? [[v.key, cardText(v.card, measure)] as const]
          : [],
      ),
    );
    const contracts = new Map(
      [...journey.entries, ...journey.exits].map(
        (c) => [c.key, contractText(c, measure)] as const,
      ),
    );
    const nodes: LevelNode[] = [
      {
        id: frame.card.key,
        kind: "card",
        width: card.width,
        height: card.height,
      },
      // The default entry leads: cycle breaking follows model order from the first entry.
      ...[...journey.entries]
        .sort((a, b) => Number(b.isDefault) - Number(a.isDefault))
        .map((c): LevelNode => ({
          id: c.key,
          kind: "entry",
          width: contracts.get(c.key)!.width,
          height: contracts.get(c.key)!.height,
          anchor: CONTRACT_ANCHOR,
        })),
      ...journey.vertices.map((v): LevelNode => {
        if (v.kind === "state")
          return {
            id: v.key,
            kind: "state",
            width: states.get(v.key)!.width,
            height: states.get(v.key)!.height,
          };
        if (v.kind === "composite")
          return {
            id: v.key,
            kind: "composite",
            width: closed.get(v.key)!.width,
            height: closed.get(v.key)!.height,
          };
        const child = nested.get(v.key)!;
        return {
          id: v.key,
          kind: "frame",
          width: child.width,
          height: child.height,
          ports: child.exposed,
        };
      }),
      ...journey.exits.map((c): LevelNode => ({
        id: c.key,
        kind: "exit",
        width: contracts.get(c.key)!.width,
        height: contracts.get(c.key)!.height,
        anchor: CONTRACT_ANCHOR,
      })),
    ];
    const edge = (
      id: string,
      a: FlowTerminal,
      b: FlowTerminal,
      forward: boolean,
      backward: boolean,
    ): LevelEdge => ({
      id,
      source: a.vertex,
      target: b.vertex,
      ...(a.port ? { sourcePort: a.port } : {}),
      ...(b.port ? { targetPort: b.port } : {}),
      forward,
      backward,
    });
    const edges: LevelEdge[] = [
      ...journey.associations.map((a) =>
        edge(a.key, { vertex: a.entry }, a.target, true, false),
      ),
      ...journey.bundles.map((b) =>
        edge(b.key, b.a, b.b, b.forward.length > 0, b.backward.length > 0),
      ),
    ];
    const started = performance.now();
    const level = yield { nodes, edges };
    const milliseconds = performance.now() - started;

    const local = emptyLocal();
    local.width = Math.max(level.width, card.width + FRAME_PAD);
    local.height = level.height;
    local.levels.push({
      frame: frame.key,
      ...(level.layers ? { layers: level.layers } : {}),
      milliseconds,
    });
    const at = (id: string) => level.positions.get(id) ?? { x: 0, y: 0 };
    local.frames.push({
      key: frame.key,
      rect: { x: 0, y: 0, width: local.width, height: local.height },
      depth: 0,
      frame,
    });
    local.cards.push({
      key: frame.card.key,
      rect: { ...at(frame.card.key), width: card.width, height: card.height },
      card: frame.card,
      title: card.title,
      caption: card.caption,
      heads: true,
    });
    for (const contract of [...journey.entries, ...journey.exits]) {
      const size = contracts.get(contract.key)!;
      const position = at(contract.key);
      const rect = { ...position, width: size.width, height: size.height };
      local.contracts.push({
        key: contract.key,
        rect,
        glyph: {
          x: position.x + CONTRACT_ANCHOR,
          y: contract.kind === "entry" ? position.y : position.y + size.height,
        },
        contract,
        lines: size.lines,
      });
    }
    for (const vertex of journey.vertices) {
      const position = at(vertex.key);
      if (vertex.kind === "state") {
        const size = states.get(vertex.key)!;
        local.states.push({
          key: vertex.key,
          rect: { ...position, width: size.width, height: size.height },
          vertex,
          lines: size.lines,
        });
      } else if (vertex.kind === "composite") {
        const size = closed.get(vertex.key)!;
        local.cards.push({
          key: vertex.card.key,
          rect: { ...position, width: size.width, height: size.height },
          card: vertex.card,
          title: size.title,
          caption: size.caption,
          heads: false,
        });
      } else
        merge(local, shift(nested.get(vertex.key)!, position.x, position.y, 1));
    }

    const own = new Set(
      [...journey.entries, ...journey.exits].map((c) => c.key),
    );
    local.exits = journey.exits.map((c) => c.key);
    const glyphOf = new Map(
      local.contracts.filter((c) => own.has(c.key)).map((c) => [c.key, c]),
    );
    const portPoint = (
      terminal: FlowTerminal,
      end: "start" | "end",
      route: readonly Point[],
    ): Point[] => {
      const contract = glyphOf.get(terminal.vertex);
      const edgePoint = end === "start" ? route[0]! : route[route.length - 1]!;
      if (contract)
        return [
          {
            x: contract.glyph.x,
            y:
              contract.glyph.y +
              (contract.contract.kind === "entry"
                ? GLYPH_RADIUS
                : -GLYPH_RADIUS),
          },
        ];
      if (terminal.port?.startsWith("entry:"))
        return [{ x: edgePoint.x, y: edgePoint.y - GLYPH_RADIUS }];
      if (terminal.port?.startsWith("exit:"))
        return [{ x: edgePoint.x, y: edgePoint.y + GLYPH_RADIUS }];
      return [];
    };
    const finish = (
      route: readonly Point[],
      a: FlowTerminal,
      b: FlowTerminal,
    ): Point[] => {
      const start = portPoint(a, "start", route);
      const end = portPoint(b, "end", route);
      const inner = [...route];
      // A contract-port end replaces the border point with the point just outside its glyph.
      if (
        start.length &&
        (a.port?.startsWith("entry:") || a.port?.startsWith("exit:"))
      )
        inner.shift();
      if (
        end.length &&
        (b.port?.startsWith("entry:") || b.port?.startsWith("exit:"))
      )
        inner.pop();
      return [...simplify([...start, ...inner, ...end])];
    };
    for (const association of journey.associations) {
      const route = level.routes.get(association.key);
      if (!route) continue;
      local.connectors.push({
        key: association.key,
        kind: "association",
        points: finish(
          route,
          { vertex: association.entry },
          association.target,
        ),
        association,
        from: association.entry,
        to: association.target.vertex,
        arrowStart: false,
        arrowEnd: true,
      });
    }
    for (const bundle of journey.bundles) {
      const route = level.routes.get(bundle.key);
      if (!route) continue;
      local.connectors.push({
        key: bundle.key,
        kind: "bundle",
        points: finish(route, bundle.a, bundle.b),
        bundle,
        from: bundle.a.vertex,
        to: bundle.b.vertex,
        arrowStart: bundle.backward.length > 0,
        arrowEnd: bundle.forward.length > 0,
      });
    }
    for (const [key, child] of nested) {
      const position = at(key);
      for (const port of child.exposed)
        local.ports.push({
          frame: key,
          id: port.id,
          point: {
            x: position.x + port.x,
            y: position.y + (port.side === "top" ? 0 : child.height),
          },
        });
    }
    local.exposed = [
      ...[...glyphOf.values()].map((c): LevelPort => ({
        id: `${c.contract.kind}:${c.contract.node["@id"]}`,
        side: c.contract.kind === "entry" ? "top" : "bottom",
        x: c.glyph.x,
      })),
      { id: "card", side: "top", x: at(frame.card.key).x + card.width / 2 },
      { id: "out", side: "bottom", x: at(frame.card.key).x + card.width / 2 },
    ];
    return local;
  }

  const out = emptyLocal();
  let cursor = 0;
  for (const frame of scene.frames) {
    const local = yield* frameLayout(frame);
    merge(out, shift(local, cursor, 0, 0));
    cursor += local.width + ROOT_GAP;
    out.height = Math.max(out.height, local.height);
  }
  out.width = Math.max(0, cursor - ROOT_GAP);
  out.frames.sort((a, b) => a.depth - b.depth);
  return out;
}

function emptyLocal(): Local {
  return {
    width: 0,
    height: 0,
    frames: [],
    cards: [],
    states: [],
    contracts: [],
    connectors: [],
    ports: [],
    levels: [],
    exposed: [],
    exits: [],
  };
}

export function composeFlow(
  scene: FlowScene,
  engine: (input: LevelInput) => LevelLayout,
  measure: Measure,
): FlowLayout {
  const steps = composeSteps(scene, measure);
  let step = steps.next();
  while (!step.done) step = steps.next(engine(step.value));
  return step.value;
}

export async function composeFlowAsync(
  scene: FlowScene,
  engine: LevelEngine,
  measure: Measure,
): Promise<FlowLayout> {
  const steps = composeSteps(scene, measure);
  let step = steps.next();
  while (!step.done) step = steps.next(await engine(step.value));
  return step.value;
}
