// Runs the built CLI (`pnpm build` first) in temporary folders.
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import {
  chmod,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const cli = fileURLToPath(new URL("../dist/cli/cli.js", import.meta.url));
const site = fileURLToPath(new URL("../dist/site/", import.meta.url));
const work = await mkdtemp(join(tmpdir(), "journey-viewer-cli-"));
test.after(() => rm(work, { recursive: true, force: true }));
const journey = (out) => join(work, out, "journey");
const generate = (...args) =>
  spawnSync("node", [cli, "generate", ...args], {
    cwd: work,
    encoding: "utf8",
  });

await writeFile(join(work, "checkout.json"), '{"@id":"urn:checkout"}');
await mkdir(join(work, "maps", "shots"), { recursive: true });
await writeFile(join(work, "maps", "shots", "pay.png"), "png");
await writeFile(join(work, "outside.png"), "png");

test("a document alone: the site, the copied document and its name, no maps", async () => {
  const result = generate("checkout.json", "--out", "plain");
  assert.equal(result.status, 0, result.stderr);
  assert.match(
    result.stdout,
    /^Wrote plain: checkout\.json\. Deploy the folder to any static host/,
  );
  assert.deepEqual(
    (await readdir(join(work, "plain"))).sort(),
    [...(await readdir(site)), "journey"].sort(),
  );
  assert.deepEqual((await readdir(journey("plain"))).sort(), [
    "document.jsonld",
    "source.json",
  ]);
  assert.deepEqual(
    JSON.parse(await readFile(join(journey("plain"), "source.json"), "utf8")),
    { name: "checkout.json", document: "document.jsonld" },
  );
  assert.equal(
    await readFile(join(journey("plain"), "document.jsonld"), "utf8"),
    '{"@id":"urn:checkout"}',
  );
});

test("local screenshots are copied beside their map; remote ones stay where they are", async () => {
  await writeFile(
    join(work, "maps", "screenshots.json"),
    JSON.stringify({
      "urn:pay": "./shots/pay.png?v=2",
      "urn:pay-again": "shots/pay.png",
      "urn:remote": "https://images.example/remote.png",
    }),
  );
  await writeFile(join(work, "maps", "touchpoints.json"), "{}");
  const result = generate(
    "checkout.json",
    "--screenshots",
    "maps/screenshots.json",
    "--touchpoints",
    "maps/touchpoints.json",
    "--out",
    "mapped",
  );
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /checkout\.json with 1 screenshots\./);
  assert.deepEqual(await readdir(join(journey("mapped"), "shots")), [
    "pay.png",
  ]);
  assert.equal(
    await readFile(join(journey("mapped"), "screenshots.json"), "utf8"),
    await readFile(join(work, "maps", "screenshots.json"), "utf8"),
  );
  assert.deepEqual(
    JSON.parse(await readFile(join(journey("mapped"), "source.json"), "utf8")),
    {
      name: "checkout.json",
      document: "document.jsonld",
      screenshots: "screenshots.json",
      touchpoints: "touchpoints.json",
    },
  );
});

test("a bad screenshot map, missing image or malformed presentation writes nothing; a retry succeeds", async () => {
  const cases = [
    [
      "--screenshots",
      { "urn:x": "../outside.png" },
      /outside the map's folder/,
    ],
    ["--screenshots", ["shots/pay.png"], /must map Surface IDs to image paths/],
    ["--screenshots", { "urn:x": "shots/missing.png" }, /is not a file/],
    ["--screenshots", { "urn:x": "shots" }, /is not a file/],
    ["--touchpoints", null, /must map Touchpoint IDs/],
    ["--touchpoints", { "urn:t": { color: 3 } }, /must map Touchpoint IDs/],
  ];
  for (const [option, value, message] of cases) {
    await writeFile(join(work, "maps", "bad.json"), JSON.stringify(value));
    const result = generate(
      "checkout.json",
      option,
      "maps/bad.json",
      "--out",
      "rejected",
    );
    assert.equal(result.status, 1, JSON.stringify(value));
    assert.match(result.stderr, message);
    assert.equal(existsSync(join(work, "rejected")), false);
  }
  await writeFile(join(work, "maps", "bad.json"), "{");
  assert.match(
    generate("checkout.json", "--touchpoints", "maps/bad.json").stderr,
    /is not JSON/,
  );
  await writeFile(
    join(work, "maps", "fixed.json"),
    JSON.stringify({ "urn:x": "shots/pay.png" }),
  );
  const retry = generate(
    "checkout.json",
    "--screenshots",
    "maps/fixed.json",
    "--out",
    "rejected",
  );
  assert.equal(retry.status, 0, retry.stderr);
});

