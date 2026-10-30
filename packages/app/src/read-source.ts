import type {
  ScreenshotMap,
  TouchpointPresentation,
} from "@journey-viewer/viewer";
import {
  SCREENSHOT_MAP_SHAPE,
  TOUCHPOINT_PRESENTATION_SHAPE,
  isScreenshotMap,
  isTouchpointPresentation,
} from "@/presentation-input";

/** A document to read by URL, with its optional presentation inputs. */
export interface DocumentSource {
  /** Shown while it is read and as the open journey's title. */
  readonly name: string;
  /** The document's URL; a relative URL resolves against the page. */
  readonly document: string;
  /** A screenshot map's URL; the paths inside it resolve against the map's own URL. */
  readonly screenshots?: string;
  /** A touchpoint presentation's URL. */
  readonly touchpoints?: string;
}

/** The document's unparsed text and its presentation inputs, ready for parsing and checks. */
export type SourceInput = Readonly<{
  text: string;
  screenshots: ScreenshotMap;
  touchpoints: TouchpointPresentation;
}>;

async function readText(url: URL, signal: AbortSignal): Promise<string> {
  const response = await fetch(url, { signal });
  if (!response.ok)
    throw new Error(`${url.href} answered with status ${response.status}.`);
  return response.text();
}

/** A presentation input, parsed and checked before it reaches the viewer. */
async function readInput<T>(
  url: URL,
  signal: AbortSignal,
  is: (value: unknown) => value is T,
  shape: string,
): Promise<T> {
  const text = await readText(url, signal);
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch (error) {
    throw new Error(`${url.href} is not JSON: ${(error as Error).message}`);
  }
  if (!is(value)) throw new Error(`${url.href} ${shape}.`);
  return value;
}

/**
 * Browser-owned reading. Each reference resolves against the URL of the file that holds it, so
 * the source works under any base path; the document's text is left to the caller to parse. A
 * presentation input that is not JSON of its shape fails the read.
 */
export async function readSource(
  source: DocumentSource,
  signal: AbortSignal,
  base: string = globalThis.document.baseURI,
): Promise<SourceInput> {
  const screenshotsUrl = source.screenshots
    ? new URL(source.screenshots, base)
    : null;
  const [text, paths, touchpoints] = await Promise.all([
    readText(new URL(source.document, base), signal),
    screenshotsUrl
      ? readInput(screenshotsUrl, signal, isScreenshotMap, SCREENSHOT_MAP_SHAPE)
      : ({} as ScreenshotMap),
    source.touchpoints
      ? readInput(
          new URL(source.touchpoints, base),
          signal,
          isTouchpointPresentation,
          TOUCHPOINT_PRESENTATION_SHAPE,
        )
      : ({} as TouchpointPresentation),
  ]);
  return {
    text,
    screenshots: Object.fromEntries(
      Object.entries(paths).map(([ref, path]) => [
        ref,
        new URL(path, screenshotsUrl ?? base).href,
      ]),
    ),
    touchpoints,
  };
}
