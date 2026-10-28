import {
  getChildJourneys,
  getJourneyEntries,
  getJourneyExits,
  getJourneyStates,
  getJourneyTransitions,
  getNodeSurfaces,
  getNodesByType,
} from "@journey-viewer/ujg-jsonld";
import type {
  UjgCompositeState,
  UjgDocument,
  UjgJourney,
  UjgJourneyEntry,
  UjgJourneyExit,
  UjgState,
  UjgTransition,
} from "@journey-viewer/ujg-jsonld";
import type {
  ViewerInteraction,
  ViewerOccurrence,
  ViewerTarget,
} from "@journey-viewer/viewer";

/**
 * A display projection of canonical UJG for one interaction snapshot. Every element references the
 * original node and its explicit occurrence; nothing here is a second graph model. It is rebuilt
 * whenever the document or the expansion changes and never retained.
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
  readonly journey: UjgJourney;
  readonly occurrence: ViewerOccurrence;
  readonly entries: readonly FlowContract[];
  readonly exits: readonly FlowContract[];
  readonly vertices: readonly FlowVertex[];
  readonly bundles: readonly FlowBundle[];
  readonly associations: readonly FlowAssociation[];
}

/**
 * The card a frame grows from. A root journey's card names the journey; an open composite's card is
 * the same card the collapsed composite shows, so both states share `key`.
 */
export interface FlowCard {
  readonly key: string;
  readonly kind: "journey" | "composite";
  readonly journey: UjgJourney;
  readonly occurrence: ViewerOccurrence;
  readonly node: UjgJourney | UjgCompositeState;
  readonly children: readonly UjgJourney[];
  readonly recursive: readonly UjgJourney[];
  /** Absent for root journeys and composites without children. */
  readonly toggle: "expand" | "collapse" | null;
  readonly outgoingGroups: number;
}

export type FlowVertex =
  FlowStateVertex | FlowCompositeVertex | FlowFrameVertex;

interface VertexBase {
  readonly key: string;
  readonly journey: UjgJourney;
  readonly occurrence: ViewerOccurrence;
  readonly stateIndex: number;
}

export interface FlowStateVertex extends VertexBase {
  readonly kind: "state";
  readonly node: UjgState;
  readonly outgoing: number;
  /** Explicitly associated surfaces; reserves the screen action whatever the screenshot map says. */
  readonly surfaces: number;
}

/** A closed, recursive or childless composite. */
export interface FlowCompositeVertex extends VertexBase {
  readonly kind: "composite";
  readonly node: UjgCompositeState;
  readonly card: FlowCard;
}

/** An open composite: its frame stands in for the vertex in the parent journey. */
export interface FlowFrameVertex extends VertexBase {
  readonly kind: "frame";
  readonly node: UjgCompositeState;
  readonly frame: FlowFrame;
}

export interface FlowContract {
  readonly kind: "entry" | "exit";
  readonly key: string;
  readonly node: UjgJourneyEntry | UjgJourneyExit;
  readonly journey: UjgJourney;
  readonly occurrence: ViewerOccurrence;
  readonly isDefault: boolean;
}

/**
 * Where a connector attaches. `port` names a contract of an open composite (`entry:<id>`,
 * `exit:<id>`), its card (`card`, arrival without a resolved entry) or its generic departure
 * (`out`, departure without `fromExitRef`).
 */
export interface FlowTerminal {
  readonly vertex: string;
  readonly port?: string;
}

export interface FlowTransition {
  readonly node: UjgTransition;
  /** No `toEntryRef`; the single child's `defaultEntryRef` resolved the entry (UJG ED Graph). */
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

/** An entry's `stateRef`: an association, not a transition. */
export interface FlowAssociation {
  readonly key: string;
  readonly entry: string;
  readonly target: FlowTerminal;
}

export const occurrenceKey = (occurrence: ViewerOccurrence): string =>
  [
    occurrence.startJourneyRef,
    ...occurrence.steps.map((step) => `${step.stateIndex}.${step.childIndex}`),
  ].join(" ");

export const terminalKey = (terminal: FlowTerminal): string =>
  terminal.port ? `${terminal.vertex}#${terminal.port}` : terminal.vertex;

/** The selection a card stands for: its composite state, or the journey it heads. */
export const cardTarget = (card: FlowCard): ViewerTarget => ({
  selection:
    card.kind === "journey"
      ? {
          kind: "journey",
          journeyRef: card.node["@id"],
          nodeRef: card.node["@id"],
        }
      : {
          kind: "state",
          journeyRef: card.journey["@id"],
          nodeRef: card.node["@id"],
        },
  occurrence: card.occurrence,
});

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
      card.node["@id"] === target.selection.nodeRef &&
      card.occurrence.steps.length === target.occurrence.steps.length &&
      encloses(card.occurrence, target.occurrence)) ||
    journeys.some((journey) => encloses(journey.occurrence, target.occurrence))
  );
}

