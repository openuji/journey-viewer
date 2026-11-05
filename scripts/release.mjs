#!/usr/bin/env node

import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { access, mkdir, readFile } from "node:fs/promises";
import { basename, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repository = fileURLToPath(new URL("../", import.meta.url));
const registry = "https://registry.npmjs.org/";
const repositoryUrl = "git+https://github.com/openuji/journey-viewer.git";
const homepage = "https://journey-viewer.openuji.org/";
const bugsUrl = "https://github.com/openuji/journey-viewer/issues";
const publishVisibilityTimeout = 20 * 60 * 1_000;
const publishVisibilityPoll = 10_000;

// Dependency order. The command-line tool is the one unscoped package, so that
// `npx journey-viewer` works; every other package lives in the @journey-viewer scope.
export const packages = [
  "flow-layout",
  "lint",
  "ujg-jsonld",
  "design-system",
  "viewer",
  "app",
  "cli",
].map((shortName) => ({
  shortName,
  name: shortName === "cli" ? "journey-viewer" : `@journey-viewer/${shortName}`,
  directory: `packages/${shortName}`,
}));

const stableVersion = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

const fail = (message) => {
  throw new Error(message);
};

const run = (command, args, options = {}) =>
  execFileSync(command, args, {
    cwd: options.cwd ?? repository,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  });

const runInteractive = (command, args) => {
  const result = spawnSync(command, args, {
    cwd: repository,
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0)
    fail(`${command} exited with status ${result.status ?? "unknown"}`);
};

const parseVersion = (version) => {
  const match = stableVersion.exec(version);
  if (!match) fail(`Expected a stable x.y.z version, received ${version}`);
  return match.slice(1).map(Number);
};

export const satisfiesCaret = (version, range) => {
  if (!range.startsWith("^")) return version === range;
  const actual = parseVersion(version);
  const minimum = parseVersion(range.slice(1));
  if (actual[0] !== minimum[0]) return false;
  if (actual[0] > 0) return compareVersions(actual, minimum) >= 0;
  if (actual[1] !== minimum[1]) return false;
  if (actual[1] > 0) return actual[2] >= minimum[2];
  return actual[2] === minimum[2];
};

const compareVersions = (left, right) => {
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return left[index] - right[index];
  }
  return 0;
};

const parseArguments = (values) => {
  const args = values.filter((value) => value !== "--");
  const command = args.shift();
  const options = {
    package: "all",
    outDirectory: "release-artifacts",
    allowDirty: false,
    dryRun: false,
  };
  while (args.length > 0) {
    const argument = args.shift();
    if (argument === "--package") options.package = args.shift();
    else if (argument === "--version") options.version = args.shift();
    else if (argument === "--out-dir") options.outDirectory = args.shift();
    else if (argument === "--allow-dirty") options.allowDirty = true;
    else if (argument === "--dry-run") options.dryRun = true;
    else fail(`Unknown release argument: ${argument}`);
  }
  if (!command || !["check", "pack", "publish"].includes(command))
    fail("Usage: release.mjs <check|pack|publish> [options]");
  for (const [name, value] of Object.entries({
    package: options.package,
    "out-dir": options.outDirectory,
  })) {
    if (!value) fail(`--${name} requires a value`);
  }
  if (options.version === undefined && values.includes("--version"))
    fail("--version requires a value");
  if (options.version) parseVersion(options.version);
  if (command === "publish" && options.allowDirty && !options.dryRun)
    fail("--allow-dirty is only available for checks and dry runs");
  return { command, ...options };
};

const selectedPackages = (selection) => {
  if (selection === "all") return packages;
  const selected = packages.find(
    ({ shortName, name }) => selection === shortName || selection === name,
  );
  if (!selected)
    fail(
      `Unknown package ${selection}; choose all or ${packages
        .map(({ shortName }) => shortName)
        .join(", ")}`,
    );
  return [selected];
};

const readManifest = async ({ directory }) =>
  JSON.parse(await readFile(join(repository, directory, "package.json")));

const readManifests = async () =>
  new Map(
    await Promise.all(
      packages.map(async (definition) => [
        definition.name,
        await readManifest(definition),
      ]),
    ),
  );

const validateManifest = (definition, manifest, manifests, expectedVersion) => {
  assert.equal(manifest.name, definition.name, `${definition.name}: name`);
  parseVersion(manifest.version);
  if (expectedVersion)
    assert.equal(
      manifest.version,
      expectedVersion,
      `${definition.name}: version`,
    );
  assert.equal(
    Object.hasOwn(manifest, "private"),
    false,
    `${definition.name}: private must be absent`,
  );
  assert.equal(manifest.license, "MIT", `${definition.name}: license`);
  assert.equal(
    manifest.author,
    "Open User Journey Initiative",
    `${definition.name}: author`,
  );
  assert.ok(manifest.description?.trim(), `${definition.name}: description`);
  assert.equal(manifest.homepage, homepage, `${definition.name}: homepage`);
  assert.equal(manifest.bugs?.url, bugsUrl, `${definition.name}: bugs`);
  assert.deepEqual(
    manifest.repository,
    {
      type: "git",
      url: repositoryUrl,
      directory: definition.directory,
    },
    `${definition.name}: repository`,
  );
  assert.ok(
    Array.isArray(manifest.keywords) && manifest.keywords.length >= 3,
    `${definition.name}: keywords`,
  );
  assert.deepEqual(
    manifest.publishConfig,
    { access: "public", registry },
    `${definition.name}: publishConfig`,
  );
  assert.ok(manifest.files?.includes("dist"), `${definition.name}: files`);
  assert.equal(
    Object.keys(manifest.imports ?? {}).some((name) =>
      name.startsWith("#tests"),
    ),
    false,
    `${definition.name}: test imports must not be published`,
  );
  if (definition.shortName === "cli")
    assert.equal(
      manifest.engines?.node,
      ">=22.13.0",
      `${definition.name}: Node.js engine`,
    );

  for (const [dependency, specifier] of Object.entries(
    manifest.dependencies ?? {},
  )) {
    if (!dependency.startsWith("@journey-viewer/")) continue;
    assert.ok(manifests.has(dependency), `${dependency}: workspace package`);
    const match = /^workspace:(\^\d+\.\d+\.\d+)$/.exec(specifier);
    assert.ok(
      match,
      `${definition.name}: ${dependency} must use an explicit workspace caret range`,
    );
    assert.ok(
      satisfiesCaret(manifests.get(dependency).version, match[1]),
      `${definition.name}: local ${dependency}@${manifests.get(dependency).version} does not satisfy ${match[1]}`,
    );
  }
};

const assertCleanWorktree = () => {
  const status = run("git", [
    "status",
    "--porcelain=v1",
    "--untracked-files=all",
  ]);
  if (status.trim())
    fail(
      `Release operations require a clean worktree:\n${status
        .trim()
        .split("\n")
        .slice(0, 20)
        .join("\n")}`,
    );
};

const buildPackages = (definitions) => {
  if (definitions.length === packages.length) runInteractive("pnpm", ["build"]);
  else
    runInteractive("pnpm", ["--filter", `${definitions[0].name}...`, "build"]);
};

const resolveTarball = async (packed, packageDirectory, outDirectory) => {
  const candidates = isAbsolute(packed.filename)
    ? [packed.filename]
    : [
        resolve(packageDirectory, packed.filename),
        resolve(outDirectory, basename(packed.filename)),
        resolve(repository, packed.filename),
      ];
  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Try the next location reported by pnpm.
    }
  }
  fail(`Could not find packed tarball ${packed.filename}`);
};

