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
import {
  FlowPlacement,
  FlowSettings,
  GraphSearch,
  JourneyViewer,
  ResetView,
  Viewer,
  ViewerBar,
  ViewerMain,
  ViewSwitch,
  WhenView,
  flowView,
  treeView,
  useViewer,
} from "@journey-viewer/viewer";

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

function ExpandEverything() {
  const { dispatch } = useViewer();
  return <Button onClick={() => dispatch({ type: "expandAll" })}>Open</Button>;
}

export function Composition({ document }: Readonly<{ document: UjgDocument }>) {
  return (
    <Viewer document={document} views={[treeView, flowView()]}>
      <FlowSettings>
        <ViewerBar>
          <ViewSwitch />
          <WhenView id="flow">
            <FlowPlacement />
          </WhenView>
          <ExpandEverything />
          <GraphSearch>
            <ResetView />
          </GraphSearch>
        </ViewerBar>
        <ViewerMain />
      </FlowSettings>
    </Viewer>
  );
}
