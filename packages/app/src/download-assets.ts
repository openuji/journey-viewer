import { zip } from "fflate";
import type { Zippable } from "fflate";
import type { SourceInput } from "@/read-source";

/** A readable filename, without carrying source paths or extensions into the download. */
export function assetDownloadName(name: string): string {
  const stem = name
    .replace(/(?:\.ujg)?\.json(?:ld)?$/i, "")
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}_-]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
  return `${stem || "journey"}-ujg-assets.zip`;
}

const imageExtensions: Readonly<Record<string, string>> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
  "image/avif": "avif",
  "image/bmp": "bmp",
  "image/tiff": "tiff",
  "image/x-icon": "ico",
};

/** Build only a complete asset archive; a failed fetch rejects without producing a download. */
export async function createAssetArchive(
  input: SourceInput,
  signal: AbortSignal,
): Promise<Blob> {
  signal.throwIfAborted();
  const urls = [...new Set(Object.values(input.screenshots))];
  const images = await Promise.all(
    urls.map(async (url, index) => {
      try {
        const response = await fetch(url, { signal });
        if (!response.ok)
          throw new Error(`answered with status ${response.status}`);
        const type = response.headers
          .get("content-type")
          ?.split(";")[0]
          ?.trim();
        if (type === "text/html")
          throw new Error("answered with HTML instead of an image");
        const extension =
          imageExtensions[type ?? ""] ??
          new URL(url).pathname.match(/\.([a-z0-9]{1,8})$/i)?.[1] ??
          "img";
        return {
          url,
          path: `screens/${String(index + 1).padStart(4, "0")}.${extension}`,
          bytes: new Uint8Array(await response.arrayBuffer()),
        };
      } catch (error) {
        signal.throwIfAborted();
        throw new Error(
          `Screenshot ${url} could not be fetched: ${error instanceof Error ? error.message : "request failed"}.`,
        );
      }
    }),
  );
  signal.throwIfAborted();
  const paths = new Map(images.map(({ url, path }) => [url, path]));
  const screenshots = Object.fromEntries(
    Object.entries(input.screenshots).map(([ref, url]) => [
      ref,
      paths.get(url),
    ]),
  );
  const encode = (text: string) => new TextEncoder().encode(text);
  const files: Zippable = {
    "document.jsonld": encode(input.text),
    "screenshots.json": encode(JSON.stringify(screenshots, null, 2) + "\n"),
    "touchpoints.json": encode(
      JSON.stringify(input.touchpoints, null, 2) + "\n",
    ),
  };
  for (const { path, bytes } of images) files[path] = [bytes, { level: 0 }];

  const bytes = await new Promise<Uint8Array>((resolve, reject) => {
    let terminate: (() => void) | undefined;
    const abort = () => {
      terminate?.();
      reject(signal.reason);
    };
    signal.addEventListener("abort", abort, { once: true });
    terminate = zip(files, { level: 6 }, (error, data) => {
      signal.removeEventListener("abort", abort);
      if (error) reject(error);
      else resolve(data);
    });
  });
  signal.throwIfAborted();
  return new Blob([new Uint8Array(bytes)], { type: "application/zip" });
}

/** Release after the browser starts the download, or sooner when the app unmounts. */
export function saveAssetArchive(blob: Blob, name: string): () => void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.append(link);
  const release = () => {
    clearTimeout(timer);
    URL.revokeObjectURL(url);
  };
  const timer = setTimeout(release, 1000);
  try {
    link.click();
  } catch (error) {
    release();
    throw error;
  } finally {
    link.remove();
  }
  return release;
}
