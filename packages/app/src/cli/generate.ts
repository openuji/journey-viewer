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
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  SCREENSHOT_MAP_SHAPE,
  TOUCHPOINT_PRESENTATION_SHAPE,
  isScreenshotMap,
  isTouchpointPresentation,
} from "@/presentation-input";
import { VISUALISED_SOURCE } from "@/visualisation";

export interface GenerateOptions {
  /** The UJG JSON-LD document; it is copied unchanged and checked in the browser. */
  readonly document: string;
  /** A screenshot map; the local images it names are copied with it. */
  readonly screenshots?: string;
  /** A touchpoint presentation. */
  readonly touchpoints?: string;
  /** A new or empty folder for the site. */
  readonly out: string;
}

export interface Generated {
  readonly out: string;
  readonly name: string;
  /** Local screenshot files copied beside the map. */
  readonly images: number;
}

/** The prebuilt site, beside this module in the package's dist. */
const site = fileURLToPath(new URL("../site/", import.meta.url));

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
 * Writes the prebuilt site and the given files into `out`. The site reads them from its own folder
 * at runtime, so it works on any static host and under any path; nothing is rendered here. Inputs
 * are checked before anything is written, and a failed write removes what it wrote.
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
