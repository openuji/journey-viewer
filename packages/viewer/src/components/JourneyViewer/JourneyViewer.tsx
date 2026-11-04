import type { ReactNode } from "react";
import { FlowKey } from "@journey-viewer/design-system";
import type { HeadingLevel } from "@journey-viewer/design-system";
import type { JourneyGraph } from "@journey-viewer/ujg-jsonld";
import type { ScreenshotMap } from "@/screens";
import type { TouchpointPresentation } from "@/presentation";
import type { ViewerExtensions } from "@/extensions";
import { Viewer } from "@/components/Viewer/Viewer";
import { ViewerBar } from "@/components/ViewerBar/ViewerBar";
import { DocumentSummary } from "@/components/DocumentSummary/DocumentSummary";
import { ViewSwitch } from "@/components/ViewSwitch/ViewSwitch";
import { WhenView } from "@/components/WhenView/WhenView";
import { WhenTreeLayout } from "@/components/WhenTreeLayout/WhenTreeLayout";
import { TreeLayout } from "@/components/TreeLayout/TreeLayout";
import { ExpandCollapse } from "@/components/ExpandCollapse/ExpandCollapse";
import { TouchpointFilter } from "@/components/TouchpointFilter/TouchpointFilter";
import { GraphSearch } from "@/components/GraphSearch/GraphSearch";
import { ResetView } from "@/components/ResetView/ResetView";
import { ViewerMain } from "@/components/ViewerMain/ViewerMain";
import { treeView } from "@/components/ExplorerView/ExplorerView";
import { flowView } from "@/components/FlowView/FlowView";
import { FlowSettings } from "@/components/FlowSettings/FlowSettings";
import { FlowPlacement } from "@/components/FlowPlacement/FlowPlacement";
import { FlowZoom } from "@/components/FlowZoom/FlowZoom";
import { FlowRoots } from "@/components/FlowRoots/FlowRoots";

export interface JourneyViewerProps {
  /** Keep this reference stable between actual replacements; every new object resets interaction. */
  readonly graph: JourneyGraph;
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

/** The default arrangement: Tree and Flow, their own controls, and the shared inspector. */
export function JourneyViewer({
  graph,
  level = 2,
  screenshots = {},
  touchpoints = {},
  extensions,
  headerStart,
  headerEnd,
}: JourneyViewerProps) {
  return (
    <FlowSettings>
      <Viewer
        graph={graph}
        views={views}
        level={level}
        screenshots={screenshots}
        touchpoints={touchpoints}
        {...(extensions ? { extensions } : {})}
      >
        <ViewerBar>
          {headerStart ?? <DocumentSummary />}
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
          {headerEnd}
        </ViewerBar>
        <ViewerMain />
      </Viewer>
    </FlowSettings>
  );
}
