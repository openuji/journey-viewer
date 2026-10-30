import type { ReactNode } from "react";
import type { HeadingLevel } from "@journey-viewer/design-system";
import type { UjgDocument } from "@journey-viewer/ujg-jsonld";
import type { ScreenshotMap } from "@/screens";
import type { TouchpointPresentation } from "@/presentation";
import type { ViewerExtensions } from "@/extensions";
import { Viewer } from "@/components/Viewer/Viewer";
import { ViewerBar } from "@/components/ViewerBar/ViewerBar";
import { DocumentSummary } from "@/components/DocumentSummary/DocumentSummary";
import { ViewSwitch } from "@/components/ViewSwitch/ViewSwitch";
import { WhenView } from "@/components/WhenView/WhenView";
import { ExpandCollapse } from "@/components/ExpandCollapse/ExpandCollapse";
import { TouchpointFilter } from "@/components/TouchpointFilter/TouchpointFilter";
import { GraphSearch } from "@/components/GraphSearch/GraphSearch";
import { ResetView } from "@/components/ResetView/ResetView";
import { ViewerMain } from "@/components/ViewerMain/ViewerMain";
import { columnsView, treeView } from "@/components/ExplorerView/ExplorerView";

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

const views = [treeView, columnsView];

/** The default arrangement: the original hierarchy's explorer bar, Tree and Columns, and the inspector. */
export function JourneyViewer({
  document,
  level = 2,
  screenshots = {},
  touchpoints = {},
  extensions,
  headerStart,
  headerEnd,
}: JourneyViewerProps) {
  return (
    <Viewer
      document={document}
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
  );
}
