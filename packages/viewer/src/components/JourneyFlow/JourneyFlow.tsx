import { useMemo } from "react";
import type { ReactNode } from "react";
import { CanvasHeader, JourneyPath } from "@journey-viewer/design-system";
import type { Placement } from "@journey-viewer/flow-layout";
import { journeyTouchpoints } from "@journey-viewer/ujg-jsonld";
import type { JourneyGraph } from "@journey-viewer/ujg-jsonld";
import { sameSelection } from "@/interaction";
import type { ViewerInteraction, ViewerSelection } from "@/interaction";
import { matchesTouchpoints } from "@/navigation";
import type { ViewerTarget } from "@/navigation";
import { sameOccurrence } from "@/occurrence";
import { getNodeScreens } from "@/screens";
import type { ScreenshotMap } from "@/screens";
import { touchpointColor, touchpointLabel } from "@/presentation";
import type { TouchpointPresentation } from "@/presentation";
import type { DisclosureAction } from "@/disclosure";
import { blockRects } from "@/flow/blocks";
import { composeFlow } from "@/flow/compose";
import { flowLevel } from "@/flow/geometry";
import { flowHighlight } from "@/flow/highlight";
import { sceneForRoots } from "@/flow/roots";
import type { FlowRootScope } from "@/flow/roots";
import { buildFlowScene, frameShows } from "@/flow/scene";
import type { FlowCard, FlowFrame } from "@/flow/scene";
import type { TextMeasure } from "@/flow/text";
import { BrowserFlowViewport } from "@/browser/BrowserFlowViewport";
import { BrowserTextMeasure } from "@/browser/BrowserTextMeasure";
import { FlowScene } from "@/components/JourneyFlow/FlowScene";
import styles from "@/components/JourneyFlow/JourneyFlow.module.css";

export type FlowZoomLevel = "actual" | "fit";

/**
 * Bring a block, or the block of a selection target, to the canvas's top-left corner; or return
 * the canvas to its first view (`start`), as after a reset.
 */
export type FlowReveal =
  | Readonly<{ block: string; focus?: boolean }>
  | Readonly<{ target: ViewerTarget }>
  | Readonly<{ start: true }>;

/** Where the screen stays through the next layout, and what it brings into view. */
export interface FlowView {
  /** A block key (`card:…`, `state:…`) whose screen position the next layout keeps. */
  readonly anchor: string | null;
  /** Served once per new object. */
  readonly reveal: FlowReveal | null;
}

export interface JourneyFlowProps {
  /** Keep this reference stable between actual replacements; a new one lays the flow out again. */
  readonly graph: JourneyGraph;
  /** The expansion and selection shared with Tree and Columns. */
  readonly interaction: ViewerInteraction;
  /** The node last clicked, expanded or returned to; the journey path leads to it. */
  readonly location: ViewerTarget | null;
  readonly placement?: Placement;
  readonly zoom?: FlowZoomLevel;
  /**
   * Every root journey (the default), or one at a time: the root the location starts from, with
   * the others a choice on the first step of the journey path, and only the shown one laid out.
   */
  readonly roots?: FlowRootScope;
  readonly screenshots?: ScreenshotMap;
  readonly touchpoints?: TouchpointPresentation;
  /** The touchpoint filter: blocks of other journeys recede. */
  readonly touchpointIds?: readonly string[];
  /** A hovered or focused block, whose routes show without selecting it. */
  readonly active?: ViewerSelection | null;
  readonly view?: FlowView;
  /** The canvas header's command plane, beside the journey path. */
  readonly commands?: ReactNode;
  readonly label?: string;
  readonly className?: string | undefined;
  /** Every selection, screen and disclosure change, with where the screen should stay. */
  readonly onAction: (action: DisclosureAction, view: FlowView) => void;
  /** The active journey's own path step: only the screen moves. */
  readonly onView: (view: FlowView) => void;
  readonly onActivate: (selection: ViewerSelection | null) => void;
}

const still: FlowView = { anchor: null, reveal: null };

/**
 * Controlled flow chart of a journey document: nested frames for open journeys, contracts on their
 * borders, metro-style connectors and the active step's routes, under a canvas header that holds
 * the journey path and the commands. The page's fonts size the layout, which reruns only for the
 * document, the expansion and the placement.
 */
export function JourneyFlow(props: JourneyFlowProps) {
  return (
    <BrowserTextMeasure>
      {(measure) =>
        measure ? (
          <FlowCanvas {...props} measure={measure} />
        ) : (
          <div
            className={[styles.flow, props.className].filter(Boolean).join(" ")}
          />
        )
      }
    </BrowserTextMeasure>
  );
}

