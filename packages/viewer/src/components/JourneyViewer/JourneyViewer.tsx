import { useState } from "react";
import type { ReactNode } from "react";
import type { HeadingLevel } from "@journey-viewer/design-system";
import { getJourneyTouchpoints } from "@journey-viewer/ujg-jsonld";
import type { UjgDocument } from "@journey-viewer/ujg-jsonld";
import {
  collapseAllJourneys,
  expandAllJourneys,
  resolveSelection,
  toggleChildJourneys,
  toggleContracts,
} from "@/interaction";
import type { ViewerInteraction } from "@/interaction";
import {
  createViewerSnapshot,
  hoverNode,
  navigateViewer,
  pickSearchResult,
  selectTouchpoint,
  setSearchQuery,
  setViewMode,
} from "@/navigation";
import type { ViewerSnapshot, ViewerTarget } from "@/navigation";
import { occurrenceKey } from "@/occurrence";
import { JourneyExplorer } from "@/components/JourneyExplorer/JourneyExplorer";
import { JourneyInspector } from "@/components/JourneyInspector/JourneyInspector";
import { JourneyNavigation } from "@/components/JourneyNavigation/JourneyNavigation";
import {
  closeScreenshot,
  getNodeScreens,
  getScreens,
  openScreenshot,
  stepScreenshot,
} from "@/screens";
import type { ScreenshotMap } from "@/screens";
import type { TouchpointPresentation } from "@/presentation";
import { touchpointLabel } from "@/presentation";
import { JourneyLightbox } from "@/components/JourneyLightbox/JourneyLightbox";
import type { ViewerExtensions } from "@/extensions";
import type { PreviewAnchor } from "@/preview-placement";
import { BrowserViewerShell } from "@/browser/BrowserViewerShell";
import type { RevealRequest } from "@/browser/BrowserViewerShell";
import { BrowserScrollPanel } from "@/browser/BrowserScrollPanel";
import { BrowserScreenPreview } from "@/browser/BrowserScreenPreview";
import { BrowserScreenPreload } from "@/browser/BrowserScreenPreload";
import { BrowserScreenImage } from "@/browser/BrowserScreenImage";
import styles from "@/components/JourneyViewer/JourneyViewer.module.css";

export interface JourneyViewerProps {
  /** Keep this reference stable between actual replacements; every new object resets interaction. */
  readonly document: UjgDocument;
  readonly level?: HeadingLevel;
  /** Independent replaceable map; updates never reset document interaction. */
  readonly screenshots?: ScreenshotMap;
  readonly touchpoints?: TouchpointPresentation;
  /** Explicit readonly composition; replacing descriptors preserves the current snapshot. */
  readonly extensions?: ViewerExtensions;
  /** Leading explorer-bar content; defaults to a document summary. */
  readonly headerStart?: ReactNode;
  /** Trailing explorer-bar content, such as source links. */
  readonly headerEnd?: ReactNode;
}

interface ScreenPreviewState {
  readonly target: ViewerTarget;
  readonly surfaceRef: string;
  readonly anchor: PreviewAnchor;
  readonly visible: boolean;
}

/** Browser presentation state that is not part of the graph interaction snapshot. */
interface ViewerPresentation {
  readonly preview: ScreenPreviewState | null;
  readonly searchOpen: boolean;
  readonly reveal: RevealRequest | null;
}

interface DocumentInteraction {
  readonly document: UjgDocument;
  readonly snapshot: ViewerSnapshot;
  readonly presentation: ViewerPresentation;
}

const initialPresentation: ViewerPresentation = {
  preview: null,
  searchOpen: false,
  reveal: null,
};
const revealOf = (target: ViewerTarget, seq: number): RevealRequest => ({
  seq,
  kind: target.selection.kind,
  occurrence: occurrenceKey(target.occurrence),
  ref: target.selection.nodeRef,
});

