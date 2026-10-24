import { useState } from "react";
import { Button, Heading } from "@journey-viewer/design-system";
import { JourneyViewer } from "@journey-viewer/viewer";
import {
  emptyCompositesDocument,
  emptyDocument,
  navigationReviewDocument,
  oidcDocument,
  topologyDocument,
} from "~/.storybook/documents";

const replacement = Object.freeze({ ...oidcDocument });

/** Development-only document reading/replacement controls, outside the viewer package runtime. */
export function InteractionExamples() {
  const [document, setDocument] = useState(oidcDocument);
  return (
    <>
      <Heading level={2}>Selection and inspection</Heading>
      <div>
        <Button
          onClick={() =>
            setDocument((current) =>
              current === oidcDocument ? replacement : oidcDocument,
            )
          }
        >
          Replace document with same ID
        </Button>
        <Button onClick={() => setDocument(emptyDocument)}>
          Load empty document
        </Button>
        <Button onClick={() => setDocument(topologyDocument)}>
          Load topology document
        </Button>
        <Button onClick={() => setDocument(emptyCompositesDocument)}>
          Load empty composites
        </Button>
        <Button onClick={() => setDocument(navigationReviewDocument)}>
          Load navigation review
        </Button>
      </div>
      <div data-testid="interactive-first">
        <JourneyViewer document={document} level={3} />
      </div>
      <Heading level={2}>Independent second instance</Heading>
      <div data-testid="interactive-second">
        <JourneyViewer document={oidcDocument} level={3} />
      </div>
    </>
  );
}
