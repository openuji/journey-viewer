import { useMemo } from "react";
import { FlowKey, Text } from "@journey-viewer/design-system";
import {
  ExpandCollapse,
  FlowPlacement,
  FlowSettings,
  FlowZoom,
  GraphSearch,
  ResetView,
  TouchpointFilter,
  ViewSwitch,
  Viewer,
  ViewerBar,
  ViewerMain,
  WhenView,
  columnsView,
  countMappedScreens,
  flowView,
  getViewerSummary,
  treeView,
} from "@journey-viewer/viewer";
import type {
  ScreenshotMap,
  TouchpointPresentation,
} from "@journey-viewer/viewer";
import type { UjgDocument } from "@journey-viewer/ujg-jsonld";

export interface ApplicationViewerProps {
  /** Keep this reference stable between actual replacements; every new object resets the viewer. */
  readonly document: UjgDocument;
  readonly screenshots: ScreenshotMap;
  readonly touchpoints: TouchpointPresentation;
}

/** Flow's own controls sit beside its journey path, so the bar is the same in every view. */
const views = [
  treeView,
  columnsView,
  flowView({
    pathEnd: (
      <>
        <FlowPlacement />
        <FlowZoom />
        <FlowKey />
      </>
    ),
  }),
];

/**
 * The application's arrangement of the viewer: Tree, Columns and Flow under one explorer bar,
 * which leads with the document's counts because the header already names it.
 */
export function ApplicationViewer({
  document,
  screenshots,
  touchpoints,
}: ApplicationViewerProps) {
  const stats = useMemo(() => {
    const summary = getViewerSummary(document);
    const screens = countMappedScreens(document, screenshots);
    return [
      `${summary.journeys} journeys`,
      `${summary.states} states`,
      `${summary.transitions} transitions`,
      ...(screens ? [`${screens} screens`] : []),
    ].join(" · ");
  }, [document, screenshots]);
  return (
    <FlowSettings>
      <Viewer
        document={document}
        screenshots={screenshots}
        touchpoints={touchpoints}
        views={views}
        level={2}
      >
        <ViewerBar>
          <Text variant="caption" tone="subtle">
            {stats}
          </Text>
          <ViewSwitch />
          <WhenView id={["tree", "flow"]}>
            <ExpandCollapse />
          </WhenView>
          <TouchpointFilter />
          <GraphSearch>
            <ResetView />
          </GraphSearch>
        </ViewerBar>
        <ViewerMain />
      </Viewer>
    </FlowSettings>
  );
}
