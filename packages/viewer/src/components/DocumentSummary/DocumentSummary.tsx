import { ExplorerBarTitle } from "@journey-viewer/design-system";
import type { JourneyGraph } from "@journey-viewer/ujg-jsonld";
import { getViewerSummary } from "@/navigation";
import { countMappedScreens } from "@/screens";
import type { ScreenshotMap } from "@/screens";
import { useViewer } from "@/components/Viewer/Viewer";

export interface ControlledDocumentSummaryProps {
  readonly graph: JourneyGraph;
  readonly screenshots: ScreenshotMap;
  /** The touchpoint filter; the counts cover the journeys it shows. */
  readonly touchpointIds: readonly string[];
}

/** The document's label with its journey, state, transition and screen counts. */
export function ControlledDocumentSummary({
  graph,
  screenshots,
  touchpointIds,
}: ControlledDocumentSummaryProps) {
  const summary = getViewerSummary(graph, touchpointIds);
  const screens = countMappedScreens(graph, screenshots);
  return (
    <ExplorerBarTitle
      title={graph.label ?? "Journeys"}
      subtitle={[
        `${summary.journeys} journeys`,
        `${summary.states} states`,
        `${summary.transitions} transitions`,
        ...(screens ? [`${screens} screens`] : []),
      ].join(" · ")}
    />
  );
}

export function DocumentSummary() {
  const { graph, screenshots, state } = useViewer();
  return (
    <ControlledDocumentSummary
      graph={graph}
      screenshots={screenshots}
      touchpointIds={state.disclosure.snapshot.navigation.touchpointIds}
    />
  );
}
