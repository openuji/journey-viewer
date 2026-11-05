// Packs the six packages, installs the tarballs in a temporary project outside the
// workspace and uses them there the way an external consumer would. Run after `pnpm build`.
import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import {
  cp,
  mkdtemp,
  readdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repository = fileURLToPath(new URL("../", import.meta.url));
const names = [
  "ujg-jsonld",
  "lint",
  "design-system",
  "viewer",
  "flow-layout",
  "app",
];
const repositoryUrl = "git+https://github.com/openuji/journey-viewer.git";
const registry = "https://registry.npmjs.org/";
const run = (command, args, cwd) => {
  try {
    return execFileSync(command, args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "inherit"],
    });
  } catch (error) {
    if (error?.stdout) process.stdout.write(error.stdout);
    throw error;
  }
};

const consumer = await mkdtemp(join(tmpdir(), "journey-viewer-consumer-"));
const executable = (name) => join(consumer, "node_modules", ".bin", name);
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

  await test("each tarball has public metadata and only releasable files", () => {
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
          (path) =>
            !/^(?:LICENSE|package\.json|README\.md|dist\/.+)$/.test(path),
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
      for (const required of ["LICENSE", "README.md", "package.json"])
        assert.ok(files.includes(required), `${name}: missing ${required}`);
      assert.ok(
        files.some((path) => path.startsWith("dist/")),
        `${name}: missing compiled output`,
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
      assert.match(manifest.version, /^\d+\.\d+\.\d+$/, name);
      assert.equal(Object.hasOwn(manifest, "private"), false, name);
      assert.equal(manifest.license, "MIT", name);
      assert.equal(manifest.author, "Open User Journey Initiative", name);
      assert.ok(manifest.description, name);
      assert.ok(manifest.keywords?.length >= 3, name);
      assert.equal(
        manifest.homepage,
        "https://journey-viewer.openuji.org/",
        name,
      );
      assert.equal(
        manifest.bugs?.url,
        "https://github.com/openuji/journey-viewer/issues",
        name,
      );
      assert.deepEqual(
        manifest.repository,
        {
          type: "git",
          url: repositoryUrl,
          directory: `packages/${name}`,
        },
        name,
      );
      assert.deepEqual(
        manifest.publishConfig,
        { access: "public", registry },
        name,
      );
      if (name === "app") assert.equal(manifest.engines?.node, ">=22.13.0");
      assert.equal(
        Object.keys(manifest.imports ?? {}).some((key) =>
          key.startsWith("#tests"),
        ),
        false,
        name,
      );
      for (const [dependency, range] of Object.entries(
        manifest.dependencies ?? {},
      )) {
        if (!dependency.startsWith("@journey-viewer/")) continue;
        assert.match(range, /^\^\d+\.\d+\.\d+$/, `${name}: ${dependency}`);
      }
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
    run(
      "npm",
      ["install", "--prefer-offline", "--no-audit", "--no-fund"],
      consumer,
    );
  });

  await test("declarations type-check with bundler and nodenext resolution and no Vite types", () => {
    run(executable("tsc"), ["-p", "tsconfig.json"], consumer);
    run(
      executable("tsc"),
      [
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

  await test("the packages import, server-render, lay out a level and resolve their CSS exports", () => {
    process.stdout.write(run("node", ["render.mjs"], consumer));
  });

  await test("the installed journey-viewer bin generates a self-contained folder", async () => {
    process.stdout.write(
      run(
        executable("journey-viewer"),
        ["generate", "solid-oidc.ujg.jsonld", "--out", "www/maps/solid-oidc"],
        consumer,
      ),
    );
    const out = join(consumer, "www", "maps", "solid-oidc");
    assert.deepEqual((await readdir(join(out, "journey"))).sort(), [
      "document.jsonld",
      "source.json",
    ]);
    const html = await readFile(join(out, "index.html"), "utf8");
    const urls = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(
      ([, url]) => url,
    );
    assert.ok(urls.some((url) => url.startsWith("./assets/")));
    assert.deepEqual(
      urls.filter((url) => !/^(?:\.\/|#|data:)/.test(url)),
      [],
    );
  });

  await test("the installed run serves the document with the Vite it depends on", async () => {
    const cli = join(
      consumer,
      "node_modules",
      "@journey-viewer",
      "app",
      "dist",
      "cli",
      "cli.js",
    );
    // A piped stdin stays open: Vite's preview exits when stdin ends outside CI.
    const child = spawn("node", [cli, "run", "solid-oidc.ujg.jsonld"], {
      cwd: consumer,
    });
    const exited = new Promise((done) => child.once("exit", done));
    let output = "";
    child.stderr.on("data", (chunk) => (output += chunk));
    try {
      const url = await new Promise((done, reject) => {
        child.stdout.on("data", (chunk) => {
          output += chunk;
          const found = /Serving at (\S+)/.exec(output)?.[1];
          if (found) done(found);
        });
        child.once("exit", () => reject(new Error(output)));
      });
      const source = await fetch(new URL("journey/source.json", url));
      assert.equal((await source.json()).name, "solid-oidc.ujg.jsonld");
      console.log(`Served at ${url}`);
    } finally {
      child.kill("SIGTERM");
      await exited;
    }
  });
} finally {
  await rm(consumer, { recursive: true, force: true });
}
