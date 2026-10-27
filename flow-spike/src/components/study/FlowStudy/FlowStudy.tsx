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
  collapseAllJourneys,
  createViewerSnapshot,
  expandAllJourneys,
  getNodeScreens,
  navigateViewer,
  openScreenshot,
  setViewMode,
  stepScreenshot,
  toggleChildJourneys,
} from "@journey-viewer/viewer";
import type {
  ScreenshotMap,
  TouchpointPresentation,
  ViewerSnapshot,
  ViewerTarget,
} from "@journey-viewer/viewer";
import { composeFlow } from "@/layout/compose";
import { measureArtifacts } from "@/layout/artifacts";
import type { LevelInput, LevelLayout } from "@/layout/geometry";
import { layeredLevel } from "@/layout/layered";
import { buildFlowScene } from "@/model/flow-scene";
import type { FlowCard } from "@/model/flow-scene";
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
  /** Starting disclosure, derived from the tree's default snapshot. */
  readonly prepare?: (
    document: UjgDocument,
    snapshot: ViewerSnapshot,
  ) => ViewerSnapshot;
  readonly engine?: (input: LevelInput) => LevelLayout;
}

interface Session {
  readonly document: UjgDocument;
  readonly snapshot: ViewerSnapshot;
  readonly view: View;
  readonly detail: FlowDetail;
  readonly zoom: "actual" | "fit";
  /** The block a disclosure must keep in place on screen. */
  readonly anchor: string | null;
}

const nameOf = (
  node: { readonly label?: unknown; readonly "@id": string } | undefined,
  fallback: string,
) => (node && typeof node.label === "string" ? node.label : fallback);

/**
 * The evaluation surface: Tree, Columns and Flow over one viewer snapshot, so switching keeps the
 * selection and what is open. Flow detail is explicit configuration; layout runs only when the
 * document or the expansion changes.
 */
export function FlowStudy({
  document,
  screenshots = {},
  touchpoints = {},
  view = "flow",
  detail = stakeholderDetail,
  prepare = (_, snapshot) => snapshot,
  engine = layeredLevel,
}: FlowStudyProps) {
  const start = (): Session => ({
    document,
    snapshot: prepare(document, createViewerSnapshot(document)),
    view,
    detail,
    zoom: "actual",
    anchor: null,
  });
  const [session, setSession] = useState<Session>(start);
  // Layout depends on the document and the expansion only: selection and detail never re-run it.
  const expanded = session.snapshot.interaction.expandedJourneys;
  const layout = useMemo(
    () =>
      composeFlow(
        buildFlowScene(document, { expandedJourneys: expanded }),
        engine,
        canvasMeasure,
      ),
    [document, expanded, engine],
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
  const update = (
    next: (current: ViewerSnapshot) => ViewerSnapshot,
    anchor: string | null = null,
  ) =>
    change((current) => ({
      ...current,
      snapshot: next(current.snapshot),
      anchor,
    }));
  const navigate = (target: ViewerTarget, anchor: string | null = null) =>
    update((current) => navigateViewer(document, current, target), anchor);
  const openScreen = (target: ViewerTarget, surfaceRef: string) =>
    update((current) =>
      openScreenshot(document, screenshots, current, target, surfaceRef),
    );

  const highlight = flowHighlight(layout, snapshot.interaction.selection);
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
    const card = item.card;
    return {
      target:
        card.kind === "journey"
          ? {
              selection: {
                kind: "journey",
                journeyRef: card.node["@id"],
                nodeRef: card.node["@id"],
              },
              occurrence: card.occurrence,
            }
          : {
              selection: {
                kind: "state",
                journeyRef: card.journey["@id"],
                nodeRef: card.node["@id"],
              },
              occurrence: card.occurrence,
            },
      block: `card:${card.key}`,
    };
  };
  const toggle = (card: FlowCard) =>
    update(
      (current) => ({
        ...current,
        interaction: toggleChildJourneys(
          document,
          current.interaction,
          card.journey["@id"],
          card.node["@id"],
        ),
      }),
      `card:${card.key}`,
    );

  const views = [
    { value: "tree", label: "Tree" },
    { value: "columns", label: "Columns" },
    { value: "flow", label: "Flow" },
  ] as const;
  const details = [
    { value: "Stakeholder", label: "Stakeholder" },
    { value: "Spec", label: "Spec" },
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
            onClick={() =>
              update((current) => ({
                ...current,
                interaction: expandAllJourneys(document, current.interaction),
              }))
            }
          />
          <IconButton
            label="Collapse all"
            icon={<Icon name="collapse-all" />}
            onClick={() =>
              update((current) => ({
                ...current,
                interaction: collapseAllJourneys(current.interaction),
              }))
            }
          />
        </span>
      </header>
      <div className={styles.body}>
        <main className={styles.stage}>
          {session.view === "flow" ? (
            <FlowViewport
              layout={layout}
              zoom={session.zoom}
              anchor={session.anchor}
              label="Journey flow"
              strip={(frames, reveal) => (
                <ContextStrip
                  items={frames.map(({ card }) => ({
                    key: card.key,
                    title: card.title.join(" "),
                    ...(touchpointOf(
                      (card.card.children[0] ?? card.card.journey)["@id"],
                    )
                      ? {
                          touchpoint: touchpointOf(
                            (card.card.children[0] ?? card.card.journey)["@id"],
                          )!,
                        }
                      : {}),
                    onReveal: () => reveal(card.key),
                    onCollapse: () => toggle(card.card),
                  }))}
                />
              )}
            >
              <FlowScene
                layout={layout}
                detail={session.detail}
                highlight={highlight}
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
                onSelect={(item) => {
                  const { target, block } = targetOf(item);
                  navigate(target, block);
                }}
                onToggle={toggle}
              />
            </FlowViewport>
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
                  update((current) => ({
                    ...current,
                    interaction: toggleChildJourneys(
                      document,
                      current.interaction,
                      journeyRef,
                      stateRef,
                    ),
                  }))
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
          onClose={() => update(closeScreenshot)}
          onPrevious={() =>
            update((current) =>
              stepScreenshot(document, screenshots, current, -1),
            )
          }
          onNext={() =>
            update((current) =>
              stepScreenshot(document, screenshots, current, 1),
            )
          }
        />
      )}
    </div>
  );
}
