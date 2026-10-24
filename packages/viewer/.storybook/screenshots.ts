import type { ScreenshotMap } from "@/screens";
import type { TouchpointPresentation } from "@/presentation";
import screenshotSource from "~/examples/solid-oidc/screenshots.json?raw";
import touchpointSource from "~/examples/solid-oidc/touchpoints.json?raw";

// Explicit browser/example boundary: native JSON parsing and a separately chosen asset base.
const paths: ScreenshotMap = JSON.parse(screenshotSource);
const assetBase = new URL("/solid-oidc/", globalThis.location.href);
export const oidcScreenshots: ScreenshotMap = Object.freeze(
  Object.fromEntries(
    Object.entries(paths).map(([surfaceRef, path]) => [
      surfaceRef,
      new URL(path, assetBase).href,
    ]),
  ),
);
export const oidcTouchpoints: TouchpointPresentation =
  JSON.parse(touchpointSource);
Object.values(oidcTouchpoints).forEach(Object.freeze);
Object.freeze(oidcTouchpoints);

export const firstSurface = "urn:ujg:solid-oidc:app-sign-in-required-surface";
export const replacedScreenshots: ScreenshotMap = Object.freeze({
  ...oidcScreenshots,
  [firstSurface]: new URL("./screens/app-logged-in.png?revision=2", assetBase)
    .href,
});
export const missingScreenshots: ScreenshotMap = Object.freeze({
  ...oidcScreenshots,
  [firstSurface]: new URL("./screens/does-not-exist.png", assetBase).href,
});
export const removedScreenshot: ScreenshotMap = Object.freeze(
  Object.fromEntries(
    Object.entries(oidcScreenshots).filter(([ref]) => ref !== firstSurface),
  ),
);
