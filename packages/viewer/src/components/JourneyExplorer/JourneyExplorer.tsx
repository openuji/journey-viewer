import {
  JourneyContractControls,
  JourneyNest,
  StateRow,
} from "@journey-viewer/design-system";
import type {
  HeadingLevel,
  JourneyExitRouteMark,
  StateRowProps,
} from "@journey-viewer/design-system";
import { journeyTouchpoints } from "@journey-viewer/ujg-jsonld";
import type { Journey, JourneyGraph } from "@journey-viewer/ujg-jsonld";
import type { ViewerInteraction, ViewerSelection } from "@/interaction";
import { sameSelection } from "@/interaction";
import type { ViewerNavigation, ViewerTarget } from "@/navigation";
import {
  getRouteDescription,
  getRowHighlight,
  matchesTouchpoints,
} from "@/navigation";
import { childOccurrence, sameOccurrence } from "@/occurrence";
import type { ViewerOccurrence } from "@/occurrence";
import { HierarchyTree } from "@/components/JourneyHierarchy/HierarchyTree";
import type { JourneyScreenControls } from "@/components/JourneyScreens/JourneyScreens";
import type { TouchpointPresentation } from "@/presentation";
import { touchpointColor, touchpointLabel } from "@/presentation";
import { getNodeScreens } from "@/screens";
import type { ViewerExtensions, ViewerStateContext } from "@/extensions";
import { JourneyAnnotations } from "@/components/JourneyAnnotations/JourneyAnnotations";
import { BrowserColumns } from "@/browser/BrowserColumns";
import { BrowserScreenButton } from "@/browser/BrowserScreenButton";
import type { PreviewAnchor } from "@/preview-placement";
import styles from "@/components/JourneyExplorer/JourneyExplorer.module.css";

/** Screenshot actions for rows; `onPreview` receives the opener's viewport rectangle, then null. */
export interface JourneyExplorerMedia extends JourneyScreenControls {
  readonly onPreview?: (
    target: ViewerTarget,
    surfaceId: string,
    anchor: PreviewAnchor | null,
  ) => void;
}

export interface JourneyExplorerProps {
  readonly graph: JourneyGraph;
  readonly interaction: ViewerInteraction;
  readonly onSelect: (
    selection: ViewerSelection,
    occurrence: ViewerOccurrence,
  ) => void;
  readonly onToggleChildren: (journeyId: string, stateId: string) => void;
  /** Shows or hides a journey's entry/exit list; the list stays closed without it. */
  readonly onToggleContracts?: (journeyId: string) => void;
  readonly navigation?: ViewerNavigation;
  readonly onHover?: (
    selection: ViewerSelection | null,
    occurrence: ViewerOccurrence | null,
  ) => void;
  readonly level?: HeadingLevel;
  readonly media?: JourneyExplorerMedia;
  readonly touchpoints?: TouchpointPresentation;
  readonly extensions?: Pick<
    ViewerExtensions,
    "annotations" | "stateOverrides"
  >;
}

const primaryTouchpoint = (
  graph: JourneyGraph,
  journey: Journey,
  presentation: TouchpointPresentation,
) => {
  const touchpoint = journeyTouchpoints(graph, journey.id)[0];
  if (!touchpoint) return undefined;
  const color = touchpointColor(touchpoint, presentation);
  return {
    id: touchpoint.id,
    label: touchpointLabel(touchpoint, presentation),
    ...(color ? { color } : {}),
  };
};

const exitRouteMarks = (
  journey: Journey,
  active: ViewerSelection | null,
): readonly JourneyExitRouteMark[] => {
  if (active?.kind !== "state" || active.journeyId !== journey.id) return [];
  const state = journey.states.find((node) => node.id === active.nodeId);
  if (!state) return [];
  const seen = new Set<string>();
  return journey.exits.flatMap((exit) => {
    if (seen.has(exit.id)) return [];
    seen.add(exit.id);
    const edges = journey.transitions.filter(
      (edge) => edge.from === active.nodeId && edge.to === exit.id,
    );
    return edges.length
      ? [
          {
            exitId: exit.id,
            count: edges.length,
            title: [
              `${state.label} → ${exit.label}:`,
              ...edges.map((edge) => `• ${edge.label}`),
            ].join("\n"),
          },
        ]
      : [];
  });
};