test("a copy that fails after writing began removes what it wrote", async () => {
  await mkdir(join(work, "locked", "shots"), { recursive: true });
  await writeFile(join(work, "locked", "shots", "secret.png"), "png");
  await chmod(join(work, "locked", "shots", "secret.png"), 0o000);
  await writeFile(
    join(work, "locked", "screenshots.json"),
    JSON.stringify({ "urn:x": "shots/secret.png" }),
  );
  await mkdir(join(work, "empty"));
  for (const out of ["fresh", "empty"]) {
    const result = generate(
      "checkout.json",
      "--screenshots",
      "locked/screenshots.json",
      "--out",
      out,
    );
    assert.equal(result.status, 1);
    assert.match(result.stderr, /EACCES|permission denied/i);
  }
  assert.equal(existsSync(join(work, "fresh")), false);
  assert.deepEqual(await readdir(join(work, "empty")), []);
});

test("a folder that is not empty is left alone", async () => {
  await mkdir(join(work, "taken"));
  await writeFile(join(work, "taken", "keep.txt"), "mine");
  const result = generate("checkout.json", "--out", "taken");
  assert.equal(result.status, 1);
  assert.match(result.stderr, /is not empty/);
  assert.deepEqual(await readdir(join(work, "taken")), ["keep.txt"]);
});

test("usage mistakes print the usage and fail; --help succeeds", () => {
  for (const args of [
    [],
    ["visualise", "checkout.json"],
    ["generate"],
    ["run", "a.json", "b.json"],
  ]) {
    const result = spawnSync("node", [cli, ...args], { encoding: "utf8" });
    assert.equal(result.status, 1, args.join(" "));
    assert.match(result.stderr, /journey-viewer generate <document\.jsonld>/);
  }
  const missing = generate("missing.jsonld", "--out", "none");
  assert.equal(missing.status, 1);
  assert.doesNotMatch(missing.stderr, /Usage:/);
  assert.equal(existsSync(join(work, "none")), false);
  const help = spawnSync("node", [cli, "--help"], { encoding: "utf8" });
  assert.equal(help.status, 0);
  assert.match(help.stdout, /--screenshots <file>/);
});

/** Starts `run` and resolves with its output once it serves. */
function startRun(...args) {
  // A piped stdin stays open: Vite's preview exits when stdin ends outside CI.
  const child = spawn("node", [cli, "run", ...args], { cwd: work });
  let output = "";
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk) => (output += chunk));
  const exited = new Promise((done) => child.once("exit", done));
  const serving = new Promise((done, reject) => {
    child.stdout.on("data", (chunk) => {
      output += chunk;
      const url = /Serving at (\S+)/.exec(output)?.[1];
      if (url) done(url);
    });
    child.once("exit", () => reject(new Error(output)));
  });
  return { child, exited, serving, output: () => output };
}

test("run serves a temporary site like a static host and removes it when stopped", async () => {
  const running = startRun("checkout.json");
  const url = await running.serving;
  const folder = /Wrote (.+): checkout\.json\./.exec(running.output())[1];
  assert.ok(existsSync(join(folder, "journey", "source.json")));
  const source = await fetch(new URL("journey/source.json", url));
  assert.deepEqual(await source.json(), {
    name: "checkout.json",
    document: "document.jsonld",
  });
  assert.match(await (await fetch(url)).text(), /<div id="application-root">/);
  // No fallback to the page: a missing file is a 404, as on a static host.
  assert.equal((await fetch(new URL("journey/missing.json", url))).status, 404);
  running.child.kill("SIGTERM");
  await running.exited;
  assert.equal(existsSync(folder), false);
});

test("run --out keeps the generated folder after Ctrl+C", async () => {
  const running = startRun("checkout.json", "--out", "kept");
  await running.serving;
  running.child.kill("SIGINT");
  await running.exited;
  assert.ok(existsSync(join(work, "kept", "journey", "source.json")));
});
