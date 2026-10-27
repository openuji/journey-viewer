import type { ViewerSelection } from "@journey-viewer/viewer";
import type { Connector, FlowLayout } from "@/layout/compose";

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

/** Derived per render from the shared selection; nothing here is stored. */
export interface FlowHighlight {
  readonly selected: ReadonlySet<string>;
  readonly related: ReadonlyMap<string, Tone>;
  readonly connectors: ReadonlyMap<string, Tone>;
}

const merge = (current: Tone | undefined, next: Tone): Tone =>
  current === undefined || current === next ? next : "both";

export function flowHighlight(
  layout: FlowLayout,
  selection: ViewerSelection | null,
): FlowHighlight {
  const selected = new Set<string>();
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
      layout.contracts.forEach(
        (c) =>
          c.contract.kind === selection.kind &&
          matches(c.contract.node, c.contract.journey) &&
          selected.add(c.key),
      );
    }
  }
  const related = new Map<string, Tone>();
  const connectors = new Map<string, Tone>();
  const directions = (connector: Connector) =>
    connector.kind === "association"
      ? { forward: true, backward: false }
      : {
          forward: (connector.bundle?.forward.length ?? 0) > 0,
          backward: (connector.bundle?.backward.length ?? 0) > 0,
        };
  for (const connector of layout.connectors) {
    const { forward, backward } = directions(connector);
    for (const [end, other, out] of [
      [connector.from, connector.to, forward],
      [connector.to, connector.from, backward],
    ] as const) {
      if (!selected.has(end)) continue;
      const leaves = out;
      const arrives = end === connector.from ? backward : forward;
      if (leaves) {
        connectors.set(
          connector.key,
          merge(connectors.get(connector.key), "outgoing"),
        );
        if (!selected.has(other))
          related.set(other, merge(related.get(other), "outgoing"));
      }
      if (arrives) {
        connectors.set(
          connector.key,
          merge(connectors.get(connector.key), "incoming"),
        );
        if (!selected.has(other))
          related.set(other, merge(related.get(other), "incoming"));
      }
    }
  }
  return { selected, related, connectors };
}
