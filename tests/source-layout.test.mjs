import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repository = fileURLToPath(new URL("../", import.meta.url));
const packages = (await readdir(join(repository, "packages"))).map((name) =>
  join("packages", name),
);

async function files(directory, pattern) {
  if (!existsSync(join(repository, directory))) return [];
  const entries = await readdir(join(repository, directory), {
    recursive: true,
    withFileTypes: true,
  });
  return entries
    .filter((entry) => entry.isFile() && pattern.test(entry.name))
    .map((entry) => relative(repository, join(entry.parentPath, entry.name)))
    .filter((path) => !/(^|\/)(generated|node_modules)\//.test(path));
}

test("library sources import through extensionless tsconfig aliases or package names", async () => {
  // "@/*" -> "./src/*" and "~/*" -> package root, declared in each package's tsconfig.json.
  // TypeScript modules are named without .js/.ts; tsc-alias adds ".js" to the built output.
  const specifier =
    /(?:\bfrom\s*|\bimport\s*\(?\s*|@import\s+|@reference\s+)["']([^"']+)["']/g;
  const misnamed = (target) =>
    /^\.\.?\//.test(target) || /^[@~]\/.*\.(?:js|jsx|ts|tsx)$/.test(target);
  const directories = [
    "tests",
    ...packages.flatMap((root) =>
      ["src", "tests", ".storybook", "scripts"].map((directory) =>
        join(root, directory),
      ),
    ),
  ];
  const violations = [];
  for (const directory of directories) {
    for (const path of await files(directory, /\.(ts|tsx|mjs|css)$/)) {
      for (const [, target] of (
        await readFile(join(repository, path), "utf8")
      ).matchAll(specifier)) {
        if (misnamed(target)) violations.push(`${path}: ${target}`);
      }
    }
  }
  assert.deepEqual(violations, []);
});

test("built packages carry no source aliases and name internal modules by full path", async () => {
  // tsc keeps tsconfig "paths" and extensionless specifiers in its output; after each
  // build, tsc-alias --resolve-full-paths turns them into "./module.js" for Node ESM.
  const specifier = /(?:\bfrom\s*|\bimport\s*\(?\s*)["']([^"']+)["']/g;
  const unresolved = [];
  for (const root of packages) {
    const built = await files(join(root, "dist"), /\.(js|d\.ts)$/);
    assert.ok(built.length > 0, `${root} is built`);
    for (const path of built) {
      for (const [, target] of (
        await readFile(join(repository, path), "utf8")
      ).matchAll(specifier)) {
        if (/^[@~]\//.test(target) || /^\.\.?\/(?!.*\.js$)/.test(target))
          unresolved.push(`${path}: ${target}`);
      }
    }
  }
  assert.deepEqual(unresolved, []);
});
