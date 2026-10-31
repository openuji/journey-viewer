import {
  entryInto,
  exitFrom,
  journeyTouchpoints,
} from "@journey-viewer/ujg-jsonld";
import type {
  Journey,
  JourneyGraph,
  Transition,
} from "@journey-viewer/ujg-jsonld";
import type {
  InspectorDetail,
  InspectorDirection,
  InspectorPanelProps,
  InspectorTransitionGroup,
  InspectorTransitionItem,
} from "@journey-viewer/design-system";
import { resolveSelection } from "@/interaction";
import type { ViewerSelection } from "@/interaction";
import type { ViewerTarget } from "@/navigation";
import { childOccurrence, getOccurrenceTrail } from "@/occurrence";
import type { ViewerOccurrence } from "@/occurrence";
import { getOccurrenceLabels } from "@/occurrence-presentation";
import type { TouchpointPresentation } from "@/presentation";
import { touchpointColor, touchpointLabel } from "@/presentation";

/** A navigable inspector entry; the target is null when no explicit occurrence is known. */
export type InspectorDetailModel = Omit<InspectorDetail, "onSelect"> &
  Readonly<{ target: ViewerTarget | null }>;
export type InspectorGroupModel = Omit<InspectorTransitionGroup, "onSelect"> &
  Readonly<{ target: ViewerTarget | null }>;
export interface InspectorSectionModel {
  readonly title: string;
  readonly direction?: InspectorDirection;
  readonly count?: number;
  readonly empty?: string;
  readonly details?: readonly InspectorDetailModel[];
  readonly groups?: readonly InspectorGroupModel[];
}
export type InspectorModel = Omit<
  InspectorPanelProps,
  "sections" | "level" | "media" | "children"
> &
  Readonly<{
    sections: readonly InspectorSectionModel[];
  }>;

const plural = (count: number, one: string, many: string) =>
  `${count} ${count === 1 ? one : many}`;
const kindFor = (
  journey: Journey,
  id: string,
): ViewerSelection["kind"] | undefined =>
  journey.states.some((node) => node.id === id)
    ? "state"
    : journey.exits.some((node) => node.id === id)
      ? "exit"
      : journey.entries.some((node) => node.id === id)
        ? "entry"
        : undefined;

function childrenOf(journey: Journey, stateId: string): readonly Journey[] {
  const state = journey.states.find(
    (node) => node.id === stateId && node.kind === "composite",
  );
  return state?.kind === "composite" ? state.children : [];
}

/** Boundary wording for a transition that enters or leaves a composite's child journey. */
function annotation(journey: Journey, edge: Transition): string | undefined {
  const entered = childrenOf(journey, edge.to);
  const entry = entered.flatMap((child) => entryInto(edge, child) ?? [])[0];
  const enters =
    entered.length === 0
      ? undefined
      : `enters at ${entry ? entry.label : (edge.toEntry ?? "default entry")}${edge.toEntry ? "" : " (default)"}`;
  const exit = edge.fromExit
    ? childrenOf(journey, edge.from).flatMap(
        (child) => exitFrom(edge, child) ?? [],
      )[0]
    : undefined;
  const leaves = edge.fromExit
    ? `on child exit: ${exit ? exit.label : edge.fromExit}`
    : undefined;
  return [enters, leaves].filter(Boolean).join(" · ") || undefined;
}