/** Controlled UJG composition; callers own the immutable snapshot and its transitions. */
export function JourneyExplorer({
  interaction,
  navigation,
  onSelect,
  onToggleChildren,
  onToggleContracts,
  onHover,
  media,
  touchpoints = {},
  extensions,
  ...props
}: JourneyExplorerProps) {
  const { graph } = props;
  const columns = navigation?.mode === "columns";
  const touchpointIds = navigation?.touchpointIds ?? [];
  const filtered = (journey: Journey) =>
    !matchesTouchpoints(graph, journey.id, touchpointIds);
  return (
    <HierarchyTree
      {...props}
      touchpointPresentation={touchpoints}
      isJourneyFiltered={filtered}
      isJourneyMatched={(journey) =>
        touchpointIds.length > 0 && !filtered(journey)
      }
      {...(columns
        ? {
            occurrences: navigation.lanes,
            renderColumns: (lanes) => (
              <BrowserColumns
                count={navigation.lanes.length}
                className={styles.columns}
              >
                {lanes}
              </BrowserColumns>
            ),
          }
        : {})}
      renderNested={(journey, _occurrence, content) => {
        const touchpoint = primaryTouchpoint(graph, journey, touchpoints);
        return (
          <JourneyNest
            matched={touchpointIds.length > 0 && !filtered(journey)}
            {...(touchpoint?.color ? { color: touchpoint.color } : {})}
          >
            {content}
          </JourneyNest>
        );
      }}
      {...(extensions?.annotations
        ? {
            renderJourneyAction: (
              journey: Journey,
              occurrence: ViewerOccurrence,
            ) => {
              const target: ViewerSelection = {
                kind: "journey",
                journeyId: journey.id,
                nodeId: journey.id,
              };
              return (
                <JourneyAnnotations
                  annotations={extensions.annotations!}
                  context={{
                    graph,
                    journey,
                    node: journey,
                    selection: target,
                    occurrence,
                  }}
                />
              );
            },
          }
        : {})}
      renderState={({
        journey,
        state,
        stateIndex,
        occurrence,
        childJourneys,
        renderChildren,
      }) => {
        const target: ViewerSelection = {
          kind: "state",
          journeyId: journey.id,
          nodeId: state.id,
        };
        const childPaths = childJourneys.map((_, childIndex) =>
          childOccurrence(occurrence, stateIndex, childIndex),
        );
        const expanded = columns
          ? childPaths.some((path) =>
              navigation.lanes.some((lane) => sameOccurrence(lane, path)),
            )
          : childJourneys.some((child) =>
              interaction.expandedJourneys.includes(child.id),
            );
        const highlight = getRowHighlight(
          graph,
          interaction,
          navigation,
          journey.id,
          state.id,
        );
        const parentTouchpoints = journeyTouchpoints(graph, journey.id).map(
          (node) => node.id,
        );
        const crossingJourney = childJourneys.find((child) => {
          const first = journeyTouchpoints(graph, child.id)[0];
          return first !== undefined && !parentTouchpoints.includes(first.id);
        });
        const crossing = crossingJourney
          ? primaryTouchpoint(graph, crossingJourney, touchpoints)
          : undefined;
        const color = primaryTouchpoint(graph, journey, touchpoints)?.color;
        const screens = media
          ? getNodeScreens(graph, media.screenshots, state.id).filter(
              (screen) => screen.source,
            )
          : [];
        const context: ViewerStateContext = {
          graph,
          journey,
          node: state,
          selection: target,
          occurrence,
        };
        const row: StateRowProps = {
          label: state.label,
          ...(!columns && childJourneys.length
            ? {
                description: childJourneys
                  .map((child) => child.label)
                  .join(" · "),
              }
            : {}),
          composite: childJourneys.length > 0,
          expanded,
          selected: sameSelection(interaction.selection, target),
          filtered: filtered(journey),
          ...(highlight
            ? {
                tone: highlight.tone,
                marks: {
                  incoming: highlight.incoming,
                  ...(highlight.selfLoops
                    ? { selfLoops: highlight.selfLoops }
                    : {}),
                  outgoing: highlight.outgoing,
                  title: getRouteDescription(
                    graph,
                    navigation,
                    interaction,
                    journey.id,
                    state.id,
                  ),
                },
              }
            : {}),
          ...(crossing
            ? {
                crossing: {
                  label: crossing.label,
                  ...(crossing.color ? { color: crossing.color } : {}),
                },
              }
            : {}),
          onSelect: () => onSelect(target, occurrence),
          onHover: (hovered) =>
            onHover?.(hovered ? target : null, hovered ? occurrence : null),
          actions:
            media &&
            screens.map((screen) => (
              <BrowserScreenButton
                key={screen.surface.id}
                label={
                  screens.length > 1
                    ? `Screen mockup: ${state.label} (${screen.surface.id})`
                    : `Screen mockup: ${state.label}`
                }
                {...(color ? { color } : {})}
                onOpen={() =>
                  media.onOpen(
                    { selection: target, occurrence },
                    screen.surface.id,
                  )
                }
                onPreview={(anchor) =>
                  media.onPreview?.(
                    { selection: target, occurrence },
                    screen.surface.id,
                    anchor,
                  )
                }
              />
            )),
          ...(childJourneys.length === 0 && renderChildren
            ? { notice: renderChildren({ visibleJourneyIds: [] }) }
            : {}),
          ...(childJourneys.length > 0 && !columns
            ? {
                onToggle: () => onToggleChildren(journey.id, state.id),
                children:
                  expanded &&
                  renderChildren?.({
                    visibleJourneyIds: interaction.expandedJourneys,
                  }),
              }
            : {}),
        };
        const override = extensions?.stateOverrides?.find((candidate) =>
          candidate.matches(context),
        );
        const Component = override?.Component;
        return (
          <>
            {extensions?.annotations && (
              <JourneyAnnotations
                context={context}
                annotations={extensions.annotations}
              />
            )}
            {Component ? (
              <Component key={override.id} context={context} row={row} />
            ) : (
              <StateRow {...row} />
            )}
          </>
        );
      }}
      renderContracts={(journey, contracts, occurrence) => (
        <JourneyContractControls
          {...contracts}
          exitRoutes={exitRouteMarks(
            journey,
            navigation?.hover ?? interaction.selection,
          )}
          open={interaction.openContracts.includes(journey.id)}
          onToggle={() => onToggleContracts?.(journey.id)}
          filtered={filtered(journey)}
          selection={
            interaction.selection?.journeyId === journey.id &&
            (interaction.selection.kind === "entry" ||
              interaction.selection.kind === "exit")
              ? {
                  kind: interaction.selection.kind,
                  id: interaction.selection.nodeId,
                }
              : null
          }
          onSelect={(kind, nodeId) =>
            onSelect({ kind, nodeId, journeyId: journey.id }, occurrence)
          }
        />
      )}
    />
  );
}
