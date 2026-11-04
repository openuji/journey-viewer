import { ExplorerBar } from "@journey-viewer/design-system";
import type { JourneyGraph } from "@journey-viewer/ujg-jsonld";
import type { ReactNode } from "react";
import type { ViewerMode, ViewerSnapshot, ViewerTarget } from "@/navigation";
import type { ScreenshotMap } from "@/screens";
import type { TouchpointPresentation } from "@/presentation";
import { ControlledDocumentSummary } from "@/components/DocumentSummary/DocumentSummary";
import { ControlledExpandCollapse } from "@/components/ExpandCollapse/ExpandCollapse";
import { ControlledTouchpointFilter } from "@/components/TouchpointFilter/TouchpointFilter";
import { ControlledGraphSearch } from "@/components/GraphSearch/GraphSearch";
import { ControlledResetView } from "@/components/ResetView/ResetView";
import { ControlledTreeLayout } from "@/components/TreeLayout/TreeLayout";

export interface JourneyNavigationProps {
  readonly graph: JourneyGraph;
  readonly snapshot: ViewerSnapshot;
  readonly onMode: (mode: ViewerMode) => void;
  readonly onExpandAll: () => void;
  readonly onCollapseAll: () => void;
  /** Null shows every journey. */
  readonly onTouchpoint: (id: string | null) => void;
  readonly onQuery: (query: string) => void;
  /** Search picking clears the query after the target resolves. */
  readonly onSearchPick: (target: ViewerTarget) => void;
  readonly onReset: () => void;
  /** Whether the result popover may show for a non-blank query. */
  readonly searchOpen?: boolean;
  readonly onSearchFocus?: () => void;
  readonly screenshots?: ScreenshotMap;
  readonly touchpoints?: TouchpointPresentation;
  /** Leading bar content; defaults to a document summary. */
  readonly start?: ReactNode;
  /** Trailing bar content, such as source links. */
  readonly end?: ReactNode;
}

/**
 * Controlled explorer bar; every result and summary is derived from source on each render. It
 * arranges the same controlled parts as the `Viewer` pieces, for callers that own the snapshot.
 */
export function JourneyNavigation({
  graph,
  snapshot,
  onMode,
  onExpandAll,
  onCollapseAll,
  onTouchpoint,
  onQuery,
  onSearchPick,
  onReset,
  searchOpen = true,
  onSearchFocus,
  screenshots = {},
  touchpoints = {},
  start,
  end,
}: JourneyNavigationProps) {
  const { navigation } = snapshot;
  return (
    <ExplorerBar>
      {start ?? (
        <ControlledDocumentSummary
          graph={graph}
          screenshots={screenshots}
          touchpointIds={navigation.touchpointIds}
        />
      )}
      <ControlledTreeLayout mode={navigation.mode} onChange={onMode} />
      {navigation.mode === "tree" && (
        <ControlledExpandCollapse
          onExpandAll={onExpandAll}
          onCollapseAll={onCollapseAll}
        />
      )}
      <ControlledTouchpointFilter
        graph={graph}
        touchpoints={touchpoints}
        selected={navigation.touchpointIds}
        onSelect={onTouchpoint}
      />
      <ControlledGraphSearch
        graph={graph}
        screenshots={screenshots}
        touchpoints={touchpoints}
        query={navigation.query}
        touchpointIds={navigation.touchpointIds}
        open={searchOpen}
        onQuery={onQuery}
        onPick={onSearchPick}
        onFocus={onSearchFocus}
      >
        <ControlledResetView onReset={onReset} />
      </ControlledGraphSearch>
      {end}
    </ExplorerBar>
  );
}
