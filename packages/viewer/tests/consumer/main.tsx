import { createRoot } from "react-dom/client";
import { Heading, Text } from "@journey-viewer/design-system";
import "@journey-viewer/design-system/styles.css";
import "@journey-viewer/design-system/reset.css";
import { JourneyHierarchy } from "@journey-viewer/viewer";
import "@journey-viewer/viewer/styles.css";
import { oidcDocument, topologyDocument } from "~/.storybook/documents";
import "~/tests/consumer/consumer.css";
import { InteractionExamples } from "~/tests/consumer/InteractionExamples";
import { ScreenshotExamples } from "~/tests/consumer/ScreenshotExamples";
import { ExtensionExamples } from "~/tests/consumer/ExtensionExamples";

createRoot(document.getElementById("root")!).render(
  <main className="consumer" data-jv-theme="light">
    <Heading level={1}>Compiled viewer consumer</Heading>
    <Text as="p" tone="muted">
      Stage 5: all journeys expanded.
    </Text>
    <div data-testid="oidc">
      <JourneyHierarchy document={oidcDocument} />
    </div>
    <Heading level={2}>Multiple roots and recursive references</Heading>
    <div data-testid="fixture">
      <JourneyHierarchy document={topologyDocument} level={3} />
    </div>
    <div data-jv-theme="dark" data-testid="dark">
      <JourneyHierarchy document={topologyDocument} level={3} />
    </div>
    <InteractionExamples />
    <ScreenshotExamples />
    <ExtensionExamples />
  </main>,
);
