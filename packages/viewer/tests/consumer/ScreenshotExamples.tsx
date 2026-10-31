import { useState } from "react";
import { Button, Heading } from "@journey-viewer/design-system";
import { JourneyViewer } from "@journey-viewer/viewer";
import { oidcGraph } from "~/.storybook/documents";
import { oidcScreenshots, oidcTouchpoints } from "~/.storybook/screenshots";
import { ScreenshotInputs } from "~/.storybook/ScreenshotInputs";

export function ScreenshotExamples() {
  const [graph, setGraph] = useState(oidcGraph);
  return (
    <>
      <Heading level={2}>Independent screenshot documents</Heading>
      <Button
        onClick={() => setGraph((current) => Object.freeze({ ...current }))}
      >
        Replace screenshot viewer document
      </Button>
      <ScreenshotInputs>
        {(screenshots) => (
          <div data-testid="screens-first">
            <JourneyViewer
              graph={graph}
              screenshots={screenshots}
              touchpoints={oidcTouchpoints}
              level={3}
            />
          </div>
        )}
      </ScreenshotInputs>
      <Heading level={2}>Independent screenshot viewer</Heading>
      <div data-testid="screens-second">
        <JourneyViewer
          graph={oidcGraph}
          screenshots={oidcScreenshots}
          touchpoints={oidcTouchpoints}
          level={3}
        />
      </div>
    </>
  );
}