const sha1 = async (path) =>
  createHash("sha1")
    .update(await readFile(path))
    .digest("hex");

const inspectTarball = async (definition, packed, path) => {
  const files = packed.files.map(({ path: file }) => file);
  const unexpected = files.filter(
    (file) => !/^(?:LICENSE|README\.md|package\.json|dist\/.+)$/.test(file),
  );
  assert.deepEqual(unexpected, [], `${definition.name}: unexpected files`);
  for (const required of ["LICENSE", "README.md", "package.json"])
    assert.ok(
      files.includes(required),
      `${definition.name}: missing ${required}`,
    );
  assert.ok(
    files.some((file) => file.startsWith("dist/")),
    `${definition.name}: missing compiled output`,
  );
  const manifest = JSON.parse(
    run("tar", ["-xzOf", path, "package/package.json"]),
  );
  assert.doesNotMatch(
    JSON.stringify(manifest),
    /(?:workspace:|catalog:)/,
    `${definition.name}: unresolved workspace or catalog specifier`,
  );
  assert.equal(
    manifest.name,
    definition.name,
    `${definition.name}: packed name`,
  );
  return {
    definition,
    path,
    manifest,
    shasum: await sha1(path),
  };
};

const packPackages = async (definitions, outDirectory) => {
  const absoluteOutput = resolve(repository, outDirectory);
  await mkdir(absoluteOutput, { recursive: true });
  const artifacts = [];
  for (const definition of definitions) {
    const packageDirectory = join(repository, definition.directory);
    const packed = JSON.parse(
      run("pnpm", ["pack", "--json", "--pack-destination", absoluteOutput], {
        cwd: packageDirectory,
      }),
    );
    const path = await resolveTarball(packed, packageDirectory, absoluteOutput);
    const artifact = await inspectTarball(definition, packed, path);
    artifacts.push(artifact);
    console.log(
      `Packed ${artifact.manifest.name}@${artifact.manifest.version} (${artifact.shasum})`,
    );
  }
  return artifacts;
};

