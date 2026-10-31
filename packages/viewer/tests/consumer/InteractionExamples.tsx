import { useState } from "react";
import { Button, Heading } from "@journey-viewer/design-system";
import { JourneyViewer } from "@journey-viewer/viewer";
import {
  emptyCompositesGraph,
  emptyGraph,
  navigationReviewGraph,
  oidcGraph,
  topologyGraph,
} from "~/.storybook/documents";

const replacement = Object.freeze({ ...oidcGraph });

/** Development-only document reading/replacement controls, outside the viewer package runtime. */
export function InteractionExamples() {
  const [graph, setGraph] = useState(oidcGraph);
  return (
    <>
      <Heading level={2}>Selection and inspection</Heading>
      <div>
        <Button
          onClick={() =>
            setGraph((current) =>
              current === oidcGraph ? replacement : oidcGraph,
            )
          }
        >
          Replace document with same ID
        </Button>
        <Button onClick={() => setGraph(emptyGraph)}>
          Load empty document
        </Button>
        <Button onClick={() => setGraph(topologyGraph)}>
          Load topology document
        </Button>
        <Button onClick={() => setGraph(emptyCompositesGraph)}>
          Load empty composites
        </Button>
        <Button onClick={() => setGraph(navigationReviewGraph)}>
          Load navigation review
        </Button>
      </div>
      <div data-testid="interactive-first">
        <JourneyViewer graph={graph} level={3} />
      </div>
      <Heading level={2}>Independent second instance</Heading>
      <div data-testid="interactive-second">
        <JourneyViewer graph={oidcGraph} level={3} />
      </div>
    </>
  );
}
