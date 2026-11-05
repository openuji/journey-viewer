import {
  copyFile,
  cp,
  mkdir,
  readdir,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import {
  basename,
  dirname,
  extname,
  join,
  relative,
  resolve,
  sep,
} from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  SCREENSHOT_MAP_SHAPE,
  TOUCHPOINT_PRESENTATION_SHAPE,
  VISUALISED_SOURCE,
  isScreenshotMap,
  isTouchpointPresentation,
} from "@journey-viewer/app/generated-site";

export interface GenerateOptions {
  /** The UJG JSON-LD document; it is copied unchanged and checked in the browser. */
  readonly document: string;
  /** A screenshot map; the local images it names are copied or embedded with it. */
  readonly screenshots?: string;
  /** A touchpoint presentation. */
  readonly touchpoints?: string;
  /** A new or empty folder for the site. */
  readonly out: string;
  /** Write one index.html that can be opened directly from the file system. */
  readonly inline?: boolean;
}

export interface Generated {
  readonly out: string;
  readonly name: string;
  /** Local screenshot files included in the output. */
  readonly images: number;
}

/** The application's prebuilt site, which `@journey-viewer/app` ships. */
const site = fileURLToPath(
  new URL("./", import.meta.resolve("@journey-viewer/app/site/index.html")),
);

const mediaTypes: Readonly<Record<string, string>> = {
  ".avif": "image/avif",
  ".bmp": "image/bmp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".tif": "image/tiff",
  ".tiff": "image/tiff",
  ".webp": "image/webp",
};

const dataUrl = (bytes: Uint8Array, type: string) =>
  `data:${type};base64,${Buffer.from(bytes).toString("base64")}`;

/** Every file below a folder, named relative to it. */
async function nestedFiles(
  folder: string,
  prefix = "",
): Promise<readonly string[]> {
  const found: string[] = [];
  for (const entry of await readdir(join(folder, prefix), {
    withFileTypes: true,
  })) {
    const name = join(prefix, entry.name);
    if (entry.isDirectory()) found.push(...(await nestedFiles(folder, name)));
    else if (entry.isFile()) found.push(name.split(sep).join("/"));
  }
  return found;
}

/** Replace every non-code build asset reference in code or markup with its data URL. */
async function inlineAssetReferences(content: string): Promise<string> {
  const assets = join(site, "assets");
  let result = content;
  for (const name of await nestedFiles(assets)) {
    const extension = extname(name).toLowerCase();
    if (extension === ".js" || extension === ".css") continue;
    const embedded = dataUrl(
      await readFile(join(assets, name)),
      mediaTypes[extension] ?? "application/octet-stream",
    );
    for (const reference of [`./assets/${name}`, `assets/${name}`, name])
      result = result.replaceAll(reference, embedded);
  }
  return result;
}

/** Resolve a Vite-built page asset, refusing references outside the prebuilt site. */
function siteFile(reference: string): string {
  const file = fileURLToPath(
    new URL(reference, pathToFileURL(join(site, "index.html"))),
  );
  const root = resolve(site);
  if (file !== root && !file.startsWith(root + sep))
    throw new Error(
      `The prebuilt site references a file outside itself: ${reference}`,
    );
  return file;
}

/** Inline the Vite-built scripts, styles and other assets into its HTML shell. */
async function inlineSite(): Promise<string> {
  let html = await inlineAssetReferences(
    await readFile(join(site, "index.html"), "utf8"),
  );
  const scripts = [
    ...html.matchAll(/<script\b([^>]*?)\bsrc="([^"]+)"([^>]*)><\/script>/g),
  ];
  for (const [tag, before, reference, after] of scripts) {
    const script = (
      await inlineAssetReferences(await readFile(siteFile(reference!), "utf8"))
    ).replaceAll("</script", "<\\/script");
    const attributes = `${before}${after}`.replace(
      /\s*crossorigin(?:="[^"]*")?/g,
      "",
    );
    html = html.replace(tag, () => `<script${attributes}>${script}</script>`);
  }
  const styles = [
    ...html.matchAll(
      /<link\b([^>]*?)\brel="stylesheet"([^>]*?)\bhref="([^"]+)"([^>]*)>/g,
    ),
  ];
  for (const [tag, , , reference] of styles) {
    const css = (
      await inlineAssetReferences(await readFile(siteFile(reference!), "utf8"))
    ).replaceAll("</style", "<\\/style");
    html = html.replace(tag, () => `<style>${css}</style>`);
  }
  return html;
}

/** Resolve local screenshot paths and encode each unique file for the generated page. */
async function inlineScreenshots(
  mapFile: string,
  paths: Readonly<Record<string, string>>,
): Promise<Readonly<Record<string, string>>> {
  const encoded = new Map<string, string>();
  const result: Record<string, string> = {};
  for (const [reference, path] of Object.entries(paths)) {
    const url = new URL(path, pathToFileURL(mapFile));
    if (url.protocol !== "file:") {
      result[reference] = path;
      continue;
    }
    url.search = "";
    url.hash = "";
    const file = fileURLToPath(url);
    let value = encoded.get(file);
    if (!value) {
      const extension = extname(file).toLowerCase();
      value = dataUrl(
        await readFile(file),
        mediaTypes[extension] ?? "application/octet-stream",
      );
      encoded.set(file, value);
    }
    result[reference] = value;
  }
  return result;
}

