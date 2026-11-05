import { createRoot } from "react-dom/client";
import "@journey-viewer/design-system/reset.css";
import "@journey-viewer/design-system/styles.css";
import "@journey-viewer/viewer/styles.css";
import "@/site/site.css";
import { Application } from "@/components/Application/Application";
import type { EmbeddedDocument } from "@/components/Application/Application";
import { BrandLink } from "@/components/BrandLink/BrandLink";
import type { DocumentSource } from "@/read-source";
import {
  isScreenshotMap,
  isTouchpointPresentation,
} from "@/presentation-input";
import { VISUALISED_SOURCE } from "@/visualisation";

const EMBEDDED_SOURCE_ID = "journey-viewer-source";

const optionalText = (value: unknown) =>
  value === undefined || typeof value === "string";

/** What `journey-viewer generate` writes: a name and the document's path, both required. */
function isDocumentSource(value: unknown): value is DocumentSource {
  if (typeof value !== "object" || value === null) return false;
  const source = value as Readonly<Record<string, unknown>>;
  return (
    typeof source.name === "string" &&
    typeof source.document === "string" &&
    optionalText(source.screenshots) &&
    optionalText(source.touchpoints)
  );
}

/** The source placed in a self-contained page by `journey-viewer generate --inline`. */
function readEmbeddedSource(): EmbeddedDocument | undefined {
  const element = document.getElementById(EMBEDDED_SOURCE_ID);
  if (!element?.textContent) return undefined;
  let value: unknown;
  try {
    value = JSON.parse(element.textContent);
  } catch {
    return undefined;
  }
  if (typeof value !== "object" || value === null) return undefined;
  const embedded = value as Readonly<Record<string, unknown>>;
  if (
    typeof embedded.name !== "string" ||
    typeof embedded.text !== "string" ||
    !isScreenshotMap(embedded.screenshots) ||
    !isTouchpointPresentation(embedded.touchpoints)
  )
    return undefined;
  return {
    name: embedded.name,
    text: embedded.text,
    screenshots: embedded.screenshots,
    touchpoints: embedded.touchpoints,
  };
}

/**
 * The generated document, with its files resolved. Anything else at that path, such as a host's
 * HTML fallback page or a failed request, means there is none: the site opens local files only.
 */
async function readVisualisedSource(): Promise<DocumentSource | undefined> {
  const url = new URL(VISUALISED_SOURCE, document.baseURI);
  let source: unknown;
  try {
    const response = await fetch(url);
    if (!response.ok) return undefined;
    source = await response.json();
  } catch {
    return undefined;
  }
  if (!isDocumentSource(source)) return undefined;
  const at = (path: string) => new URL(path, url).href;
  return {
    name: source.name,
    document: at(source.document),
    ...(source.screenshots ? { screenshots: at(source.screenshots) } : {}),
    ...(source.touchpoints ? { touchpoints: at(source.touchpoints) } : {}),
  };
}

const embedded = readEmbeddedSource();
const source = embedded ? undefined : await readVisualisedSource();
const root = document.getElementById("application-root");
if (root)
  createRoot(root).render(
    // Home is this site's own folder, wherever it is deployed.
    <Application
      brand={<BrandLink href="./" />}
      {...(embedded ? { embedded } : {})}
      {...(source ? { source } : {})}
    />,
  );