const isComposite = (node: UjgState | UjgCompositeState) =>
  "subjourneyRefs" in node;

/** Roots, then journeys no root reaches, exactly as the tree starts its occurrences. */
export function journeyStarts(document: UjgDocument): readonly UjgJourney[] {
  const journeys = getNodesByType(document, "Journey");
  const children = (journey: UjgJourney) =>
    getJourneyStates(document, journey).flatMap((state) =>
      isComposite(state)
        ? getChildJourneys(document, state as UjgCompositeState)
        : [],
    );
  const referenced = new Set(
    journeys.flatMap(children).map((journey) => journey["@id"]),
  );
  const roots = journeys.filter((journey) => !referenced.has(journey["@id"]));
  const reached = new Set<string>();
  const visit = (journey: UjgJourney) => {
    if (reached.has(journey["@id"])) return;
    reached.add(journey["@id"]);
    children(journey).forEach(visit);
  };
  roots.forEach(visit);
  return [
    ...roots,
    ...journeys.filter((journey) => !reached.has(journey["@id"])),
  ];
}

export function buildFlowScene(
  document: UjgDocument,
  interaction: Pick<ViewerInteraction, "expandedJourneys">,
): FlowScene {
  const issues: string[] = [];
  const expanded = new Set(interaction.expandedJourneys);
  const groupCount = (journey: UjgJourney) =>
    journey.outgoingTransitionGroupRefs?.length ?? 0;

  const compositeCard = (
    journey: UjgJourney,
    occurrence: ViewerOccurrence,
    node: UjgCompositeState,
    key: string,
    ancestors: readonly string[],
  ): FlowCard => {
    const children = getChildJourneys(document, node);
    const recursive = children.filter((child) =>
      ancestors.includes(child["@id"]),
    );
    const openable = children.length > recursive.length;
    const open =
      openable && children.some((child) => expanded.has(child["@id"]));
    return {
      key,
      kind: "composite",
      journey,
      occurrence,
      node,
      children,
      recursive,
      toggle: openable ? (open ? "collapse" : "expand") : null,
      outgoingGroups: 0,
    };
  };

  const buildJourney = (
    journey: UjgJourney,
    occurrence: ViewerOccurrence,
    ancestors: readonly string[],
  ): FlowJourney => {
    const prefix = occurrenceKey(occurrence);
    const lineage = [...ancestors, journey["@id"]];
    const entries = getJourneyEntries(document, journey).map(
      (node): FlowContract => ({
        kind: "entry",
        key: `${prefix}|entry:${node["@id"]}`,
        node,
        journey,
        occurrence,
        isDefault: journey.defaultEntryRef === node["@id"],
      }),
    );
    const exits = getJourneyExits(document, journey).map(
      (node): FlowContract => ({
        kind: "exit",
        key: `${prefix}|exit:${node["@id"]}`,
        node,
        journey,
        occurrence,
        isDefault: false,
      }),
    );
    const vertices = getJourneyStates(document, journey).map(
      (node, stateIndex): FlowVertex => {
        const key = `${prefix}|${stateIndex}:${node["@id"]}`;
        const base = { key, journey, occurrence, stateIndex };
        if (!isComposite(node))
          return {
            ...base,
            kind: "state",
            node: node as UjgState,
            outgoing: (node as UjgState).outgoingTransitionRefs?.length ?? 0,
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
          return { ...base, kind: "composite", node: composite, card };
        const childFrames = card.children.flatMap((child, childIndex) =>
          card.recursive.includes(child)
            ? []
            : [
                {
                  key: `${key}/${childIndex}`,
                  card: {
                    key: `${key}/${childIndex}`,
                    kind: "journey" as const,
                    journey: child,
                    occurrence: childOf(occurrence, stateIndex, childIndex),
                    node: child,
                    children: [],
                    recursive: [],
                    toggle: null,
                    outgoingGroups: groupCount(child),
                  },
                  content: buildJourney(
                    child,
                    childOf(occurrence, stateIndex, childIndex),
                    lineage,
                  ),
                },
              ],
        );
        // One child merges into the composite's own frame; several become a row of child frames.
        const frame: FlowFrame =
          childFrames.length === 1
            ? { key, card, content: childFrames[0]!.content }
            : { key, card, content: { kind: "row", frames: childFrames } };
        return { ...base, kind: "frame", node: composite, frame };
      },
    );

    const stateVertex = new Map<string, FlowVertex>();
    for (const vertex of vertices)
      if (!stateVertex.has(vertex.node["@id"]))
        stateVertex.set(vertex.node["@id"], vertex);
    const exitByRef = new Map(exits.map((exit) => [exit.node["@id"], exit]));
    const childJourneysOf = (vertex: FlowFrameVertex) =>
      vertex.frame.content.kind === "row"
        ? vertex.frame.content.frames.map(
            (frame) => (frame.content as FlowJourney).journey,
          )
        : [vertex.frame.content.journey];
    const contractOwner = (
      vertex: FlowFrameVertex,
      ref: string,
      kind: "entry" | "exit",
    ) =>
      childJourneysOf(vertex).find((child) =>
        (kind === "entry" ? child.entryRefs : (child.exitRefs ?? [])).includes(
          ref,
        ),
      );

    const source = (transition: UjgTransition): FlowTerminal | undefined => {
      const vertex = stateVertex.get(transition.from);
      if (!vertex) return undefined;
      if (vertex.kind !== "frame") return { vertex: vertex.key };
      const ref = transition.fromExitRef;
      if (ref && contractOwner(vertex, ref, "exit"))
        return { vertex: vertex.key, port: `exit:${ref}` };
      if (ref)
        issues.push(
          `${transition["@id"]}: fromExitRef ${ref} is not an exit of a child of ${vertex.node["@id"]}`,
        );
      return { vertex: vertex.key, port: "out" };
    };
    const target = (
      transition: UjgTransition,
    ): { terminal: FlowTerminal; viaDefault: boolean } | undefined => {
      const exit = exitByRef.get(transition.to);
      if (exit) return { terminal: { vertex: exit.key }, viaDefault: false };
      const vertex = stateVertex.get(transition.to);
      if (!vertex) return undefined;
      if (vertex.kind !== "frame")
        return { terminal: { vertex: vertex.key }, viaDefault: false };
      const ref = transition.toEntryRef;
      if (ref && contractOwner(vertex, ref, "entry"))
        return {
          terminal: { vertex: vertex.key, port: `entry:${ref}` },
          viaDefault: false,
        };
      if (ref)
        issues.push(
          `${transition["@id"]}: toEntryRef ${ref} is not an entry of a child of ${vertex.node["@id"]}`,
        );
      const children = childJourneysOf(vertex);
      const fallback =
        !ref && children.length === 1
          ? children[0]!.defaultEntryRef
          : undefined;
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
      const entry = { node: transition, viaDefault: to.viaDefault };
      if (terminalKey(bundle.a) === first) bundle.forward.push(entry);
      else bundle.backward.push(entry);
    }

    const associations = entries.flatMap((entry): FlowAssociation[] => {
      const vertex = stateVertex.get((entry.node as UjgJourneyEntry).stateRef);
      if (!vertex) {
        issues.push(
          `${entry.node["@id"]}: stateRef is not a state of ${journey["@id"]}`,
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
      journey,
      occurrence,
      entries,
      exits,
      vertices,
      bundles: [...bundles].map(([key, bundle]) => ({ key, ...bundle })),
      associations,
    };
  };

  const frames = journeyStarts(document).map((journey): FlowFrame => {
    const occurrence = { startJourneyRef: journey["@id"], steps: [] };
    const key = occurrenceKey(occurrence);
    return {
      key,
      card: {
        key,
        kind: "journey",
        journey,
        occurrence,
        node: journey,
        children: [],
        recursive: [],
        toggle: null,
        outgoingGroups: groupCount(journey),
      },
      content: buildJourney(journey, occurrence, []),
    };
  });
  return { frames, issues };
}

const childOf = (
  parent: ViewerOccurrence,
  stateIndex: number,
  childIndex: number,
): ViewerOccurrence => ({
  startJourneyRef: parent.startJourneyRef,
  steps: [...parent.steps, { stateIndex, childIndex }],
});