/** Insert JSON safely into an inert script element in a self-contained HTML document. */
function withEmbeddedSource(
  html: string,
  source: Readonly<Record<string, unknown>>,
): string {
  const json = JSON.stringify(source).replaceAll("<", "\\u003c");
  const element = `<script id="journey-viewer-source" type="application/json">${json}</script>`;
  return html.replace("</head>", () => `  ${element}\n  </head>`);
}

/** Whether the folder exists; it must not hold anything yet. */
async function assertEmpty(folder: string): Promise<boolean> {
  try {
    if ((await readdir(folder)).length > 0)
      throw new Error(
        `${folder} is not empty. Choose a new folder or remove its contents.`,
      );
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    return false;
  }
}

/** A presentation input's text, after checking that it parses to its shape. */
async function readInput<T>(
  file: string,
  is: (value: unknown) => value is T,
  shape: string,
): Promise<Readonly<{ text: string; value: T }>> {
  const text = await readFile(file, "utf8");
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch (error) {
    throw new Error(`${file} is not JSON: ${(error as Error).message}`);
  }
  if (!is(value)) throw new Error(`${file} ${shape}.`);
  return { text, value };
}

/**
 * The local files a screenshot map names, relative to its folder, each checked to exist; URLs
 * with a scheme stay remote.
 */
async function localImages(
  map: string,
  paths: Readonly<Record<string, string>>,
): Promise<readonly string[]> {
  const folder = dirname(map);
  const files = new Set<string>();
  for (const path of Object.values(paths)) {
    const url = new URL(path, pathToFileURL(map));
    if (url.protocol !== "file:") continue;
    url.search = "";
    url.hash = "";
    const file = fileURLToPath(url);
    if (!file.startsWith(folder + sep))
      throw new Error(
        `${map}: ${path} is outside the map's folder, so it cannot be copied with it.`,
      );
    const found = await stat(file).catch(() => null);
    if (!found?.isFile()) throw new Error(`${map}: ${path} is not a file.`);
    files.add(relative(folder, file));
  }
  return [...files];
}

/**
 * Writes either the prebuilt site and given files or one self-contained page into `out`. Nothing
 * is rendered here. Inputs are checked before anything is written, and a failed write removes what
 * it wrote.
 */
export async function generate(options: GenerateOptions): Promise<Generated> {
  const out = resolve(options.out);
  const documentFile = resolve(options.document);
  const screenshots = options.screenshots && resolve(options.screenshots);
  const touchpoints = options.touchpoints && resolve(options.touchpoints);
  const text = await readFile(documentFile);
  const map = screenshots
    ? await readInput(screenshots, isScreenshotMap, SCREENSHOT_MAP_SHAPE)
    : null;
  const images =
    screenshots && map ? await localImages(screenshots, map.value) : [];
  const presentation = touchpoints
    ? await readInput(
        touchpoints,
        isTouchpointPresentation,
        TOUCHPOINT_PRESENTATION_SHAPE,
      )
    : null;
  const existed = await assertEmpty(out);

  const name = basename(documentFile);
  try {
    if (options.inline) {
      await mkdir(out, { recursive: true });
      const html = withEmbeddedSource(await inlineSite(), {
        name,
        text: text.toString("utf8"),
        screenshots:
          screenshots && map
            ? await inlineScreenshots(screenshots, map.value)
            : {},
        touchpoints: presentation?.value ?? {},
      });
      await writeFile(join(out, "index.html"), html);
      return { out, name, images: images.length };
    }
    await cp(site, out, { recursive: true });
    const journey = join(out, dirname(VISUALISED_SOURCE));
    await mkdir(journey, { recursive: true });
    await writeFile(join(journey, "document.jsonld"), text);
    if (screenshots && map) {
      await writeFile(join(journey, "screenshots.json"), map.text);
      for (const image of images) {
        await mkdir(dirname(join(journey, image)), { recursive: true });
        await copyFile(join(dirname(screenshots), image), join(journey, image));
      }
    }
    if (presentation)
      await writeFile(join(journey, "touchpoints.json"), presentation.text);
    await writeFile(
      join(out, VISUALISED_SOURCE),
      JSON.stringify(
        {
          name,
          document: "document.jsonld",
          ...(map ? { screenshots: "screenshots.json" } : {}),
          ...(presentation ? { touchpoints: "touchpoints.json" } : {}),
        },
        null,
        2,
      ) + "\n",
    );
  } catch (error) {
    // The folder was new or empty, so everything in it was written here.
    if (existed)
      for (const entry of await readdir(out))
        await rm(join(out, entry), { recursive: true, force: true });
    else await rm(out, { recursive: true, force: true });
    throw error;
  }
  return { out, name, images: images.length };
}
