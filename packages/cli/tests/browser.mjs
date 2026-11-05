// Packs this package and the application it launches, lays them out as an install would, runs
// `journey-viewer generate` on Solid-OIDC in a temporary folder outside the workspace and opens
// what it wrote in Chromium: the folder served under a sub-path, and the --inline page from
// file://. The application's own behaviour is checked in its package. Run after `pnpm build`.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { cp, mkdir, mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { extname, join, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";
import { chromium } from "playwright";

const pkg = fileURLToPath(new URL("../", import.meta.url));
const app = fileURLToPath(new URL("../../app/", import.meta.url));
const example = fileURLToPath(
  new URL("../../../examples/solid-oidc/", import.meta.url),
);
const mount = "/maps/solid-oidc/";
const counts = "10 journeys · 47 states · 120 transitions · 37 screens";
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".jsonld": "application/ld+json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};
const run = (command, args, cwd) =>
  execFileSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  });

const work = await mkdtemp(join(tmpdir(), "journey-viewer-generate-"));
const www = join(work, "www");
const out = join(www, ...mount.split("/").filter(Boolean));
const inlineOut = join(work, "inline");
let server, browser;
try {
  // Lay both packages out as an install does, so the command finds the application's site.
  const install = async (name, from) => {
    const packed = JSON.parse(
      run("pnpm", ["pack", "--json", "--pack-destination", work], from),
    );
    const target = join(work, "node_modules", name);
    await mkdir(target, { recursive: true });
    run(
      "tar",
      ["-xzf", packed.filename, "-C", target, "--strip-components=1"],
      work,
    );
  };
  await install("@journey-viewer/app", app);
  await install("journey-viewer", pkg);
  const cli = join(work, "node_modules", "journey-viewer", "dist", "cli.js");
  const inputs = join(work, "inputs");
  await mkdir(inputs);
  for (const name of [
    "solid-oidc.ujg.jsonld",
    "screenshots.json",
    "touchpoints.json",
    "screens",
  ])
    await cp(join(example, name), join(inputs, name), { recursive: true });
  const generate = (...options) =>
    run(
      "node",
      [
        cli,
        "generate",
        "inputs/solid-oidc.ujg.jsonld",
        "--screenshots",
        "inputs/screenshots.json",
        "--touchpoints",
        "inputs/touchpoints.json",
        ...options,
      ],
      work,
    );
  const written = generate("--out", `www${mount}`);
  const inlineWritten = generate("--inline", "--out", "inline");

  await test("the installed command writes the site beside the document, its maps and every local screenshot", async () => {
    assert.match(written, /solid-oidc\.ujg\.jsonld with 37 screenshots/);
    assert.deepEqual((await readdir(out)).sort(), [
      "assets",
      "index.html",
      "journey",
    ]);
    assert.deepEqual((await readdir(join(out, "journey"))).sort(), [
      "document.jsonld",
      "screens",
      "screenshots.json",
      "source.json",
      "touchpoints.json",
    ]);
    assert.equal((await readdir(join(out, "journey", "screens"))).length, 37);
    for (const [copy, original] of [
      ["document.jsonld", "solid-oidc.ujg.jsonld"],
      ["screenshots.json", "screenshots.json"],
      ["touchpoints.json", "touchpoints.json"],
    ])
      assert.ok(
        (await readFile(join(out, "journey", copy))).equals(
          await readFile(join(example, original)),
        ),
        `${copy} is copied unchanged`,
      );
    const html = await readFile(join(out, "index.html"), "utf8");
    assert.deepEqual(
      [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
        .map(([, url]) => url)
        .filter((url) => !/^(?:\.\/|#|data:)/.test(url)),
      [],
      "the page names only files in its own folder",
    );
  });

  const served = [];
  server = createServer(async (request, response) => {
    const pathname = decodeURIComponent(
      new URL(request.url, "http://localhost").pathname,
    );
    served.push(pathname);
    const path = resolve(
      www,
      `.${pathname.endsWith("/") ? `${pathname}index.html` : pathname}`,
    );
    if (!path.startsWith(www + sep)) return void response.writeHead(403).end();
    try {
      response
        .writeHead(200, {
          "content-type": types[extname(path)] ?? "application/octet-stream",
        })
        .end(await readFile(path));
    } catch {
      response.writeHead(404).end();
    }
  });
  await new Promise((done) => server.listen(0, "127.0.0.1", done));
  const origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({
    headless: true,
    ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
      : {}),
  });
  const open = async (url) => {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
      reducedMotion: "reduce",
    });
    const log = { errors: [], requests: [], failures: [] };
    page.on("pageerror", (error) => log.errors.push(error.message));
    page.on("request", (request) => log.requests.push(request.url()));
    page.on("response", (response) => {
      if (response.status() >= 400)
        log.failures.push(`${response.status()} ${response.url()}`);
    });
    page.on("requestfailed", (request) => log.failures.push(request.url()));
    await page.goto(url);
    const viewer = page.locator("[data-application-viewer]");
    await viewer.getByText(counts, { exact: true }).waitFor();
    return { page, viewer, ...log };
  };
  // Flow is where a screen's button is; its dialog shows the screenshot the page resolved.
  const openScreenshot = async ({ page, viewer }) => {
    await page
      .getByRole("group", { name: "View", exact: true })
      .getByRole("button", { name: "Flow" })
      .click();
    await viewer
      .getByRole("button", { name: "Screen: Sign-in required", exact: true })
      .first()
      .click();
    const image = page.getByRole("dialog").locator("img").first();
    await image.waitFor();
    return image.getAttribute("src");
  };

  await test("the site opens the document and its screenshots under a sub-path and asks for nothing outside its folder", async () => {
    const opened = await open(origin + mount);
    assert.equal(
      await opened.page.getByRole("heading", { level: 1 }).textContent(),
      "solid-oidc.ujg.jsonld",
    );
    assert.ok(
      (await openScreenshot(opened)).startsWith(
        `${origin}${mount}journey/screens/`,
      ),
    );
    assert.deepEqual(
      opened.requests.filter(
        (url) => !url.startsWith("data:") && !url.startsWith(origin + mount),
      ),
      [],
    );
    assert.deepEqual(
      served.filter((path) => !path.startsWith(mount)),
      [],
    );
    assert.deepEqual(opened.failures, []);
    assert.deepEqual(opened.errors, []);
    assert.ok(
      opened.requests.some((url) => url.endsWith("journey/source.json")),
    );
    await opened.page.close();
  });

  await test("the inline page opens from file:// with its code, document and screenshots embedded", async () => {
    assert.match(inlineWritten, /Open inline\/index\.html directly/);
    assert.deepEqual(await readdir(inlineOut), ["index.html"]);
    const opened = await open(
      pathToFileURL(join(inlineOut, "index.html")).href,
    );
    assert.equal(
      await opened.page.getByRole("heading", { level: 1 }).textContent(),
      "solid-oidc.ujg.jsonld",
    );
    assert.match(
      await opened.page
        .getByRole("link", { name: "Journey Viewer home", exact: true })
        .locator("img")
        .getAttribute("src"),
      /^data:image\/svg\+xml;base64,/,
    );
    assert.match(await openScreenshot(opened), /^data:image\/png;base64,/);
    assert.deepEqual(opened.errors, []);
    await opened.page.close();
  });
} finally {
  await browser?.close();
  server?.close();
  await rm(work, { recursive: true, force: true });
}
