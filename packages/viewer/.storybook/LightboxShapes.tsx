import { useState } from "react";
import { Button } from "@journey-viewer/design-system";
import { JourneyViewer } from "@journey-viewer/viewer";
import type { ScreenshotMap } from "@journey-viewer/viewer";
import { projectJourneyGraph } from "@journey-viewer/ujg-jsonld";

const shapes = ["landscape", "portrait", "square", "tall", "wide", "small"];
const graph = projectJourneyGraph({
  "@context": [
    "https://ujg.specs.openuji.org/ed/ns/core.context.jsonld",
    "https://ujg.specs.openuji.org/ed/ns/graph.context.jsonld",
    "https://ujg.specs.openuji.org/ed/ns/surface.context.jsonld",
  ],
  "@id": "urn:lightbox:document",
  "@type": "UJGDocument",
  nodes: [
    {
      "@id": "urn:lightbox:root",
      "@type": "Journey",
      label:
        "Record and annotate a browser session / via Recording with page comments active / Add page comments during a recording / Session Recorder Chrome extension / ".repeat(
          5,
        ),
      stateRefs: [
        "urn:lightbox:single",
        "urn:lightbox:call-1",
        "urn:lightbox:call-2",
      ],
      entryRefs: [],
    },
    {
      "@id": "urn:lightbox:single",
      "@type": "State",
      label: "Small screenshot outside the shared journey",
    },
    {
      "@id": "urn:lightbox:single:surface",
      "@type": "Surface",
      graphNodeRef: "urn:lightbox:single",
    },
    ...[1, 2].map((index) => ({
      "@id": `urn:lightbox:call-${index}`,
      "@type": "CompositeState",
      label: `Recording with page comments active; microphone permission pending (call ${index})`,
      subjourneyRefs: ["urn:lightbox:journey"],
    })),
    {
      "@id": "urn:lightbox:journey",
      "@type": "Journey",
      label: "Record and annotate a browser session",
      stateRefs: shapes.map((shape) => `urn:lightbox:${shape}`),
      entryRefs: [],
    },
    ...shapes.flatMap((shape) => [
      {
        "@id": `urn:lightbox:${shape}`,
        "@type": "State",
        label: `${shape} screenshot; comment composer displays an error while microphone permission is pending`,
      },
      {
        "@id": `urn:lightbox:${shape}:surface`,
        "@type": "Surface",
        graphNodeRef: `urn:lightbox:${shape}`,
      },
    ]),
  ],
});
const baseline: ScreenshotMap = Object.fromEntries([
  ["urn:lightbox:single:surface", "/lightbox-fixtures/small.svg"],
  ...shapes.map((shape) => [
    `urn:lightbox:${shape}:surface`,
    `/lightbox-fixtures/${shape}.svg`,
  ]),
]);

/** Same compiled viewer boundary as a consumer, with real image requests for delayed-load tests. */
export function LightboxShapes() {
  const [screenshots, setScreenshots] = useState(baseline);
  return (
    <div data-testid="lightbox-shapes">
      <Button
        onClick={() =>
          setScreenshots({
            ...baseline,
            "urn:lightbox:landscape:surface":
              "/lightbox-fixtures/landscape.svg?revision=2",
          })
        }
      >
        Replace landscape URL
      </Button>
      <JourneyViewer graph={graph} screenshots={screenshots} />
    </div>
  );
}