const registryDocument = async (name) => {
  const response = await fetch(`${registry}${encodeURIComponent(name)}`, {
    headers: { accept: "application/vnd.npm.install-v1+json" },
  });
  if (response.status === 404) return null;
  if (!response.ok)
    fail(`npm registry returned ${response.status} for ${name}`);
  return response.json();
};

const registryVersion = async (name, version) =>
  (await registryDocument(name))?.versions?.[version] ?? null;

const verifyDependencies = async (artifact, availableInRun) => {
  for (const [dependency, range] of Object.entries(
    artifact.manifest.dependencies ?? {},
  )) {
    if (!dependency.startsWith("@journey-viewer/")) continue;
    const inRun = availableInRun.get(dependency);
    if (inRun && satisfiesCaret(inRun, range)) continue;
    const document = await registryDocument(dependency);
    const available = Object.keys(document?.versions ?? {}).some((version) =>
      satisfiesCaret(version, range),
    );
    if (!available)
      fail(
        `${artifact.manifest.name}: no published ${dependency} version satisfies ${range}`,
      );
  }
};

const waitForPublishedVersion = async (artifact) => {
  const started = Date.now();
  let nextUpdate = started;
  while (Date.now() - started < publishVisibilityTimeout) {
    const published = await registryVersion(
      artifact.manifest.name,
      artifact.manifest.version,
    );
    if (published) {
      if (published.dist?.shasum !== artifact.shasum)
        fail(
          `${artifact.manifest.name}@${artifact.manifest.version} became visible with a different checksum`,
        );
      console.log(
        `${artifact.manifest.name}@${artifact.manifest.version} is available from npm`,
      );
      return;
    }
    if (Date.now() >= nextUpdate) {
      const elapsed = Math.round((Date.now() - started) / 1_000);
      console.log(
        `Waiting for npm scanning: ${artifact.manifest.name}@${artifact.manifest.version} (${elapsed}s)`,
      );
      nextUpdate = Date.now() + 60_000;
    }
    await new Promise((done) => setTimeout(done, publishVisibilityPoll));
  }
  fail(
    `${artifact.manifest.name}@${artifact.manifest.version} was submitted but is still being processed after 20 minutes; check npm for a review notice, then rerun after it becomes available`,
  );
};

const publishPackages = async (artifacts, dryRun) => {
  const availableInRun = new Map();
  const submitted = [];
  for (const artifact of artifacts) {
    await verifyDependencies(artifact, availableInRun);
    if (!dryRun) {
      const document = await registryDocument(artifact.manifest.name);
      const existing = document?.versions?.[artifact.manifest.version] ?? null;
      if (existing) {
        if (existing.dist?.shasum !== artifact.shasum)
          fail(
            `${artifact.manifest.name}@${artifact.manifest.version} already exists with a different checksum`,
          );
        console.log(
          `Skipping ${artifact.manifest.name}@${artifact.manifest.version}; the identical tarball is already published`,
        );
        availableInRun.set(artifact.manifest.name, artifact.manifest.version);
        continue;
      }
      const versions = Object.keys(document?.versions ?? {});
      if (versions.length === 1 && versions[0] === "0.0.0-stage")
        fail(
          `${artifact.manifest.name} is still exposing npm's processing placeholder; wait for ${artifact.manifest.version} to become available before rerunning`,
        );
    }
    const args = [
      "publish",
      artifact.path,
      "--access=public",
      `--registry=${registry}`,
    ];
    if (dryRun) args.push("--dry-run");
    runInteractive("npm", args);
    if (!dryRun) submitted.push(artifact);
    availableInRun.set(artifact.manifest.name, artifact.manifest.version);
  }
  if (!dryRun) await Promise.all(submitted.map(waitForPublishedVersion));
};

export const main = async (values = process.argv.slice(2)) => {
  const options = parseArguments(values);
  const definitions = selectedPackages(options.package);
  const manifests = await readManifests();
  for (const definition of definitions)
    validateManifest(
      definition,
      manifests.get(definition.name),
      manifests,
      options.version,
    );
  if (!options.allowDirty) assertCleanWorktree();
  console.log(`Validated ${definitions.map(({ name }) => name).join(", ")}`);
  if (options.command === "check") return;
  buildPackages(definitions);
  const artifacts = await packPackages(definitions, options.outDirectory);
  if (options.command === "publish")
    await publishPackages(artifacts, options.dryRun);
};

if (process.argv[1] === fileURLToPath(import.meta.url))
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
