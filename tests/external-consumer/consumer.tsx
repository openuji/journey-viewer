// Type-checked inside a temporary install of the packed packages; see ../external-consumer.mjs.
import { Button } from "@journey-viewer/design-system";
import { lint } from "@journey-viewer/lint";
import {
  documentShape,
  referenceTargets,
  uniqueNodeIds,
} from "@journey-viewer/lint/ujg";
import { getNodesByType, type UjgDocument } from "@journey-viewer/ujg-jsonld";
import { JourneyViewer } from "@journey-viewer/viewer";

export function Consumer({ document }: Readonly<{ document: UjgDocument }>) {
  const findings = lint(document, [
    documentShape,
    uniqueNodeIds,
    referenceTargets,
  ]);
  const journeys = getNodesByType(document, "Journey");
  return (
    <main data-jv-theme="light">
      <Button>{`${journeys.length} journeys, ${findings.length} findings`}</Button>
      <JourneyViewer document={document} />
    </main>
  );
}
