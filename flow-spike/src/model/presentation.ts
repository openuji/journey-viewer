import type { ViewerSelection } from "@journey-viewer/viewer";
import type { FlowLayout } from "@/layout/compose";
import { occurrenceKey, terminalKey } from "@/model/flow-scene";
import type { FlowFrame, FlowTerminal } from "@/model/flow-scene";

/**
 * How much canonical detail the flow exposes. Explicit, readonly configuration supplied by the
 * caller: detail changes presentation only, never the projection or the layout.
 */
export interface FlowDetail {
  readonly name: string;
  /** `×N` on connectors that bundle several transitions. */
  readonly bundleCounts: boolean;
  /** Marks arrivals resolved through a child's default entry and recursive references. */
  readonly boundaryMarks: boolean;
  /** Counts of outgoing navigation affordances on states. */
  readonly outgoingMarkers: boolean;
  /** Which side panel accompanies the canvas. */
  readonly details: "compact" | "inspector";
}

export const stakeholderDetail: FlowDetail = Object.freeze({
  name: "Stakeholder",
  bundleCounts: false,
  boundaryMarks: false,
  outgoingMarkers: false,
  details: "compact",
});

export const specDetail: FlowDetail = Object.freeze({
  name: "Spec",
  bundleCounts: true,
  boundaryMarks: true,
  outgoingMarkers: true,
  details: "inspector",
});

export type Tone = "incoming" | "outgoing" | "both";
export type End = "start" | "end";

/**
 * How one connector takes part in the active step's routes: for each direction, the ends that carry
 * an arrowhead. A connector can carry both, e.g. a return along the corridor of an arrival.
 */
export interface ActiveRoute {
  readonly incoming: readonly End[];
  readonly outgoing: readonly End[];
}

/** Derived per render from the active step; nothing here is stored. */
export interface FlowHighlight {
  readonly selected: ReadonlySet<string>;
  readonly related: ReadonlyMap<string, Tone>;
  readonly routes: ReadonlyMap<string, ActiveRoute>;
}

const merge = (current: Tone | undefined, next: Tone): Tone =>
  current === undefined || current === next ? next : "both";

export function flowHighlight(
  layout: FlowLayout,
  selection: ViewerSelection | null,
): FlowHighlight {
  const selected = new Set<string>();
  // An entry or exit is also present where its frame exposes it: the parent's connectors attach there.
  const ports = new Set<string>();
  if (selection) {
    const matches = (node: { "@id": string }, journey: { "@id": string }) =>
      node["@id"] === selection.nodeRef &&
      journey["@id"] === selection.journeyRef;
    if (selection.kind === "state") {
      layout.states.forEach(
        (s) => matches(s.vertex.node, s.vertex.journey) && selected.add(s.key),
      );
      layout.cards.forEach(
        (c) =>
          c.card.kind === "composite" &&
          matches(c.card.node, c.card.journey) &&
          selected.add(c.key),
      );
    } else if (selection.kind === "journey") {
      layout.cards.forEach(
        (c) =>
          c.card.kind === "journey" &&
          c.card.node["@id"] === selection.nodeRef &&
          selected.add(c.key),
      );
    } else {
      for (const c of layout.contracts) {
        if (
          c.contract.kind !== selection.kind ||
          !matches(c.contract.node, c.contract.journey)
        )
          continue;
        selected.add(c.key);
        const occurrence = occurrenceKey(c.contract.occurrence);
        const holds = (frame: FlowFrame) =>
          frame.content.kind === "journey" &&
          frame.content.journey === c.contract.journey &&
          occurrenceKey(frame.content.occurrence) === occurrence;
        for (const box of layout.frames)
          if (
            holds(box.frame) ||
            (box.frame.content.kind === "row" &&
              box.frame.content.frames.some(holds))
          )
            ports.add(
              `${box.key}#${c.contract.kind}:${c.contract.node["@id"]}`,
            );
      }
    }
  }
  const active = (terminal: FlowTerminal) =>
    selected.has(terminal.vertex) ||
    (terminal.port !== undefined && ports.has(terminalKey(terminal)));
  const related = new Map<string, Tone>();
  const routes = new Map<string, ActiveRoute>();
  for (const connector of layout.connectors) {
    const a: FlowTerminal = connector.bundle?.a ?? { vertex: connector.from };
    const b: FlowTerminal =
      connector.bundle?.b ?? connector.association!.target;
    const forward =
      connector.kind === "association" ||
      (connector.bundle?.forward.length ?? 0) > 0;
    const backward = (connector.bundle?.backward.length ?? 0) > 0;
    const atA = active(a);
    const atB = active(b);
    if (!atA && !atB) continue;
    const incoming: End[] = [];
    const outgoing: End[] = [];
    if (forward && atA) outgoing.push("end");
    if (forward && atB) incoming.push("end");
    if (backward && atB) outgoing.push("start");
    if (backward && atA) incoming.push("start");
    if (incoming.length + outgoing.length === 0) continue;
    routes.set(connector.key, { incoming, outgoing });
    if (atA !== atB) {
      const other = atA ? b.vertex : a.vertex;
      const leaves = atA ? forward : backward;
      const arrives = atA ? backward : forward;
      if (leaves) related.set(other, merge(related.get(other), "outgoing"));
      if (arrives) related.set(other, merge(related.get(other), "incoming"));
    }
  }
  return { selected, related, routes };
}

export const toneOf = (route: ActiveRoute | undefined): Tone | undefined =>
  !route
    ? undefined
    : route.incoming.length && route.outgoing.length
      ? "both"
      : route.incoming.length
        ? "incoming"
        : "outgoing";
