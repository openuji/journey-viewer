import { ExplorerBarTitle } from "@journey-viewer/design-system";
import type { UjgDocument } from "@journey-viewer/ujg-jsonld";
import { getViewerSummary } from "@/navigation";
import { countMappedScreens } from "@/screens";
import type { ScreenshotMap } from "@/screens";
import { useViewer } from "@/components/Viewer/Viewer";

export interface ControlledDocumentSummaryProps {
  readonly document: UjgDocument;
  readonly screenshots: ScreenshotMap;
  /** The touchpoint filter; the counts cover the journeys it shows. */
  readonly touchpointIds: readonly string[];
}

/** The document's label with its journey, state, transition and screen counts. */
export function ControlledDocumentSummary({
  document,
  screenshots,
  touchpointIds,
}: ControlledDocumentSummaryProps) {
  const summary = getViewerSummary(document, touchpointIds);
  const screens = countMappedScreens(document, screenshots);
  const { label } = document;
  return (
    <ExplorerBarTitle
      title={typeof label === "string" ? label : "Journeys"}
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
  const { document, screenshots, state } = useViewer();
  return (
    <ControlledDocumentSummary
      document={document}
      screenshots={screenshots}
      touchpointIds={state.disclosure.snapshot.navigation.touchpointRefs}
    />
  );
}
