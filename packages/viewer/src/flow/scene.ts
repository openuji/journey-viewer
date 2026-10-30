import {
  getChildJourneys,
  getJourneyEntries,
  getJourneyExits,
  getJourneyStates,
  getJourneyTransitions,
  getNodeSurfaces,
} from "@journey-viewer/ujg-jsonld";
import type {
  UjgCompositeState,
  UjgDocument,
  UjgJourney,
  UjgJourneyEntry,
  UjgState,
  UjgTransition,
} from "@journey-viewer/ujg-jsonld";
import type { ViewerInteraction } from "@/interaction";
import type { ViewerTarget } from "@/navigation";
import { childOccurrence, occurrenceKey } from "@/occurrence";
import type { ViewerOccurrence } from "@/occurrence";
import { getJourneyStarts } from "@/journey-starts";

/**
 * A display projection of canonical UJG for one expansion. It is the only flow module that reads
 * the document: everything after it works with plain ids, labels and explicit occurrences. It is
 * rebuilt whenever the document or the expansion changes and never retained.
 */
export interface FlowScene {
  readonly frames: readonly FlowFrame[];
  /** Explicit data the projection could not place, e.g. non-local endpoints; never repaired. */
  readonly issues: readonly string[];
}

/** A journey occurrence drawn as a frame; its card sits at the frame's top-left corner. */
export interface FlowFrame {
  readonly key: string;
  readonly card: FlowCard;
  readonly content: FlowJourney | FlowRow;
}

/** Sibling child journeys of one open composite, side by side; no edges join them. */
export interface FlowRow {
  readonly kind: "row";
  readonly frames: readonly FlowFrame[];
}

export interface FlowJourney {
  readonly kind: "journey";
  /** The journey this frame draws. */
  readonly id: string;
  readonly occurrence: ViewerOccurrence;
  readonly entries: readonly FlowContract[];
  readonly exits: readonly FlowContract[];
  readonly vertices: readonly FlowVertex[];
  readonly bundles: readonly FlowBundle[];
  readonly associations: readonly FlowAssociation[];
}

/** A child journey a composite card names. */
export interface FlowChild {
  readonly id: string;
  readonly label: string;
  /** The child is a journey that already encloses this card: it never opens here. */
  readonly recursive: boolean;
}

/**
 * The card a frame grows from. A root journey's card names the journey; an open composite's card is
 * the same card the collapsed composite shows, so both states share `key`.
 */
export interface FlowCard {
  readonly key: string;
  readonly kind: "journey" | "composite";
  /** The journey (for a journey card) or the composite state. */
  readonly id: string;
  readonly label: string;
  /** The journey the card belongs to; a journey card's own id. */
  readonly journeyId: string;
  readonly occurrence: ViewerOccurrence;
  /** What selecting the card selects: the journey it heads, or its composite state. */
  readonly target: ViewerTarget;
  readonly children: readonly FlowChild[];
  /** A journey card's state count; 0 for composites. */
  readonly stateCount: number;
  /** The journey whose touchpoint the card shows: the first child, else its own journey. */
  readonly touchpointJourneyId: string;
  /** Absent for root journeys and composites without children. */
  readonly toggle: "expand" | "collapse" | null;
}

export type FlowVertex =
  FlowStateVertex | FlowCompositeVertex | FlowFrameVertex;

interface VertexBase {
  readonly key: string;
  /** The state's id. */
  readonly id: string;
  readonly label: string;
  readonly journeyId: string;
  readonly occurrence: ViewerOccurrence;
  readonly stateIndex: number;
}

export interface FlowStateVertex extends VertexBase {
  readonly kind: "state";
  readonly target: ViewerTarget;
  /** Explicitly associated surfaces; reserves the screen action whatever the screenshot map says. */
  readonly surfaces: number;
}

/** A closed, recursive or childless composite. */
export interface FlowCompositeVertex extends VertexBase {
  readonly kind: "composite";
  readonly card: FlowCard;
}

/** An open composite: its frame stands in for the vertex in the parent journey. */
export interface FlowFrameVertex extends VertexBase {
  readonly kind: "frame";
  readonly frame: FlowFrame;
}

