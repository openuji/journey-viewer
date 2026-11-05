import { projectJourneyGraph } from "@journey-viewer/ujg-jsonld";
import type { JourneyGraph } from "@journey-viewer/ujg-jsonld";
import oidcSource from "~/examples/solid-oidc/solid-oidc.ujg.jsonld?raw";
import topologySource from "~/tests/fixtures/hierarchy.ujg.jsonld?raw";
import emptyCompositesSource from "~/tests/fixtures/empty-composites.ujg.jsonld?raw";
import navigationReviewSource from "~/tests/fixtures/navigation-review.ujg.jsonld?raw";
import screensSource from "~/tests/fixtures/screens.ujg.jsonld?raw";

function freeze(value: unknown): void {
  if (value && typeof value === "object") {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
}

// Parsing and projection are explicit at this development boundary, never in rendering.
const read = (source: string): JourneyGraph => {
  const document: unknown = JSON.parse(source);
  freeze(document);
  return projectJourneyGraph(document);
};

export const oidcGraph = read(oidcSource);
export const topologyGraph = read(topologySource);
export const emptyCompositesGraph = read(emptyCompositesSource);
export const navigationReviewGraph = read(navigationReviewSource);
export const screensGraph = read(screensSource);
const accountingTransitions = [
  ...Array.from({ length: 20 }, (_, index) => ({
    "@id": `urn:test:accounting:self-${index + 1}`,
    "@type": "Transition",
    label: `Self loop ${index + 1}`,
    from: "urn:test:accounting:active",
    to: "urn:test:accounting:active",
  })),
  ...["source-a", "source-b", "source-c"].map((source, index) => ({
    "@id": `urn:test:accounting:incoming-${index + 1}`,
    "@type": "Transition",
    label: `Arrive from source ${index + 1}`,
    from: `urn:test:accounting:${source}`,
    to: "urn:test:accounting:active",
  })),
  ...["target-a", "target-b"].map((target, index) => ({
    "@id": `urn:test:accounting:outgoing-${index + 1}`,
    "@type": "Transition",
    label: `Continue to target ${index + 1}`,
    from: "urn:test:accounting:active",
    to: `urn:test:accounting:${target}`,
  })),
  ...Array.from({ length: 2 }, (_, index) => ({
    "@id": `urn:test:accounting:complete-${index + 1}`,
    "@type": "Transition",
    label: `Complete ${index + 1}`,
    from: "urn:test:accounting:active",
    to: "urn:test:accounting:complete",
  })),
  ...Array.from({ length: 3 }, (_, index) => ({
    "@id": `urn:test:accounting:cancel-${index + 1}`,
    "@type": "Transition",
    label: `Cancel ${index + 1}`,
    from: "urn:test:accounting:active",
    to: "urn:test:accounting:cancel",
  })),
];
const transitionAccountingDocument = {
  "@context": "https://ujg.specs.openuji.org/ed/ns/core.context.jsonld",
  "@id": "urn:test:accounting:document",
  "@type": "UJGDocument",
  nodes: [
    {
      "@id": "urn:test:accounting:journey",
      "@type": "Journey",
      label: "Transition accounting",
      entryRefs: ["urn:test:accounting:entry"],
      defaultEntryRef: "urn:test:accounting:entry",
      stateRefs: [
        "urn:test:accounting:active",
        "urn:test:accounting:source-a",
        "urn:test:accounting:source-b",
        "urn:test:accounting:source-c",
        "urn:test:accounting:target-a",
        "urn:test:accounting:target-b",
      ],
      exitRefs: ["urn:test:accounting:complete", "urn:test:accounting:cancel"],
      transitionRefs: accountingTransitions.map((transition) =>
        String(transition["@id"]),
      ),
    },
    {
      "@id": "urn:test:accounting:entry",
      "@type": "JourneyEntry",
      label: "Begin",
      stateRef: "urn:test:accounting:active",
    },
    ...[
      ["active", "Recording; choose an element or drag a region for a comment"],
      ["source-a", "Saving comment"],
      ["source-b", "Composer open"],
      ["source-c", "Composer error"],
      ["target-a", "Resume recording"],
      ["target-b", "Open markup"],
    ].map(([id, label]) => ({
      "@id": `urn:test:accounting:${id}`,
      "@type": "State",
      label,
    })),
    {
      "@id": "urn:test:accounting:complete",
      "@type": "JourneyExit",
      label: "Comment complete",
    },
    {
      "@id": "urn:test:accounting:cancel",
      "@type": "JourneyExit",
      label: "Comment cancelled",
    },
    ...accountingTransitions,
  ],
};
freeze(transitionAccountingDocument);
export const transitionAccountingGraph = projectJourneyGraph(
  transitionAccountingDocument,
);
export const emptyGraph = projectJourneyGraph({
  "@context": "https://ujg.specs.openuji.org/ed/ns/core.context.jsonld",
  "@id": "urn:example:empty",
  "@type": "UJGDocument",
});