/** Transitions grouped by the node at their other end, in first-appearance order. */
function groupTransitions(
  journey: Journey,
  edges: readonly Transition[],
  direction: InspectorDirection,
  occurrence: ViewerOccurrence | null,
): readonly InspectorGroupModel[] {
  const other = (edge: Transition) =>
    direction === "incoming" ? edge.from : edge.to;
  const ids = edges
    .map(other)
    .filter((id, index, all) => all.indexOf(id) === index);
  return ids.map((id) => {
    const kind = kindFor(journey, id);
    const node = [...journey.states, ...journey.exits, ...journey.entries].find(
      (candidate) => candidate.id === id,
    );
    const items: readonly InspectorTransitionItem[] = edges
      .filter((edge) => other(edge) === id)
      .map((edge) => {
        const note = annotation(journey, edge);
        return {
          id: edge.id,
          label: edge.label,
          tags: edge.tags.filter((tag) => tag.length > 0),
          ...(note ? { annotation: note } : {}),
        };
      });
    return {
      id: id,
      label: node ? node.label : id,
      exit: kind === "exit",
      items,
      target:
        kind && occurrence
          ? {
              selection: { kind, journeyId: journey.id, nodeId: id },
              occurrence,
            }
          : null,
    };
  });
}

const touchpointNames = (
  graph: JourneyGraph,
  journey: Journey,
  presentation: TouchpointPresentation,
) =>
  journeyTouchpoints(graph, journey.id)
    .map((node) => touchpointLabel(node, presentation))
    .join(", ");