function FlowCanvas({
  graph,
  interaction,
  location,
  placement = "median",
  zoom = "actual",
  roots = "all",
  screenshots = {},
  touchpoints = {},
  touchpointIds = [],
  active = null,
  view = still,
  commands,
  label = "Journey flow",
  className,
  onAction,
  onView,
  onActivate,
  measure,
}: JourneyFlowProps & { readonly measure: TextMeasure }) {
  const { expandedJourneys } = interaction;
  const scene = useMemo(
    () => buildFlowScene(graph, { expandedJourneys }),
    [graph, expandedJourneys],
  );
  const startJourneyId = location?.occurrence.startJourneyId;
  const staged = useMemo(
    () => sceneForRoots(scene, roots, startJourneyId),
    [scene, roots, startJourneyId],
  );
  const layout = useMemo(
    () => composeFlow(staged, flowLevel(placement), measure),
    [staged, placement, measure],
  );
  const blocks = useMemo(() => blockRects(layout), [layout]);
  // A target asks for the block that shows it in this layout, which arrives with the request.
  const reveal = useMemo(() => {
    const request = view.reveal;
    if (!request || !("target" in request)) return request;
    const { selection, occurrence } = request.target;
    const shows = (target: ViewerTarget) =>
      sameSelection(target.selection, selection) &&
      sameOccurrence(target.occurrence, occurrence);
    const block = [
      ...layout.states.map((s) => [`state:${s.key}`, s.vertex.target] as const),
      ...layout.contracts.map(
        (c) => [`contract:${c.key}`, c.contract.target] as const,
      ),
      ...layout.cards.map((c) => [`card:${c.key}`, c.card.target] as const),
    ].find(([, target]) => shows(target))?.[0];
    return block ? { block } : null;
  }, [view.reveal]);

  const touchpointOf = (journeyId: string) => {
    const touchpoint = journeyTouchpoints(graph, journeyId)[0];
    if (!touchpoint) return undefined;
    const color = touchpointColor(touchpoint, touchpoints);
    return {
      label: touchpointLabel(touchpoint, touchpoints),
      ...(color ? { color } : {}),
    };
  };
  // Activation (hover or focus) shows a block's routes; the selection keeps its own look.
  const chosen = flowHighlight(layout, interaction.selection);
  const highlight = active
    ? { ...flowHighlight(layout, active), selected: chosen.selected }
    : chosen;
  // The first view keeps the selection in sight.
  const selectedBlock =
    [
      ...layout.states.map((s) => [`state:${s.key}`, s.key] as const),
      ...layout.contracts.map((c) => [`contract:${c.key}`, c.key] as const),
      ...layout.cards.map((c) => [`card:${c.key}`, c.key] as const),
    ].find(([, key]) => chosen.selected.has(key))?.[0] ?? null;
  // The path is the frames showing the location, outermost first; the last is the active journey,
  // and the frames it shows are paper.
  const frames = layout.frames.map((box) => box.frame);
  const shown = location
    ? frames.filter((frame) => frameShows(frame, location))
    : [];
  const path = shown.length > 0 ? shown : frames.slice(0, 1);
  const activeFrame = path.at(-1);
  const current = new Set(
    activeFrame
      ? frames
          .filter((frame) => frameShows(activeFrame, frame.card.target))
          .map((frame) => frame.key)
      : [],
  );
  // Returning to an earlier journey closes what is open inside it; the active journey's own step
  // only brings it into view.
  const returnTo = (frame: FlowFrame, depth: number) => {
    const block = `card:${frame.card.key}`;
    const next = { anchor: block, reveal: { block, focus: true } };
    if (depth === path.length - 1) onView(next);
    else onAction({ type: "return", frame }, next);
  };
  // One root at a time: the path's first step also switches roots, to the top of the new canvas.
  const rootChoices =
    roots === "one" && scene.frames.length > 1
      ? scene.frames.map((frame) => ({
          id: frame.key,
          title: frame.card.label,
          onSelect: () =>
            onAction(
              { type: "navigate", target: frame.card.target },
              { anchor: null, reveal: { start: true } },
            ),
        }))
      : undefined;
  const steps = path.map((frame, depth) => {
    const touchpoint = touchpointOf(frame.card.touchpointJourneyId);
    return {
      id: frame.key,
      title: frame.card.label,
      ...(touchpoint ? { touchpoint } : {}),
      ...(depth === 0 && rootChoices ? { choices: rootChoices } : {}),
      onSelect: () => returnTo(frame, depth),
    };
  });
  const toggle = (card: FlowCard) =>
    onAction(
      {
        type: "toggle",
        journeyId: card.journeyId,
        stateId: card.id,
        occurrence: card.occurrence,
      },
      { anchor: `card:${card.key}`, reveal: null },
    );
  return (
    <div
      className={[styles.flow, className].filter(Boolean).join(" ")}
      data-placement={placement}
    >
      <CanvasHeader
        path={steps.length > 0 ? <JourneyPath items={steps} /> : undefined}
        commands={commands}
      />
      <BrowserFlowViewport
        blocks={blocks}
        width={layout.width}
        height={layout.height}
        zoom={zoom}
        anchor={view.anchor}
        reveal={reveal}
        initial={selectedBlock}
        label={label}
      >
        <FlowScene
          layout={layout}
          highlight={highlight}
          current={current}
          location={activeFrame?.key ?? null}
          touchpointOf={touchpointOf}
          filtered={(journeyId) =>
            !matchesTouchpoints(graph, journeyId, touchpointIds)
          }
          screenOf={(vertex) => {
            const screen = getNodeScreens(graph, screenshots, vertex.id).find(
              (s) => s.source,
            );
            return screen
              ? {
                  label: `Screen: ${vertex.label}`,
                  onOpen: () =>
                    onAction(
                      {
                        type: "openScreen",
                        target: vertex.target,
                        surfaceId: screen.surface.id,
                      },
                      still,
                    ),
                }
              : undefined;
          }}
          onSelect={(target, block) =>
            onAction(
              { type: "navigate", target },
              { anchor: block, reveal: null },
            )
          }
          onToggle={toggle}
          onActivate={(target) => onActivate(target?.selection ?? null)}
        />
      </BrowserFlowViewport>
    </div>
  );
}
