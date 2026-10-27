import type { UjgDocument } from "@journey-viewer/ujg-jsonld";
import type {
  ScreenshotMap,
  TouchpointPresentation,
} from "@journey-viewer/viewer";
import oidcSource from "~/examples/solid-oidc/solid-oidc.ujg.jsonld?raw";
import screenshotSource from "~/examples/solid-oidc/screenshots.json?raw";
import touchpointSource from "~/examples/solid-oidc/touchpoints.json?raw";
import hierarchySource from "~/packages/viewer/tests/fixtures/hierarchy.ujg.jsonld?raw";
import screensSource from "~/packages/viewer/tests/fixtures/screens.ujg.jsonld?raw";
import emptyCompositesSource from "~/packages/viewer/tests/fixtures/empty-composites.ujg.jsonld?raw";
import minimalSource from "~/packages/ujg-jsonld/tests/fixtures/minimal.ujg.jsonld?raw";

function freeze<Value>(value: Value): Value {
  if (value && typeof value === "object") {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

// Parsing is explicit at this development boundary; the canonical files stay unchanged.
const parse = (source: string): UjgDocument => freeze(JSON.parse(source));

export const oidcDocument = parse(oidcSource);
export const hierarchyFixture = parse(hierarchySource);
export const screensFixture = parse(screensSource);
export const emptyCompositesFixture = parse(emptyCompositesSource);
export const minimalFixture = parse(minimalSource);

// Storybook serves the example folder at /solid-oidc/; paths resolve against that asset base.
const assetBase = new URL("/solid-oidc/", globalThis.location.href);
const paths: Record<string, string> = JSON.parse(screenshotSource);
export const oidcScreenshots: ScreenshotMap = freeze(
  Object.fromEntries(
    Object.entries(paths).map(([surfaceRef, path]) => [
      surfaceRef,
      new URL(path, assetBase).href,
    ]),
  ),
);
export const oidcTouchpoints: TouchpointPresentation = freeze(
  JSON.parse(touchpointSource),
);