/** The sole graph-interaction state boundary; every update replaces an immutable snapshot. */
export function JourneyViewer({
  document,
  level = 2,
  screenshots = {},
  touchpoints = {},
  extensions,
  headerStart,
  headerEnd,
}: JourneyViewerProps) {
  const [session, setSession] = useState<DocumentInteraction>(() => ({
    document,
    snapshot: createViewerSnapshot(document),
    presentation: initialPresentation,
  }));
  if (session.document !== document) {
    // Reset by input object identity, including replacements with the same @id.
    // React retries this component before rendering its children; no stale selection is committed.
    setSession({
      document,
      snapshot: createViewerSnapshot(document),
      presentation: initialPresentation,
    });
    return null;
  }
  const change = (
    transition: (current: DocumentInteraction) => DocumentInteraction,
  ) => {
    setSession((current) =>
      current.document !== document ? current : transition(current),
    );
  };
  const update = (transition: (current: ViewerSnapshot) => ViewerSnapshot) =>
    change((current) => {
      const snapshot = transition(current.snapshot);
      return snapshot === current.snapshot ? current : { ...current, snapshot };
    });
  const present = (
    transition: (current: ViewerPresentation) => ViewerPresentation,
  ) =>
    change((current) => {
      const presentation = transition(current.presentation);
      return presentation === current.presentation
        ? current
        : { ...current, presentation };
    });
  const updateInteraction = (
    transition: (current: ViewerInteraction) => ViewerInteraction,
  ) =>
    update((current) => {
      const interaction = transition(current.interaction);
      return interaction === current.interaction
        ? current
        : { ...current, interaction };
    });
  /** Inspector and search navigation also bring the target into view. */
  const reveal = (
    target: ViewerTarget,
    transition: (current: ViewerSnapshot) => ViewerSnapshot,
    searchOpen?: boolean,
  ) =>
    change((current) => {
      const snapshot = transition(current.snapshot);
      if (snapshot === current.snapshot && searchOpen === undefined)
        return current;
      return {
        ...current,
        snapshot,
        presentation: {
          ...current.presentation,
          ...(searchOpen === undefined ? {} : { searchOpen }),
          reveal: revealOf(target, (current.presentation.reveal?.seq ?? 0) + 1),
        },
      };
    });
  const navigate = (target: ViewerTarget) =>
    update((current) => navigateViewer(document, current, target));
  const navigateAndReveal = (target: ViewerTarget) =>
    reveal(target, (current) => navigateViewer(document, current, target));
  const openScreen = (target: ViewerTarget, surfaceRef: string) =>
    change((current) => {
      const snapshot = openScreenshot(
        document,
        screenshots,
        current.snapshot,
        target,
        surfaceRef,
      );
      const preview = current.presentation.preview && {
        ...current.presentation.preview,
        visible: false,
      };
      return {
        ...current,
        snapshot,
        presentation: { ...current.presentation, preview },
      };
    });
  const { snapshot, presentation } = session;
  const selection = snapshot.interaction.selection;
  const selected =
    selection && snapshot.navigation.occurrence
      ? { selection, occurrence: snapshot.navigation.occurrence }
      : null;
  const preview = presentation.preview;
  const previewNode = preview
    ? resolveSelection(document, preview.target.selection)
    : undefined;
  const previewSource = preview
    ? getNodeScreens(
        document,
        screenshots,
        preview.target.selection.nodeRef,
      ).find((screen) => screen.surface["@id"] === preview.surfaceRef)?.source
    : undefined;
  const previewTouchpoint = preview
    ? getJourneyTouchpoints(document, preview.target.selection.journeyRef)[0]
    : undefined;
  const previewTitle =
    previewNode && typeof previewNode.node.label === "string"
      ? previewNode.node.label
      : (preview?.target.selection.nodeRef ?? "");
  const sources = getScreens(document, screenshots)
    .flatMap((screen) => (screen.source ? [screen.source] : []))
    .filter((source, index, all) => all.indexOf(source) === index);
  const media = { screenshots, onOpen: openScreen };
  return (
    <BrowserViewerShell
      className={styles.viewer}
      reveal={presentation.reveal}
      searchOpen={
        presentation.searchOpen && snapshot.navigation.query.trim() !== ""
      }
      onSearchDismiss={() =>
        present((current) =>
          current.searchOpen ? { ...current, searchOpen: false } : current,
        )
      }
    >
      <JourneyNavigation
        document={document}
        snapshot={snapshot}
        screenshots={screenshots}
        touchpoints={touchpoints}
        start={headerStart}
        end={headerEnd}
        searchOpen={presentation.searchOpen}
        onMode={(mode) =>
          update((current) => setViewMode(document, current, mode))
        }
        onExpandAll={() =>
          updateInteraction((current) => expandAllJourneys(document, current))
        }
        onCollapseAll={() => updateInteraction(collapseAllJourneys)}
        onTouchpoint={(ref) =>
          update((current) => selectTouchpoint(document, current, ref))
        }
        onQuery={(query) =>
          change((current) => {
            const next = setSearchQuery(current.snapshot, query);
            return next === current.snapshot && current.presentation.searchOpen
              ? current
              : {
                  ...current,
                  snapshot: next,
                  presentation: { ...current.presentation, searchOpen: true },
                };
          })
        }
        onSearchFocus={() =>
          present((current) =>
            current.searchOpen ? current : { ...current, searchOpen: true },
          )
        }
        onSearchPick={(target) =>
          reveal(
            target,
            (current) => pickSearchResult(document, current, target),
            false,
          )
        }
        onReset={() =>
          change((current) => ({
            ...current,
            snapshot: createViewerSnapshot(document),
            presentation: {
              ...initialPresentation,
              reveal: {
                seq: (current.presentation.reveal?.seq ?? 0) + 1,
                kind: "top",
                occurrence: "",
                ref: "",
              },
            },
          }))
        }
      />
      <div className={styles.content}>
        <div className={styles.layout}>
          <section aria-label="Journey graph" className={styles.stage}>
            <div
              className={
                snapshot.navigation.mode === "tree"
                  ? styles.tree
                  : styles.columns
              }
            >
              <JourneyExplorer
                document={document}
                interaction={snapshot.interaction}
                navigation={snapshot.navigation}
                level={level}
                media={{
                  ...media,
                  onPreview: (target, surfaceRef, anchor) =>
                    present((current) =>
                      anchor
                        ? {
                            ...current,
                            preview: {
                              target,
                              surfaceRef,
                              anchor,
                              visible: true,
                            },
                          }
                        : current.preview?.visible
                          ? {
                              ...current,
                              preview: { ...current.preview, visible: false },
                            }
                          : current,
                    ),
                }}
                touchpoints={touchpoints}
                {...(extensions ? { extensions } : {})}
                onSelect={(target, occurrence) =>
                  navigate({ selection: target, occurrence })
                }
                onToggleChildren={(journeyRef, stateRef) =>
                  updateInteraction((current) =>
                    toggleChildJourneys(
                      document,
                      current,
                      journeyRef,
                      stateRef,
                    ),
                  )
                }
                onToggleContracts={(journeyRef) =>
                  updateInteraction((current) =>
                    toggleContracts(document, current, journeyRef),
                  )
                }
                onHover={(hovered, occurrence) =>
                  update((current) =>
                    hoverNode(document, current, hovered, occurrence),
                  )
                }
              />
            </div>
          </section>
          <BrowserScrollPanel
            className={styles.inspector}
            resetKey={
              selection
                ? `${selection.kind} ${selection.journeyRef} ${selection.nodeRef}`
                : ""
            }
          >
            <JourneyInspector
              document={document}
              selection={selection}
              level={level}
              {...(extensions ? { extensions } : {})}
              touchpoints={touchpoints}
              media={{ ...media, target: selected }}
              navigation={{
                occurrence: snapshot.navigation.occurrence,
                onNavigate: navigateAndReveal,
              }}
            />
          </BrowserScrollPanel>
        </div>
      </div>
      {preview && (
        <BrowserScreenPreview
          anchor={preview.anchor}
          visible={preview.visible}
          title={previewTitle}
          context={[
            previewNode
              ? (previewNode.journey.label ?? previewNode.journey["@id"])
              : preview.target.selection.journeyRef,
            ...(previewTouchpoint
              ? [touchpointLabel(previewTouchpoint, touchpoints)]
              : []),
          ].join(" · ")}
          {...(previewTouchpoint
            ? {
                touchpoint: {
                  label: touchpointLabel(previewTouchpoint, touchpoints),
                  ...(touchpoints[previewTouchpoint["@id"]]?.color
                    ? { color: touchpoints[previewTouchpoint["@id"]]!.color! }
                    : {}),
                },
              }
            : {})}
          onDismiss={() =>
            present((current) =>
              current.preview?.visible
                ? {
                    ...current,
                    preview: { ...current.preview, visible: false },
                  }
                : current,
            )
          }
        >
          <BrowserScreenImage source={previewSource} label={previewTitle} />
        </BrowserScreenPreview>
      )}
      <BrowserScreenPreload sources={sources} />
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
    </BrowserViewerShell>
  );
}