export interface FlowContract {
  readonly kind: "entry" | "exit";
  readonly key: string;
  readonly id: string;
  readonly label: string;
  readonly journeyId: string;
  readonly occurrence: ViewerOccurrence;
  readonly target: ViewerTarget;
  readonly isDefault: boolean;
}

/**
 * Where a connector attaches. `port` names a contract of an open composite (`entry:<id>`,
 * `exit:<id>`), its card (`card`, arrival without a resolved entry) or its generic departure
 * (`out`, departure without an exit).
 */
export interface FlowTerminal {
  readonly vertex: string;
  readonly port?: string;
}

export interface FlowTransition {
  readonly id: string;
  readonly label: string;
  /** No explicit entry; the single child's default entry resolved it (UJG ED Graph). */
  readonly viaDefault: boolean;
}

/** All transitions between one unordered pair of terminals, drawn as one connector. */
export interface FlowBundle {
  readonly key: string;
  readonly a: FlowTerminal;
  readonly b: FlowTerminal;
  readonly forward: readonly FlowTransition[];
  readonly backward: readonly FlowTransition[];
}

/** An entry's start state: an association, not a transition. */
export interface FlowAssociation {
  readonly key: string;
  readonly entry: string;
  readonly target: FlowTerminal;
}

export const terminalKey = (terminal: FlowTerminal): string =>
  terminal.port ? `${terminal.vertex}#${terminal.port}` : terminal.vertex;

/** `outer` is `inner` or a journey `inner` sits in. */
const encloses = (outer: ViewerOccurrence, inner: ViewerOccurrence) =>
  outer.startJourneyRef === inner.startJourneyRef &&
  outer.steps.length <= inner.steps.length &&
  outer.steps.every(
    (step, i) =>
      step.stateIndex === inner.steps[i]!.stateIndex &&
      step.childIndex === inner.steps[i]!.childIndex,
  );

/**
 * `frame` shows `target`: the frame is the target's open composite, or it draws a journey that is
 * or encloses the target's. The frames showing a node, outermost first, are its journey path.
 */
export function frameShows(frame: FlowFrame, target: ViewerTarget): boolean {
  const { card, content } = frame;
  const journeys =
    content.kind === "journey"
      ? [content]
      : content.frames.flatMap((f) =>
          f.content.kind === "journey" ? [f.content] : [],
        );
  return (
    (card.kind === "composite" &&
      card.id === target.selection.nodeRef &&
      card.occurrence.steps.length === target.occurrence.steps.length &&
      encloses(card.occurrence, target.occurrence)) ||
    journeys.some((journey) => encloses(journey.occurrence, target.occurrence))
  );
}

const labelOf = (node: { readonly label?: unknown; readonly "@id": string }) =>
  typeof node.label === "string" ? node.label : node["@id"];

const isComposite = (node: UjgState | UjgCompositeState) =>
  "subjourneyRefs" in node;

/** A root journey's card, or a child journey's card inside an open composite. */
const journeyCard = (
  journey: UjgJourney,
  occurrence: ViewerOccurrence,
  key: string,
): FlowCard => ({
  key,
  kind: "journey",
  id: journey["@id"],
  label: labelOf(journey),
  journeyId: journey["@id"],
  occurrence,
  target: {
    selection: {
      kind: "journey",
      journeyRef: journey["@id"],
      nodeRef: journey["@id"],
    },
    occurrence,
  },
  children: [],
  stateCount: journey.stateRefs.length,
  touchpointJourneyId: journey["@id"],
  toggle: null,
});

