import { useState } from "react";
import { Button, Heading } from "@journey-viewer/design-system";
import { JourneyViewer } from "../../dist/index.js";
import type { ViewerExtensions } from "../../dist/index.js";
import { exampleExtensions } from "../../.storybook/extensions.js";
import { topologyDocument } from "../../.storybook/documents.js";

const extensions: ViewerExtensions = exampleExtensions;

export function ExtensionExamples() {
  const [enabled, setEnabled] = useState(true);
  const [replacement, setReplacement] = useState(false);
  const [document, setDocument] = useState(topologyDocument);
  return <>
    <Heading level={2}>Explicit build-time extensions</Heading>
    <Button aria-pressed={enabled} onClick={() => setEnabled((current) => !current)}>Toggle example extensions</Button>
    <Button onClick={() => setReplacement((current) => !current)}>Replace example extensions</Button>
    <Button onClick={() => setDocument((current) => Object.freeze({ ...current }))}>Replace extension viewer document</Button>
    <div data-testid="extensions-first"><JourneyViewer document={document} level={3}
      {...(enabled ? { extensions: replacement ? { ...extensions, annotations: [] } : extensions } : {})} /></div>
    <Heading level={2}>Independent default viewer</Heading>
    <div data-testid="extensions-second"><JourneyViewer document={topologyDocument} level={3} /></div>
  </>;
}
