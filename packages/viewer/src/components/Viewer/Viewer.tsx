import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";
import type { HeadingLevel } from "@journey-viewer/design-system";
import { journeyTouchpoints } from "@journey-viewer/ujg-jsonld";
import type { JourneyGraph } from "@journey-viewer/ujg-jsonld";
import { resolveSelection } from "@/interaction";
import { getNodeScreens, getScreens } from "@/screens";
import type { ScreenshotMap } from "@/screens";
import { touchpointLabel } from "@/presentation";
import type { TouchpointPresentation } from "@/presentation";
import type { ViewerExtensions } from "@/extensions";
import { createViewerState, reduceViewer } from "@/viewer-state";
import type {
  ViewerCommand,
  ViewerInitialCommand,
  ViewerInputs,
  ViewerState,
  ViewerView,
} from "@/viewer-state";
import { JourneyLightbox } from "@/components/JourneyLightbox/JourneyLightbox";
import { BrowserViewerShell } from "@/browser/BrowserViewerShell";
import { BrowserScreenPreview } from "@/browser/BrowserScreenPreview";
import { BrowserScreenPreload } from "@/browser/BrowserScreenPreload";
import { BrowserScreenImage } from "@/browser/BrowserScreenImage";
import styles from "@/components/Viewer/Viewer.module.css";

export interface ViewerProps {
  /** Keep this reference stable between actual replacements; every new object resets the viewer. */
  readonly graph: JourneyGraph;
  /** The views the stage can show, in the view switch's order. */
  readonly views: readonly ViewerView[];
  readonly level?: HeadingLevel;
  /** Independent replaceable map; updates never reset the viewer. */
  readonly screenshots?: ScreenshotMap;
  readonly touchpoints?: TouchpointPresentation;
  /** Explicit readonly composition; replacing descriptors keeps the state. */
  readonly extensions?: ViewerExtensions;
  /** The view it opens with and returns to on reset; the first by default. */
  readonly initialView?: string;
  /**
   * Commands it opens with and returns to on reset, applied in order in the initial view: an
   * expansion, or a `navigate` to a selection at its call site.
   */
  readonly initialCommands?: readonly ViewerInitialCommand[];
  /** The bar, the stage and any controls, in any arrangement. */
  readonly children?: ReactNode;
}

/** What every piece inside a `Viewer` reads, and the one way to change it. */
export interface ViewerContextValue {
  readonly graph: JourneyGraph;
  readonly views: readonly ViewerView[];
  readonly level: HeadingLevel;
  readonly screenshots: ScreenshotMap;
  readonly touchpoints: TouchpointPresentation;
  readonly extensions: ViewerExtensions | undefined;
  readonly state: ViewerState;
  readonly dispatch: (command: ViewerCommand) => void;
}

interface DocumentState {
  readonly graph: JourneyGraph;
  readonly state: ViewerState;
}

const ViewerContext = createContext<ViewerContextValue | null>(null);

/** The enclosing viewer's inputs, state and dispatch; any component inside a `Viewer` can be a control. */
export function useViewer(): ViewerContextValue {
  const viewer = useContext(ViewerContext);
  if (!viewer) throw new Error("useViewer needs an enclosing <Viewer>.");
  return viewer;
}

/**
 * The viewer's state boundary: it owns one immutable `ViewerState` and hands it, with `dispatch`,
 * to the pieces placed inside it. The arrangement is its children; the root adds the screen
 * preview, the lightbox and the browser shell around them.
 */
export function Viewer({
  graph,
  views,
  level = 2,
  screenshots = {},
  touchpoints = {},
  extensions,
  initialView,
  initialCommands,
  children,
}: ViewerProps) {
  const inputs: ViewerInputs = {
    graph,
    screenshots,
    views,
    initialView,
    initialCommands,
  };
  const [current, setCurrent] = useState<DocumentState>(() => ({
    graph,
    state: createViewerState(inputs),
  }));
  if (current.graph !== graph) {
    // Reset by input object identity, including replacements with the same @id.
    // React retries this component before rendering its children; no stale selection is committed.
    setCurrent({ graph, state: createViewerState(inputs) });
    return null;
  }
  const dispatch = (command: ViewerCommand) =>
    setCurrent((latest) => {
      if (latest.graph !== graph) return latest;
      const state = reduceViewer(inputs, latest.state, command);
      return state === latest.state ? latest : { graph, state };
    });
  const { state } = current;
  const { snapshot } = state.disclosure;
  const preview = state.preview;
  const previewNode = preview
    ? resolveSelection(graph, preview.target.selection)
    : undefined;
  const previewSource = preview
    ? getNodeScreens(graph, screenshots, preview.target.selection.nodeId).find(
        (screen) => screen.surface.id === preview.surfaceId,
      )?.source
    : undefined;
  const previewTouchpoint = preview
    ? journeyTouchpoints(graph, preview.target.selection.journeyId)[0]
    : undefined;
  const previewTitle =
    previewNode && typeof previewNode.node.label === "string"
      ? previewNode.node.label
      : (preview?.target.selection.nodeId ?? "");
  const sources = getScreens(graph, screenshots)
    .flatMap((screen) => (screen.source ? [screen.source] : []))
    .filter((source, index, all) => all.indexOf(source) === index);
  return (
    <ViewerContext
      value={{
        graph,
        views,
        level,
        screenshots,
        touchpoints,
        extensions,
        state,
        dispatch,
      }}
    >
      <BrowserViewerShell
        className={styles.viewer}
        reveal={state.reveal}
        searchOpen={state.searchOpen && snapshot.navigation.query.trim() !== ""}
        onSearchDismiss={() => dispatch({ type: "searchDismiss" })}
      >
        {children}
        {preview && (
          <BrowserScreenPreview
            anchor={preview.anchor}
            visible={preview.visible}
            title={previewTitle}
            context={[
              previewNode
                ? previewNode.journey.label
                : preview.target.selection.journeyId,
              ...(previewTouchpoint
                ? [touchpointLabel(previewTouchpoint, touchpoints)]
                : []),
            ].join(" · ")}
            {...(previewTouchpoint
              ? {
                  touchpoint: {
                    label: touchpointLabel(previewTouchpoint, touchpoints),
                    ...(touchpoints[previewTouchpoint.id]?.color
                      ? {
                          color: touchpoints[previewTouchpoint.id]!.color!,
                        }
                      : {}),
                  },
                }
              : {})}
            onDismiss={() => dispatch({ type: "hidePreview" })}
          >
            <BrowserScreenImage source={previewSource} label={previewTitle} />
          </BrowserScreenPreview>
        )}
        <BrowserScreenPreload sources={sources} />
        {snapshot.lightbox && (
          <JourneyLightbox
            graph={graph}
            screenshots={screenshots}
            lightbox={snapshot.lightbox}
            touchpoints={touchpoints}
            onClose={() => dispatch({ type: "closeScreen" })}
            onPrevious={() => dispatch({ type: "stepScreen", direction: -1 })}
            onNext={() => dispatch({ type: "stepScreen", direction: 1 })}
          />
        )}
      </BrowserViewerShell>
    </ViewerContext>
  );
}
