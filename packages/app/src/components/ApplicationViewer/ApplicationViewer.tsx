import { useMemo } from "react";
import { FlowKey, Text } from "@journey-viewer/design-system";
import {
  ExpandCollapse,
  FlowPlacement,
  FlowRoots,
  FlowSettings,
  FlowZoom,
  GraphSearch,
  ResetView,
  TouchpointFilter,
  TreeLayout,
  ViewSwitch,
  Viewer,
  ViewerBar,
  ViewerMain,
  WhenView,
  WhenTreeLayout,
  countMappedScreens,
  flowView,
  getViewerSummary,
  treeView,
} from "@journey-viewer/viewer";
import type {
  ScreenshotMap,
  TouchpointPresentation,
} from "@journey-viewer/viewer";
import type { JourneyGraph } from "@journey-viewer/ujg-jsonld";

export interface ApplicationViewerProps {
  /** Keep this reference stable between actual replacements; every new object resets the viewer. */
  readonly graph: JourneyGraph;
  readonly screenshots: ScreenshotMap;
  readonly touchpoints: TouchpointPresentation;
}

/** Tree's controls are composed in the bar; Flow's own controls sit in its canvas header. */
const views = [
  treeView,
  flowView({
    commands: (
      <>
        <FlowPlacement />
        <FlowZoom />
        <FlowRoots />
        <FlowKey />
      </>
    ),
  }),
];

/**
 * The application's arrangement of the viewer: Tree and Flow under one explorer bar,
 * which leads with the document's counts because the header already names it.
 */
export function ApplicationViewer({
  graph,
  screenshots,
  touchpoints,
}: ApplicationViewerProps) {
  const stats = useMemo(() => {
    const summary = getViewerSummary(graph);
    const screens = countMappedScreens(graph, screenshots);
    return [
      `${summary.journeys} journeys`,
      `${summary.states} states`,
      `${summary.transitions} transitions`,
      ...(screens ? [`${screens} screens`] : []),
    ].join(" · ");
  }, [graph, screenshots]);
  return (
    <FlowSettings>
      <Viewer
        graph={graph}
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
          <WhenView id="tree">
            <TreeLayout />
            <WhenTreeLayout mode="tree">
              <ExpandCollapse />
            </WhenTreeLayout>
          </WhenView>
          <WhenView id="flow">
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
