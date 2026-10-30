import { rmSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { generate } from "@/cli/generate";
import type { GenerateOptions, Generated } from "@/cli/generate";

export interface RunOptions extends Omit<GenerateOptions, "out"> {
  /** Where to generate the site; a temporary folder, removed on exit, by default. */
  readonly out?: string;
}

export interface Running {
  readonly generated: Generated;
  /** Whether the folder is temporary and goes away when the process exits. */
  readonly temporary: boolean;
  /** The local address the site is served at. */
  readonly url: string;
}

/**
 * Generates the site and serves its folder with Vite's preview server, as a static host would:
 * a missing file answers 404 instead of falling back to the page. The server runs until the
 * process exits.
 */
export async function run(options: RunOptions): Promise<Running> {
  const temporary = options.out === undefined;
  const out = options.out ?? (await mkdtemp(join(tmpdir(), "journey-viewer-")));
  if (temporary)
    // Synchronous, because Vite's own SIGTERM handler exits without waiting for others.
    process.once("exit", () => rmSync(out, { recursive: true, force: true }));
  try {
    const generated = await generate({ ...options, out });
    // Loaded only here, so `generate` starts without it.
    const { preview } = await import("vite");
    const server = await preview({
      // The served folder is the build output; the root only has to differ from it.
      root: dirname(generated.out),
      configFile: false,
      envDir: false,
      appType: "mpa",
      logLevel: "warn",
      build: { outDir: generated.out },
    });
    const url = server.resolvedUrls?.local[0];
    if (!url) throw new Error("The preview server has no local address.");
    return { generated, temporary, url };
  } catch (error) {
    if (temporary) await rm(out, { recursive: true, force: true });
    throw error;
  }
}
