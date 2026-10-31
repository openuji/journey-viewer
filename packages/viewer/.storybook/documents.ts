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
export const emptyGraph = projectJourneyGraph({
  "@context": "https://ujg.specs.openuji.org/ed/ns/core.context.jsonld",
  "@id": "urn:example:empty",
  "@type": "UJGDocument",
});
