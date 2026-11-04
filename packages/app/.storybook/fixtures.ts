import { projectJourneyGraph } from "@journey-viewer/ujg-jsonld";
import type {
  ScreenshotMap,
  TouchpointPresentation,
} from "@journey-viewer/viewer";
import type { DocumentSource } from "@/read-source";
import type { ApplicationReport } from "@/report";
import oidcText from "~/examples/solid-oidc/solid-oidc.ujg.jsonld?raw";
import screenshotText from "~/examples/solid-oidc/screenshots.json?raw";
import touchpointText from "~/examples/solid-oidc/touchpoints.json?raw";

// Native parsing and projection are explicit at the development boundary, as in the viewer catalog.
export const oidcGraph = projectJourneyGraph(JSON.parse(oidcText));
export const emptyGraph = projectJourneyGraph({
  "@context": "https://ujg.specs.openuji.org/ed/ns/core.context.jsonld",
  "@id": "urn:example:empty",
  "@type": "UJGDocument",
});
export const oidcSource: DocumentSource = Object.freeze({
  name: "solid-oidc.ujg.jsonld",
  document: "/solid-oidc/solid-oidc.ujg.jsonld",
  screenshots: "/solid-oidc/screenshots.json",
  touchpoints: "/solid-oidc/touchpoints.json",
});
export const oidcDocument = Object.freeze({
  title: oidcSource.name,
  identity: oidcGraph.id,
});
const paths: ScreenshotMap = JSON.parse(screenshotText);
export const oidcScreenshots: ScreenshotMap = Object.freeze(
  Object.fromEntries(
    Object.entries(paths).map(([ref, path]) => [
      ref,
      new URL(path, new URL("/solid-oidc/", globalThis.location.href)).href,
    ]),
  ),
);
export const oidcTouchpoints: TouchpointPresentation =
  JSON.parse(touchpointText);
Object.values(oidcTouchpoints).forEach(Object.freeze);
Object.freeze(oidcTouchpoints);

export const reports = {
  idle: { kind: "idle" },
  ready: { kind: "checked", name: oidcSource.name, findings: [] },
  reading: { kind: "reading", name: "checkout.jsonld" },
  warnings: {
    kind: "checked",
    name: oidcSource.name,
    findings: [
      {
        ruleId: "ujg/reference-targets",
        path: ["nodes", 14, "to"],
        message:
          "Reference urn:example:missing-state does not resolve to a State.",
      },
    ],
  },
  syntaxError: {
    kind: "syntax-error",
    name: "broken.json",
    message: "Expected a property name or '}' in JSON at position 1.",
  },
  readError: {
    kind: "read-error",
    name: "unreadable.jsonld",
    message: "The file is no longer readable. Select the file again.",
  },
  unsupportedVersion: {
    kind: "checked",
    name: "future.jsonld",
    findings: [
      {
        ruleId: "app/ujg-version",
        path: ["@context"],
        message:
          "Unsupported UJG version: https://ujg.specs.openuji.org/2027-01-15/ns/core.context.jsonld. The app reads the UJG Editor's Draft.",
      },
    ],
  },
} as const satisfies Readonly<Record<string, ApplicationReport>>;
