// Packs the four libraries, installs the tarballs in a temporary project outside the
// workspace and uses them there the way an external consumer would. Run after `pnpm build`.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { cp, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repository = fileURLToPath(new URL("../", import.meta.url));
const names = ["ujg-jsonld", "lint", "design-system", "viewer"];
const run = (command, args, cwd) =>
  execFileSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  });

const consumer = await mkdtemp(join(tmpdir(), "journey-viewer-consumer-"));
try {
  await cp(join(repository, "tests", "external-consumer"), consumer, {
    recursive: true,
  });
  await cp(
    join(repository, "examples", "solid-oidc", "solid-oidc.ujg.jsonld"),
    join(consumer, "solid-oidc.ujg.jsonld"),
  );
  const tarballs = {};
  const manifests = {};

  await test("each tarball holds only its manifest, README and compiled output", () => {
    for (const name of names) {
      const packed = JSON.parse(
        run(
          "pnpm",
          ["pack", "--json", "--pack-destination", consumer],
          join(repository, "packages", name),
        ),
      );
      const files = packed.files.map((file) => file.path);
      assert.deepEqual(
        files.filter(
          (path) => !/^(package\.json|README\.md|dist\/.+)$/.test(path),
        ),
        [],
        name,
      );
      assert.deepEqual(
        files.filter((path) =>
          /stories|fixtures|checks|storybook|test|consumer|alternate/.test(
            path,
          ),
        ),
        [],
        name,
      );
      const manifest = JSON.parse(
        run(
          "tar",
          ["-xzOf", packed.filename, "package/package.json"],
          consumer,
        ),
      );
      assert.doesNotMatch(
        JSON.stringify(manifest),
        /workspace:|catalog:/,
        name,
      );
      tarballs[manifest.name] = `file:./${basename(packed.filename)}`;
      manifests[manifest.name] = manifest;
    }
  });

  await test("the tarballs install outside the workspace", async () => {
    // Development versions match the libraries' own catalog-resolved toolchain.
    const { devDependencies } = manifests["@journey-viewer/viewer"];
    const toolchain = ["react", "react-dom", "@types/react", "typescript"];
    await writeFile(
      join(consumer, "package.json"),
      JSON.stringify({
        name: "journey-viewer-external-consumer",
        private: true,
        type: "module",
        dependencies: {
          ...tarballs,
          ...Object.fromEntries(
            toolchain.map((name) => [name, devDependencies[name]]),
          ),
        },
      }),
    );
    // The packed inter-package dependencies are "0.0.0"; point them at the tarballs.
    await writeFile(
      join(consumer, "pnpm-workspace.yaml"),
      `overrides:\n${Object.entries(tarballs)
        .map(([name, tarball]) => `  "${name}": "${tarball}"\n`)
        .join("")}`,
    );
    run("pnpm", ["install", "--prefer-offline"], consumer);
  });

  await test("declarations type-check with bundler and nodenext resolution and no Vite types", () => {
    run("pnpm", ["exec", "tsc", "-p", "tsconfig.json"], consumer);
    run(
      "pnpm",
      [
        "exec",
        "tsc",
        "-p",
        "tsconfig.json",
        "--module",
        "nodenext",
        "--moduleResolution",
        "nodenext",
      ],
      consumer,
    );
  });

  await test("the packages import, server-render and resolve their CSS exports", () => {
    process.stdout.write(run("node", ["render.mjs"], consumer));
  });
} finally {
  await rm(consumer, { recursive: true, force: true });
}
