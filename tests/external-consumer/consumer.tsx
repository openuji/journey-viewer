// Type-checked inside a temporary install of the packed packages; see ../external-consumer.mjs.
import { Application, checkDocument } from "@journey-viewer/app";
import type { DocumentSource } from "@journey-viewer/app";
import { Button } from "@journey-viewer/design-system";
import { layoutLevel, type LevelInput } from "@journey-viewer/flow-layout";
import { lint } from "@journey-viewer/lint";
import {
  documentShape,
  referenceTargets,
  uniqueNodeIds,
} from "@journey-viewer/lint/ujg";
import {
  projectJourneyGraph,
  type JourneyGraph,
} from "@journey-viewer/ujg-jsonld";
import {
  getNodesByType,
  type UjgDocument,
} from "@journey-viewer/ujg-jsonld/ed";
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

/** Derived once per document and kept: every new graph resets the viewer. */
export function graphOf(document: UjgDocument): JourneyGraph {
  return projectJourneyGraph(document);
}

export function Consumer({
  document,
  graph,
}: Readonly<{ document: UjgDocument; graph: JourneyGraph }>) {
  const findings = lint(document, [
    documentShape,
    uniqueNodeIds,
    referenceTargets,
  ]);
  const journeys = getNodesByType(document, "Journey");
  return (
    <main data-jv-theme="light">
      <Button>{`${journeys.length} journeys, ${findings.length} findings`}</Button>
      <JourneyViewer graph={graph} />
    </main>
  );
}

function ExpandEverything() {
  const { dispatch } = useViewer();
  return <Button onClick={() => dispatch({ type: "expandAll" })}>Open</Button>;
}

export function Composition({ graph }: Readonly<{ graph: JourneyGraph }>) {
  return (
    <Viewer graph={graph} views={[treeView, flowView()]}>
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

const example: DocumentSource = {
  name: "Example",
  document: "/examples/example.jsonld",
  screenshots: "/examples/screenshots.json",
};

export function Site({ value }: Readonly<{ value: unknown }>) {
  return checkDocument(value).kind === "ready" ? (
    <Application
      source={example}
      brand={<a href="/">Home</a>}
      alternatives={<a href="/examples/">Open the example</a>}
    />
  ) : (
    <Application />
  );
}
