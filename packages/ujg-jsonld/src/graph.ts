/**
 * A journey graph as viewers render it, independent of the UJG version it was read from. A
 * version adapter derives it once per document and nothing edits it. Ids are the document's
 * identifiers, copied and never parsed. Containment lists hold the nodes themselves in the
 * document's reference order, keeping repeats and leaving out unresolved references; journeys can
 * be reused and recursive, so the graph may contain cycles. Associations hold ids.
 */
export interface JourneyGraph {
  readonly id: string;
  /** The document's own label, when it has one; nothing stands in for it. */
  readonly label?: string;
  /** Every journey, in document order. */
  readonly journeys: readonly Journey[];
  /** Journeys no composite opens, in document order. */
  readonly roots: readonly Journey[];
  /** Journeys no root reaches, such as mutually recursive ones, in document order. */
  readonly rootless: readonly Journey[];
  /** Every state and composite, in document order. */
  readonly states: readonly State[];
  readonly entries: readonly Entry[];
  readonly exits: readonly Exit[];
  readonly transitions: readonly Transition[];
  readonly touchpoints: readonly Touchpoint[];
  readonly surfaces: readonly Surface[];
}

interface Labeled<Kind extends string> {
  readonly kind: Kind;
  readonly id: string;
  /** The node's label, or its id when it has none. */
  readonly label: string;
  readonly tags: readonly string[];
}

export interface Journey extends Labeled<"journey"> {
  readonly entries: readonly Entry[];
  /** The entry used when nothing selects one. An id that may name none of `entries`. */
  readonly defaultEntry?: string;
  readonly states: readonly State[];
  readonly exits: readonly Exit[];
  readonly transitions: readonly Transition[];
}

export type PlainState = Labeled<"state">;

export interface CompositeState extends Labeled<"composite"> {
  /** The child journeys it opens, in order, keeping repeats and recursion. */
  readonly children: readonly Journey[];
}

export type State = PlainState | CompositeState;

export interface Entry extends Labeled<"entry"> {
  /** The id of the state its journey starts at. */
  readonly target: string;
}

export type Exit = Labeled<"exit">;

export interface Transition extends Labeled<"transition"> {
  /** The id of the local state it leaves. */
  readonly from: string;
  /** The id of the local state or exit it reaches. */
  readonly to: string;
  /** The child entry it selects when `to` is a composite. An id that may name no entry. */
  readonly toEntry?: string;
  /** The child exit it continues after when `from` is a composite. An id that may name no exit. */
  readonly fromExit?: string;
}

export interface Touchpoint {
  readonly kind: "touchpoint";
  readonly id: string;
  readonly label: string;
  /** Ids of the journeys it names. */
  readonly journeys: readonly string[];
}

export interface Surface {
  readonly kind: "surface";
  readonly id: string;
  /** The id of the node it shows. */
  readonly node: string;
}

/**
 * Where a transition into a composite starts `child`, one of its child journeys: the selected
 * entry when `child` has it, otherwise, when the transition selects none, `child`'s default entry.
 * Undefined when neither resolves; nothing is inferred from order.
 */
export function entryInto(
  transition: Transition,
  child: Journey,
): Entry | undefined {
  const id = transition.toEntry ?? child.defaultEntry;
  return child.entries.find((entry) => entry.id === id);
}

/** The exit of `child` after which a transition out of its composite continues, if it names one. */
export function exitFrom(
  transition: Transition,
  child: Journey,
): Exit | undefined {
  return transition.fromExit === undefined
    ? undefined
    : child.exits.find((exit) => exit.id === transition.fromExit);
}

/** Touchpoints that name the journey, in document order; nothing is inherited from parents. */
export function journeyTouchpoints(
  graph: JourneyGraph,
  journeyId: string,
): readonly Touchpoint[] {
  return graph.touchpoints.filter((touchpoint) =>
    touchpoint.journeys.includes(journeyId),
  );
}

/** Surfaces that show the node, in document order, without choosing one. */
export function nodeSurfaces(
  graph: JourneyGraph,
  nodeId: string,
): readonly Surface[] {
  return graph.surfaces.filter((surface) => surface.node === nodeId);
}

/** Roots are the journeys no composite opens; rootless ones are those no root reaches. */
export function journeyStarts(
  journeys: readonly Journey[],
): Readonly<{ roots: readonly Journey[]; rootless: readonly Journey[] }> {
  const children = (journey: Journey) =>
    journey.states.flatMap((state) =>
      state.kind === "composite" ? state.children : [],
    );
  const referenced = new Set(
    journeys.flatMap(children).map((journey) => journey.id),
  );
  const roots = journeys.filter((journey) => !referenced.has(journey.id));
  const reached = new Set<string>();
  const visit = (journey: Journey): void => {
    if (reached.has(journey.id)) return;
    reached.add(journey.id);
    children(journey).forEach(visit);
  };
  roots.forEach(visit);
  return {
    roots,
    rootless: journeys.filter((journey) => !reached.has(journey.id)),
  };
}
