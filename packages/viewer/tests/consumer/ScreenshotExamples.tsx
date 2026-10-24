import { useState } from "react";
import { Button, Heading } from "@journey-viewer/design-system";
import { JourneyViewer } from "@journey-viewer/viewer";
import { oidcDocument } from "~/.storybook/documents";
import { oidcScreenshots, oidcTouchpoints } from "~/.storybook/screenshots";
import { ScreenshotInputs } from "~/.storybook/ScreenshotInputs";

export function ScreenshotExamples() {
  const [document, setDocument] = useState(oidcDocument);
  return (
    <>
      <Heading level={2}>Independent screenshot documents</Heading>
      <Button
        onClick={() => setDocument((current) => Object.freeze({ ...current }))}
      >
        Replace screenshot viewer document
      </Button>
      <ScreenshotInputs>
        {(screenshots) => (
          <div data-testid="screens-first">
            <JourneyViewer
              document={document}
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
          document={oidcDocument}
          screenshots={oidcScreenshots}
          touchpoints={oidcTouchpoints}
          level={3}
        />
      </div>
    </>
  );
}