/** Builds ephemeral design-system presentation data from the graph; nothing is stored. */
export function getInspectorModel(
  graph: JourneyGraph,
  selection: ViewerSelection | null,
  occurrence: ViewerOccurrence | null,
  presentation: TouchpointPresentation = {},
): InspectorModel | undefined {
  const resolved = selection ? resolveSelection(graph, selection) : undefined;
  if (!resolved || !selection) return undefined;
  const { journey, node } = resolved;
  const trail = occurrence ? getOccurrenceTrail(graph, occurrence) : [];
  const context = trail.at(-1)?.journey.id === journey.id ? occurrence : null;
  const parent = context ? trail.at(-2) : undefined;
  const via = context ? trail.at(-1)?.viaStateId : undefined;
  const { entries, exits, states, transitions } = journey;
  const target = (
    kind: ViewerSelection["kind"],
    owner: Journey,
    id: string,
    path: ViewerOccurrence | null,
  ): ViewerTarget | null =>
    path
      ? {
          selection: { kind, journeyId: owner.id, nodeId: id },
          occurrence: path,
        }
      : null;
  const transitionSections = (
    id: string,
    incomingTitle: string,
    outgoingTitle: string,
  ) => {
    const incoming = transitions.filter((edge) => edge.to === id);
    const outgoing = transitions.filter((edge) => edge.from === id);
    return [
      {
        title: incomingTitle,
        direction: "incoming",
        count: incoming.length,
        groups: groupTransitions(journey, incoming, "incoming", context),
      },
      {
        title: outgoingTitle,
        direction: "outgoing",
        count: outgoing.length,
        groups: groupTransitions(journey, outgoing, "outgoing", context),
      },
    ] as const satisfies readonly InspectorSectionModel[];
  };
  const parentSection = (
    title: string,
    direction: InspectorDirection,
    edges: readonly Transition[],
    empty: string,
  ): readonly InspectorSectionModel[] =>
    parent
      ? [
          {
            title,
            direction,
            count: edges.length,
            empty,
            groups: groupTransitions(
              parent.journey,
              edges,
              direction,
              parent.occurrence,
            ),
          },
        ]
      : [];
  const parentEdges = parent && via ? parent.journey.transitions : [];
  const composite =
    selection.kind === "state" ? childrenOf(journey, node.id) : [];
  const stateIndex = states.findIndex((state) => state.id === node.id);
  const sections: readonly InspectorSectionModel[] =
    selection.kind === "journey"
      ? [
          {
            title: "Entries",
            count: entries.length,
            details: entries.map((entry) => ({
              id: entry.id,
              label: entry.label,
              sub:
                entry.id === journey.defaultEntry
                  ? "Default entry"
                  : "Explicit entry",
              target: target("entry", journey, entry.id, context),
            })),
          },
          {
            title: "Exits",
            count: exits.length,
            details: exits.map((exit) => ({
              id: exit.id,
              label: exit.label,
              sub: "Exported exit",
              target: target("exit", journey, exit.id, context),
            })),
          },
        ]
      : selection.kind === "entry"
        ? [
            {
              title: "Starts at",
              details: entries
                .filter((entry) => entry.id === node.id)
                .map((entry) => {
                  const start = states.find(
                    (state) => state.id === entry.target,
                  );
                  return {
                    id: entry.target,
                    label: start ? start.label : entry.target,
                    sub:
                      entry.id === journey.defaultEntry
                        ? "Default entry"
                        : "Explicit entry",
                    target: start
                      ? target("state", journey, start.id, context)
                      : null,
                  };
                }),
            },
            ...parentSection(
              `Invoked from ${parent ? parent.journey.label : ""}`,
              "incoming",
              parentEdges.filter(
                (edge) =>
                  edge.to === via && entryInto(edge, journey)?.id === node.id,
              ),
              "No matching parent call sites",
            ),
          ]
        : selection.kind === "exit"
          ? [
              { ...transitionSections(node.id, "Produced by", "")[0] },
              ...parentSection(
                "Handled by parent",
                "outgoing",
                parentEdges.filter(
                  (edge) =>
                    edge.from === via &&
                    exitFrom(edge, journey)?.id === node.id,
                ),
                "No explicit parent handling",
              ),
            ]
          : [
              ...(composite.length
                ? [
                    {
                      title:
                        composite.length === 1
                          ? "Nested journey"
                          : "Nested journeys",
                      details: composite.map(
                        (child, childIndex): InspectorDetailModel => {
                          const childTouchpoint = journeyTouchpoints(
                            graph,
                            child.id,
                          )[0];
                          const color = childTouchpoint
                            ? touchpointColor(childTouchpoint, presentation)
                            : undefined;
                          const path =
                            context && stateIndex >= 0
                              ? childOccurrence(context, stateIndex, childIndex)
                              : null;
                          const valid =
                            path && getOccurrenceTrail(graph, path).length > 0
                              ? path
                              : null;
                          const from = touchpointNames(
                            graph,
                            journey,
                            presentation,
                          );
                          const to = touchpointNames(
                            graph,
                            child,
                            presentation,
                          );
                          return {
                            id: child.id,
                            label: child.label,
                            sub: [
                              plural(child.states.length, "state", "states"),
                              plural(child.entries.length, "entry", "entries"),
                              plural(child.exits.length, "exit", "exits"),
                            ].join(" · "),
                            ...(childTouchpoint
                              ? {
                                  touchpoint: {
                                    label: touchpointLabel(
                                      childTouchpoint,
                                      presentation,
                                    ),
                                    ...(color ? { color } : {}),
                                  },
                                }
                              : {}),
                            ...(from !== to && to
                              ? {
                                  note: `Touchpoint change: ${from || "none"} → ${to}`,
                                }
                              : {}),
                            target: child.states[0]
                              ? target(
                                  "state",
                                  child,
                                  child.states[0].id,
                                  valid,
                                )
                              : target("journey", child, child.id, valid),
                          };
                        },
                      ),
                    },
                  ]
                : []),
              ...transitionSections(node.id, "Incoming", "Outgoing"),
            ];
  const labels = context
    ? getOccurrenceLabels(graph, context).map((crumb) => crumb.label)
    : [journey.label];
  return {
    title: node.label,
    typeLabel:
      selection.kind === "journey"
        ? "Journey"
        : selection.kind === "entry"
          ? "Journey entry"
          : selection.kind === "exit"
            ? "Journey exit"
            : composite.length
              ? "Composite state"
              : "State",
    identity: node.id,
    crumb: labels.join(" / "),
    touchpoints: journeyTouchpoints(graph, journey.id).map((touchpoint) => {
      const color = touchpointColor(touchpoint, presentation);
      return {
        id: touchpoint.id,
        label: touchpoint.label,
        ...(color ? { color } : {}),
      };
    }),
    footnote: [
      journey.label,
      plural(entries.length, "entry", "entries"),
      plural(exits.length, "exported exit", "exported exits"),
    ].join(" · "),
    sections,
  };
}
