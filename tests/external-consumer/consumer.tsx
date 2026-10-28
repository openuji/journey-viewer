// Type-checked inside a temporary install of the packed packages; see ../external-consumer.mjs.
import { Button } from "@journey-viewer/design-system";
import { layoutLevel, type LevelInput } from "@journey-viewer/flow-layout";
import { lint } from "@journey-viewer/lint";
import {
  documentShape,
  referenceTargets,
  uniqueNodeIds,
} from "@journey-viewer/lint/ujg";
import { getNodesByType, type UjgDocument } from "@journey-viewer/ujg-jsonld";
import { JourneyViewer } from "@journey-viewer/viewer";

export function levelSize(input: LevelInput): number {
  const { width, height } = layoutLevel(input, {
    placement: "aligned-left",
    cornerRadius: 12,
    arrowLength: 12,
  });
  return width * height;
}

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
