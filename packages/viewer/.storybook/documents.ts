import type { UjgDocument } from "@journey-viewer/ujg-jsonld";
import oidcSource from "../../../examples/solid-oidc/solid-oidc.ujg.jsonld?raw";
import topologySource from "../tests/fixtures/hierarchy.ujg.jsonld?raw";
import emptyCompositesSource from "../tests/fixtures/empty-composites.ujg.jsonld?raw";
import navigationReviewSource from "../tests/fixtures/navigation-review.ujg.jsonld?raw";
import screensSource from "../tests/fixtures/screens.ujg.jsonld?raw";

function freeze(value: unknown): void {
  if (value && typeof value === "object") {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
}

// Parsing is explicit at this development boundary, never in production rendering.
export const oidcDocument: UjgDocument = JSON.parse(oidcSource);
export const topologyDocument: UjgDocument = JSON.parse(topologySource);
export const emptyCompositesDocument: UjgDocument = JSON.parse(emptyCompositesSource);
export const navigationReviewDocument: UjgDocument = JSON.parse(navigationReviewSource);
export const screensDocument: UjgDocument = JSON.parse(screensSource);
export const emptyDocument: UjgDocument = {
  "@context": "urn:example:context",
  "@id": "urn:example:empty",
  "@type": "UJGDocument",
};
freeze(oidcDocument);
freeze(topologyDocument);
freeze(emptyCompositesDocument);
freeze(navigationReviewDocument);
freeze(screensDocument);
freeze(emptyDocument);
