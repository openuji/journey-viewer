#!/usr/bin/env node
import { relative } from "node:path";
import { parseArgs } from "node:util";
import { generate } from "@/cli/generate";
import type { Generated } from "@/cli/generate";
import { run } from "@/cli/run";

const usage = `Usage:
  journey-viewer generate <document.jsonld> [options]
  journey-viewer run <document.jsonld> [options]

Commands:
  generate  Write a static Journey Viewer site for a UJG JSON-LD document into
            a folder. The browser reads and draws the document; deploy the
            folder to any static host, at any path.
  run       Generate the site and serve it locally with Vite until stopped.

Options:
  --screenshots <file>  Screenshot map (Surface ID -> image path); the local
                        images it names are copied with it
  --touchpoints <file>  Touchpoint short labels and colors
  --out <folder>        New or empty folder to write (generate: journey-viewer;
                        run: a temporary folder, removed when it stops)
  -h, --help            Show this help`;

/** A mistake in the command line, answered with the usage. */
class UsageError extends Error {}

function parse(args: readonly string[]) {
  let parsed;
  try {
    parsed = parseArgs({
      args: [...args],
      allowPositionals: true,
      options: {
        screenshots: { type: "string" },
        touchpoints: { type: "string" },
        out: { type: "string" },
        help: { type: "boolean", short: "h" },
      },
    });
  } catch (error) {
    throw new UsageError((error as Error).message);
  }
  const { values, positionals } = parsed;
  const [document, ...extra] = positionals;
  if (!values.help && (!document || extra.length > 0))
    throw new UsageError("Give exactly one document.");
  return {
    help: values.help === true,
    out: values.out,
    inputs: {
      document: document ?? "",
      ...(values.screenshots ? { screenshots: values.screenshots } : {}),
      ...(values.touchpoints ? { touchpoints: values.touchpoints } : {}),
    },
  };
}

function wrote({ out, name, images }: Generated): string {
  const near = relative(process.cwd(), out);
  const folder = near.startsWith("..") ? out : near || ".";
  return `Wrote ${folder}: ${name}${images ? ` with ${images} screenshots` : ""}.`;
}

async function main(argv: readonly string[]): Promise<void> {
  const [command, ...args] = argv;
  if (command === "-h" || command === "--help") return console.log(usage);
  if (command !== "generate" && command !== "run")
    throw new UsageError(
      command ? `Unknown command: ${command}` : "Missing command.",
    );
  const { help, out, inputs } = parse(args);
  if (help) return console.log(usage);
  if (command === "generate") {
    const generated = await generate({
      ...inputs,
      out: out ?? "journey-viewer",
    });
    return console.log(
      `${wrote(generated)} Deploy the folder to any static host, or try it with \`journey-viewer run\`.`,
    );
  }
  const running = await run({ ...inputs, ...(out ? { out } : {}) });
  console.log(
    `${wrote(running.generated)}${running.temporary ? " It is removed when you stop." : ""}`,
  );
  console.log(`Serving at ${running.url} — press Ctrl+C to stop.`);
  // Exiting closes the server and runs the temporary folder's removal.
  process.once("SIGINT", () => process.exit());
  process.once("SIGTERM", () => process.exit());
}

try {
  await main(process.argv.slice(2));
} catch (error) {
  console.error(
    error instanceof UsageError
      ? `${error.message}\n\n${usage}`
      : error instanceof Error
        ? error.message
        : error,
  );
  process.exitCode = 1;
}
