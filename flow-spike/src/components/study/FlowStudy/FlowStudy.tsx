import { useMemo, useState } from "react";
import {
  Icon,
  IconButton,
  SegmentedControl,
  Text,
} from "@journey-viewer/design-system";
import { getJourneyTouchpoints, getNode } from "@journey-viewer/ujg-jsonld";
import type { UjgDocument } from "@journey-viewer/ujg-jsonld";
import {
  JourneyExplorer,
  JourneyInspector,
  JourneyLightbox,
  closeScreenshot,
  createViewerSnapshot,
  getNodeScreens,
  setViewMode,
} from "@journey-viewer/viewer";
import type {
  ScreenshotMap,
  TouchpointPresentation,
  ViewerSnapshot,
  ViewerTarget,
} from "@journey-viewer/viewer";
import { composeFlow } from "@/layout/compose";
import { measureArtifacts } from "@/layout/artifacts";
import { layeredLevel } from "@/layout/layered";
import type { Placement } from "@/layout/layered";
import { buildFlowScene, cardTarget, frameShows } from "@/model/flow-scene";
import type { FlowCard, FlowFrame } from "@/model/flow-scene";
import { disclose } from "@/model/disclosure";
import type { DisclosureAction } from "@/model/disclosure";
import {
  flowHighlight,
  specDetail,
  stakeholderDetail,
} from "@/model/presentation";
import type { FlowDetail } from "@/model/presentation";
import { canvasMeasure } from "@/browser/measure";
import { FlowViewport } from "@/browser/FlowViewport/FlowViewport";
import { FlowScene } from "@/components/flow/FlowScene/FlowScene";
import type { FlowSelectable } from "@/components/flow/FlowScene/FlowScene";
import { ContextStrip } from "@/components/flow/ContextStrip/ContextStrip";
import { FlowKey } from "@/components/flow/FlowKey/FlowKey";
import { StepDetails } from "@/components/study/StepDetails/StepDetails";
import styles from "@/components/study/FlowStudy/FlowStudy.module.css";

type View = "tree" | "columns" | "flow";

export interface FlowStudyProps {
  /** Keep stable between real replacements; a new object resets the study, as in the viewer. */
  readonly document: UjgDocument;
  readonly screenshots?: ScreenshotMap;
  readonly touchpoints?: TouchpointPresentation;
  readonly view?: View;
  readonly detail?: FlowDetail;
  /** Starting placement of blocks across each level. */
  readonly placement?: Placement;
  /** Starting disclosure, derived from the tree's default snapshot. */
  readonly prepare?: (
    document: UjgDocument,
    snapshot: ViewerSnapshot,
  ) => ViewerSnapshot;
}

interface Session {
  readonly document: UjgDocument;
  readonly snapshot: ViewerSnapshot;
  readonly view: View;
  readonly detail: FlowDetail;
  readonly placement: Placement;
  readonly zoom: "actual" | "fit";
  /** The block a disclosure must keep in place on screen. */
  readonly anchor: string | null;
  /** The block to bring to the canvas's top-left corner once the next layout is in place. */
  readonly reveal: Readonly<{ block: string }> | null;
  /** The node the user is at; written only by `disclose`, with the snapshot. */
  readonly location: ViewerTarget | null;
  /** The block under the pointer or keyboard focus; presentation only, never in the snapshot. */
  readonly active: FlowSelectable | null;
}

const nameOf = (
  node: { readonly label?: unknown; readonly "@id": string } | undefined,
  fallback: string,
) => (node && typeof node.label === "string" ? node.label : fallback);

/**
 * The evaluation surface: Tree, Columns and Flow over one viewer snapshot, so switching keeps the
 * selection and what is open. Flow detail is explicit configuration; layout runs only when the
 * document, the expansion or the placement changes.
 */
