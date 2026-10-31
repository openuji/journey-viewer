import type { FlowTone } from "@journey-viewer/design-system";
import type { ViewerSelection } from "@/interaction";
import { occurrenceKey } from "@/occurrence";
import type { FlowLayout } from "@/flow/compose";
import { terminalKey } from "@/flow/scene";
import type { FlowFrame, FlowTerminal } from "@/flow/scene";

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
  readonly related: ReadonlyMap<string, FlowTone>;
  readonly routes: ReadonlyMap<string, ActiveRoute>;
}

const merge = (current: FlowTone | undefined, next: FlowTone): FlowTone =>
  current === undefined || current === next ? next : "both";

/** The blocks the selection names, how the others relate to it, and the routes that join them. */
export function flowHighlight(
  layout: FlowLayout,
  selection: ViewerSelection | null,
): FlowHighlight {
  const selected = new Set<string>();
  // An entry or exit is also present where its frame exposes it: the parent's connectors attach there.
  const ports = new Set<string>();
  if (selection) {
    const matches = (id: string, journeyId: string) =>
      id === selection.nodeId && journeyId === selection.journeyId;
    if (selection.kind === "state") {
      layout.states.forEach(
        (s) => matches(s.vertex.id, s.vertex.journeyId) && selected.add(s.key),
      );
      layout.cards.forEach(
        (c) =>
          c.card.kind === "composite" &&
          matches(c.card.id, c.card.journeyId) &&
          selected.add(c.key),
      );
    } else if (selection.kind === "journey") {
      layout.cards.forEach(
        (c) =>
          c.card.kind === "journey" &&
          c.card.id === selection.nodeId &&
          selected.add(c.key),
      );
    } else {
      for (const c of layout.contracts) {
        if (
          c.contract.kind !== selection.kind ||
          !matches(c.contract.id, c.contract.journeyId)
        )
          continue;
        selected.add(c.key);
        const occurrence = occurrenceKey(c.contract.occurrence);
        const holds = (frame: FlowFrame) =>
          frame.content.kind === "journey" &&
          frame.content.id === c.contract.journeyId &&
          occurrenceKey(frame.content.occurrence) === occurrence;
        for (const box of layout.frames)
          if (
            holds(box.frame) ||
            (box.frame.content.kind === "row" &&
              box.frame.content.frames.some(holds))
          )
            ports.add(`${box.key}#${c.contract.kind}:${c.contract.id}`);
      }
    }
  }
  const active = (terminal: FlowTerminal) =>
    selected.has(terminal.vertex) ||
    (terminal.port !== undefined && ports.has(terminalKey(terminal)));
  const related = new Map<string, FlowTone>();
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