export function buildFlowScene(
  document: UjgDocument,
  interaction: Pick<ViewerInteraction, "expandedJourneys">,
): FlowScene {
  const issues: string[] = [];
  const expanded = new Set(interaction.expandedJourneys);

  const compositeCard = (
    journey: UjgJourney,
    occurrence: ViewerOccurrence,
    node: UjgCompositeState,
    key: string,
    ancestors: readonly string[],
  ): FlowCard => {
    const children = getChildJourneys(document, node).map(
      (child): FlowChild => ({
        id: child["@id"],
        label: labelOf(child),
        recursive: ancestors.includes(child["@id"]),
      }),
    );
    const openable = children.some((child) => !child.recursive);
    const open = openable && children.some((child) => expanded.has(child.id));
    return {
      key,
      kind: "composite",
      id: node["@id"],
      label: labelOf(node),
      journeyId: journey["@id"],
      occurrence,
      target: {
        selection: {
          kind: "state",
          journeyRef: journey["@id"],
          nodeRef: node["@id"],
        },
        occurrence,
      },
      children,
      stateCount: 0,
      touchpointJourneyId: children[0]?.id ?? journey["@id"],
      toggle: openable ? (open ? "collapse" : "expand") : null,
    };
  };

  const buildJourney = (
    journey: UjgJourney,
    occurrence: ViewerOccurrence,
    ancestors: readonly string[],
  ): FlowJourney => {
    const prefix = occurrenceKey(occurrence);
    const lineage = [...ancestors, journey["@id"]];
    const contract = (
      kind: "entry" | "exit",
      node: { readonly label?: unknown; readonly "@id": string },
    ): FlowContract => ({
      kind,
      key: `${prefix}|${kind}:${node["@id"]}`,
      id: node["@id"],
      label: labelOf(node),
      journeyId: journey["@id"],
      occurrence,
      target: {
        selection: {
          kind,
          journeyRef: journey["@id"],
          nodeRef: node["@id"],
        },
        occurrence,
      },
      isDefault: kind === "entry" && journey.defaultEntryRef === node["@id"],
    });
    const entryNodes = getJourneyEntries(document, journey);
    const entries = entryNodes.map((node) => contract("entry", node));
    // The child journeys each open composite draws, for its contracts and default entry.
    const openChildren = new Map<string, readonly UjgJourney[]>();
    const exits = getJourneyExits(document, journey).map((node) =>
      contract("exit", node),
    );
    const vertices = getJourneyStates(document, journey).map(
      (node, stateIndex): FlowVertex => {
        const key = `${prefix}|${stateIndex}:${node["@id"]}`;
        const base = {
          key,
          id: node["@id"],
          label: labelOf(node),
          journeyId: journey["@id"],
          occurrence,
          stateIndex,
        };
        if (!isComposite(node))
          return {
            ...base,
            kind: "state",
            target: {
              selection: {
                kind: "state",
                journeyRef: journey["@id"],
                nodeRef: node["@id"],
              },
              occurrence,
            },
            surfaces: getNodeSurfaces(document, node["@id"]).length,
          };
        const composite = node as UjgCompositeState;
        const card = compositeCard(
          journey,
          occurrence,
          composite,
          key,
          lineage,
        );
        if (card.toggle !== "collapse")
          return { ...base, kind: "composite", card };
        const children = getChildJourneys(document, composite);
        openChildren.set(
          key,
          children.filter((_, i) => !card.children[i]!.recursive),
        );
        const childFrames = children.flatMap(
          (child, childIndex): FlowFrame[] => {
            if (card.children[childIndex]!.recursive) return [];
            const childKey = `${key}/${childIndex}`;
            const at = childOccurrence(occurrence, stateIndex, childIndex);
            return [
              {
                key: childKey,
                card: journeyCard(child, at, childKey),
                content: buildJourney(child, at, lineage),
              },
            ];
          },
        );
        // One child merges into the composite's own frame; several become a row of child frames.
        const frame: FlowFrame =
          childFrames.length === 1
            ? { key, card, content: childFrames[0]!.content }
            : { key, card, content: { kind: "row", frames: childFrames } };
        return { ...base, kind: "frame", frame };
      },
    );

    const stateVertex = new Map<string, FlowVertex>();
    for (const vertex of vertices)
      if (!stateVertex.has(vertex.id)) stateVertex.set(vertex.id, vertex);
    const exitById = new Map(exits.map((exit) => [exit.id, exit]));
    const childJourneysOf = (vertex: FlowFrameVertex) =>
      openChildren.get(vertex.key) ?? [];
    const contractOwner = (
      vertex: FlowFrameVertex,
      id: string,
      kind: "entry" | "exit",
    ) =>
      childJourneysOf(vertex).find((child) =>
        (kind === "entry" ? child.entryRefs : (child.exitRefs ?? [])).includes(
          id,
        ),
      );

    const source = (transition: UjgTransition): FlowTerminal | undefined => {
      const vertex = stateVertex.get(transition.from);
      if (!vertex) return undefined;
      if (vertex.kind !== "frame") return { vertex: vertex.key };
      const id = transition.fromExitRef;
      if (id && contractOwner(vertex, id, "exit"))
        return { vertex: vertex.key, port: `exit:${id}` };
      if (id)
        issues.push(
          `${transition["@id"]}: fromExitRef ${id} is not an exit of a child of ${vertex.id}`,
        );
      return { vertex: vertex.key, port: "out" };
    };
    const target = (
      transition: UjgTransition,
    ): { terminal: FlowTerminal; viaDefault: boolean } | undefined => {
      const exit = exitById.get(transition.to);
      if (exit) return { terminal: { vertex: exit.key }, viaDefault: false };
      const vertex = stateVertex.get(transition.to);
      if (!vertex) return undefined;
      if (vertex.kind !== "frame")
        return { terminal: { vertex: vertex.key }, viaDefault: false };
      const id = transition.toEntryRef;
      if (id && contractOwner(vertex, id, "entry"))
        return {
          terminal: { vertex: vertex.key, port: `entry:${id}` },
          viaDefault: false,
        };
      if (id)
        issues.push(
          `${transition["@id"]}: toEntryRef ${id} is not an entry of a child of ${vertex.id}`,
        );
      const children = childJourneysOf(vertex);
      const fallback =
        !id && children.length === 1 ? children[0]!.defaultEntryRef : undefined;
      return fallback
        ? {
            terminal: { vertex: vertex.key, port: `entry:${fallback}` },
            viaDefault: true,
          }
        : { terminal: { vertex: vertex.key, port: "card" }, viaDefault: false };
    };

    const bundles = new Map<
      string,
      {
        a: FlowTerminal;
        b: FlowTerminal;
        forward: FlowTransition[];
        backward: FlowTransition[];
      }
    >();
    for (const transition of getJourneyTransitions(document, journey)) {
      const from = source(transition);
      const to = target(transition);
      if (!from || !to) {
        issues.push(
          `${transition["@id"]}: endpoint is not a local vertex of ${journey["@id"]}`,
        );
        continue;
      }
      const [first, second] = [terminalKey(from), terminalKey(to.terminal)];
      const key = `${prefix}|${[first, second].sort().join("~")}`;
      const bundle = bundles.get(key) ?? {
        a: from,
        b: to.terminal,
        forward: [],
        backward: [],
      };
      bundles.set(key, bundle);
      const entry = {
        id: transition["@id"],
        label: labelOf(transition),
        viaDefault: to.viaDefault,
      };
      if (terminalKey(bundle.a) === first) bundle.forward.push(entry);
      else bundle.backward.push(entry);
    }

    const associations = entries.flatMap((entry, index): FlowAssociation[] => {
      const stateId = (entryNodes[index] as UjgJourneyEntry).stateRef;
      const vertex = stateVertex.get(stateId);
      if (!vertex) {
        issues.push(
          `${entry.id}: stateRef is not a state of ${journey["@id"]}`,
        );
        return [];
      }
      return [
        {
          key: `${entry.key}>`,
          entry: entry.key,
          target:
            vertex.kind === "frame"
              ? { vertex: vertex.key, port: "card" }
              : { vertex: vertex.key },
        },
      ];
    });

    return {
      kind: "journey",
      id: journey["@id"],
      occurrence,
      entries,
      exits,
      vertices,
      bundles: [...bundles].map(([key, bundle]) => ({ key, ...bundle })),
      associations,
    };
  };

  const { roots, rootless } = getJourneyStarts(document);
  const frames = [...roots, ...rootless].map((journey): FlowFrame => {
    const occurrence = { startJourneyRef: journey["@id"], steps: [] };
    const key = occurrenceKey(occurrence);
    return {
      key,
      card: journeyCard(journey, occurrence, key),
      content: buildJourney(journey, occurrence, []),
    };
  });
  return { frames, issues };
}