export function FlowStudy({
  document,
  screenshots = {},
  touchpoints = {},
  view = "flow",
  detail = stakeholderDetail,
  placement = "median",
  prepare = (_, snapshot) => snapshot,
}: FlowStudyProps) {
  const start = (): Session => ({
    document,
    snapshot: prepare(document, createViewerSnapshot(document)),
    view,
    detail,
    placement,
    zoom: "actual",
    anchor: null,
    reveal: null,
    location: null,
    active: null,
  });
  const [session, setSession] = useState<Session>(start);
  // Layout depends on the document, the expansion and the placement only: selection and detail
  // never re-run it.
  const expanded = session.snapshot.interaction.expandedJourneys;
  const scene = useMemo(
    () => buildFlowScene(document, { expandedJourneys: expanded }),
    [document, expanded],
  );
  const layout = useMemo(
    () =>
      composeFlow(
        scene,
        (input) => layeredLevel(input, session.placement),
        canvasMeasure,
      ),
    [scene, session.placement],
  );
  // Evaluation readout of the layout actually rendered (browser text metrics), for the capture script.
  const artifacts = useMemo(
    () => JSON.stringify({ ...measureArtifacts(layout), examples: undefined }),
    [layout],
  );
  if (session.document !== document) {
    setSession(start());
    return null;
  }
  const { snapshot } = session;
  const change = (next: (current: Session) => Session) =>
    setSession((current) => next(current));
  // Everything that can open or close journeys goes through the disclosure reducer; the viewport
  // effects (`anchor`, `reveal`) say only where the screen stays.
  const dispatch = (
    action: DisclosureAction,
    anchor: string | null = null,
    reveal: Session["reveal"] = null,
  ) =>
    change((current) => ({
      ...current,
      ...disclose(document, screenshots, current, action),
      anchor,
      reveal,
    }));
  const navigate = (target: ViewerTarget, anchor: string | null = null) =>
    dispatch({ type: "navigate", target }, anchor);
  const openScreen = (target: ViewerTarget, surfaceRef: string) =>
    dispatch({ type: "openScreen", target, surfaceRef });

  const selected: ViewerTarget | null =
    snapshot.interaction.selection && snapshot.navigation.occurrence
      ? {
          selection: snapshot.interaction.selection,
          occurrence: snapshot.navigation.occurrence,
        }
      : null;

  const touchpointOf = (journeyRef: string) => {
    const touchpoint = getJourneyTouchpoints(document, journeyRef)[0];
    if (!touchpoint) return undefined;
    const presentation = touchpoints[touchpoint["@id"]];
    return {
      label: presentation?.shortLabel ?? nameOf(touchpoint, touchpoint["@id"]),
      ...(presentation?.color ? { color: presentation.color } : {}),
    };
  };
  const targetOf = (
    item: FlowSelectable,
  ): { target: ViewerTarget; block: string } => {
    if (item.kind === "state")
      return {
        target: {
          selection: {
            kind: "state",
            journeyRef: item.vertex.journey["@id"],
            nodeRef: item.vertex.node["@id"],
          },
          occurrence: item.vertex.occurrence,
        },
        block: `state:${item.vertex.key}`,
      };
    if (item.kind === "contract")
      return {
        target: {
          selection: {
            kind: item.contract.kind,
            journeyRef: item.contract.journey["@id"],
            nodeRef: item.contract.node["@id"],
          },
          occurrence: item.contract.occurrence,
        },
        block: `contract:${item.contract.key}`,
      };
    return { target: cardTarget(item.card), block: `card:${item.card.key}` };
  };
  // Activation (hover or focus) shows a block's routes; the selection keeps its own look.
  const chosen = flowHighlight(layout, snapshot.interaction.selection);
  const highlight = session.active
    ? {
        ...flowHighlight(layout, targetOf(session.active).target.selection),
        selected: chosen.selected,
      }
    : chosen;
  const toggle = (card: FlowCard) =>
    dispatch(
      {
        type: "toggle",
        journeyRef: card.journey["@id"],
        stateRef: card.node["@id"],
        occurrence: card.occurrence,
      },
      `card:${card.key}`,
    );
  // Read from the reducer's location over the rendered frames, which come outermost first: the path
  // is the frames showing it, the last is the active journey, and the frames inside that are paper.
  const frames = layout.frames.map((box) => box.frame);
  const shown = session.location
    ? frames.filter((frame) => frameShows(frame, session.location!))
    : [];
  const path = shown.length > 0 ? shown : frames.slice(0, 1);
  const activeFrame = path.at(-1);
  const inContext = new Set(
    activeFrame
      ? frames
          .filter((frame) => frameShows(activeFrame, cardTarget(frame.card)))
          .map((frame) => frame.key)
      : [],
  );
  // Returning to an earlier journey on the path closes what is open inside it; the active journey's
  // own step only brings it into view.
  const returnTo = (frame: FlowFrame, depth: number) => {
    const block = `card:${frame.card.key}`;
    if (depth === path.length - 1)
      change((current) => ({ ...current, anchor: block, reveal: { block } }));
    else dispatch({ type: "return", frame }, block, { block });
  };

  const views = [
    { value: "tree", label: "Tree" },
    { value: "columns", label: "Columns" },
    { value: "flow", label: "Flow" },
  ] as const;
  const details = [
    { value: "Stakeholder", label: "Stakeholder" },
    { value: "Spec", label: "Spec" },
  ] as const;
  const placements = [
    { value: "median", label: "Median" },
    { value: "aligned-center", label: "Aligned centre" },
    { value: "aligned-left", label: "Aligned left" },
  ] as const;
  const inspector =
    session.view !== "flow" || session.detail.details === "inspector";
  const title = nameOf(
    getNode(document, document["@id"]),
    document["@id"].split(":").pop() ?? "Journeys",
  );

  return (
    <div
      className={styles.study}
      data-view={session.view}
      data-artifacts={artifacts}
    >
      <header className={styles.toolbar}>
        <Text variant="label" weight="semibold" className={styles.title}>
          {title}
        </Text>
        <SegmentedControl
          label="View"
          options={views}
          value={session.view}
          onChange={(value) =>
            change((current) => ({
              ...current,
              view: value,
              snapshot:
                value === "flow"
                  ? current.snapshot
                  : setViewMode(document, current.snapshot, value),
            }))
          }
        />
        {session.view === "flow" && (
          <>
            <SegmentedControl
              label="Detail"
              options={details}
              value={session.detail.name as (typeof details)[number]["value"]}
              onChange={(value) =>
                change((current) => ({
                  ...current,
                  detail: value === "Spec" ? specDetail : stakeholderDetail,
                }))
              }
            />
            <SegmentedControl
              label="Placement"
              options={placements}
              value={session.placement}
              onChange={(value) =>
                change((current) => ({ ...current, placement: value }))
              }
            />
            <SegmentedControl
              label="Zoom"
              options={[
                { value: "actual", label: "100%" },
                { value: "fit", label: "Fit" },
              ]}
              value={session.zoom}
              onChange={(value) =>
                change((current) => ({ ...current, zoom: value }))
              }
            />
            <FlowKey detail={session.detail} />
          </>
        )}
        <span className={styles.actions}>
          <IconButton
            label="Expand all"
            icon={<Icon name="expand-all" />}
            onClick={() => dispatch({ type: "expandAll" })}
          />
          <IconButton
            label="Collapse all"
            icon={<Icon name="collapse-all" />}
            onClick={() => dispatch({ type: "collapseAll" })}
          />
        </span>
      </header>
      <div className={styles.body}>
        <main className={styles.stage}>
          {session.view === "flow" ? (
            <div className={styles.canvas}>
              <ContextStrip
                items={path.map((frame, depth) => {
                  const tp = touchpointOf(
                    (frame.card.children[0] ?? frame.card.journey)["@id"],
                  );
                  return {
                    key: frame.key,
                    title: nameOf(frame.card.node, frame.card.node["@id"]),
                    ...(tp ? { touchpoint: tp } : {}),
                    onSelect: () => returnTo(frame, depth),
                  };
                })}
              />
              <FlowViewport
                layout={layout}
                zoom={session.zoom}
                anchor={session.anchor}
                reveal={session.reveal}
                label="Journey flow"
              >
                <FlowScene
                  layout={layout}
                  detail={session.detail}
                  highlight={highlight}
                  current={inContext}
                  location={activeFrame?.key ?? null}
                  touchpointOf={touchpointOf}
                  screenOf={(vertex) => {
                    const screen = getNodeScreens(
                      document,
                      screenshots,
                      vertex.node["@id"],
                    ).find((s) => s.source);
                    if (!screen) return undefined;
                    const target: ViewerTarget = {
                      selection: {
                        kind: "state",
                        journeyRef: vertex.journey["@id"],
                        nodeRef: vertex.node["@id"],
                      },
                      occurrence: vertex.occurrence,
                    };
                    return {
                      label: `Screen: ${nameOf(vertex.node, vertex.node["@id"])}`,
                      onOpen: () => openScreen(target, screen.surface["@id"]),
                    };
                  }}
                  onActivate={(item) =>
                    change((current) => ({ ...current, active: item }))
                  }
                  onSelect={(item) => {
                    const { target, block } = targetOf(item);
                    navigate(target, block);
                  }}
                  onToggle={toggle}
                />
              </FlowViewport>
            </div>
          ) : (
            <div className={styles.explorer}>
              <JourneyExplorer
                document={document}
                interaction={snapshot.interaction}
                navigation={snapshot.navigation}
                touchpoints={touchpoints}
                media={{ screenshots, onOpen: openScreen }}
                onSelect={(selection, occurrence) =>
                  navigate({ selection, occurrence })
                }
                onToggleChildren={(journeyRef, stateRef) =>
                  dispatch({ type: "toggle", journeyRef, stateRef })
                }
              />
            </div>
          )}
        </main>
        <div className={styles.side}>
          {inspector ? (
            <JourneyInspector
              document={document}
              selection={snapshot.interaction.selection}
              touchpoints={touchpoints}
              media={{ screenshots, onOpen: openScreen, target: selected }}
              navigation={{
                occurrence: snapshot.navigation.occurrence,
                onNavigate: (target) => navigate(target),
              }}
            />
          ) : (
            <StepDetails
              document={document}
              target={selected}
              screenshots={screenshots}
              touchpoints={touchpoints}
              onNavigate={(target) => navigate(target)}
              onOpenScreen={openScreen}
            />
          )}
        </div>
      </div>
      {snapshot.lightbox && (
        <JourneyLightbox
          document={document}
          screenshots={screenshots}
          lightbox={snapshot.lightbox}
          touchpoints={touchpoints}
          onClose={() =>
            change((current) => ({
              ...current,
              snapshot: closeScreenshot(current.snapshot),
              anchor: null,
              reveal: null,
            }))
          }
          onPrevious={() => dispatch({ type: "stepScreen", direction: -1 })}
          onNext={() => dispatch({ type: "stepScreen", direction: 1 })}
        />
      )}
    </div>
  );
}
