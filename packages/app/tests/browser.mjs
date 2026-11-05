// Packs this package, runs the packed `journey-viewer generate` on Solid-OIDC in a temporary
// folder outside the workspace, serves the output under a sub-path and checks it in Chromium.
// Run after `pnpm build`.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  cp,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { extname, join, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";
import { chromium } from "playwright";
import { unzipSync, strFromU8 } from "fflate";

const pkg = fileURLToPath(new URL("../", import.meta.url));
const example = fileURLToPath(
  new URL("../../../examples/solid-oidc/", import.meta.url),
);
const evidence = fileURLToPath(new URL("../.test-output/", import.meta.url));
await mkdir(evidence, { recursive: true });
const mount = "/maps/solid-oidc/";
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
const served = [];
let server, browser;
try {
  const packed = JSON.parse(
    run("pnpm", ["pack", "--json", "--pack-destination", work], pkg),
  );
  run("tar", ["-xzf", packed.filename, "-C", work], work);
  const inputs = join(work, "inputs");
  await mkdir(inputs);
  for (const name of [
    "solid-oidc.ujg.jsonld",
    "screenshots.json",
    "touchpoints.json",
    "screens",
  ])
    await cp(join(example, name), join(inputs, name), { recursive: true });
  const written = run(
    "node",
    [
      join(work, "package", "dist", "cli", "cli.js"),
      "generate",
      "inputs/solid-oidc.ujg.jsonld",
      "--screenshots",
      "inputs/screenshots.json",
      "--touchpoints",
      "inputs/touchpoints.json",
      "--out",
      `www${mount}`,
    ],
    work,
  );
  const inlineWritten = run(
    "node",
    [
      join(work, "package", "dist", "cli", "cli.js"),
      "generate",
      "inputs/solid-oidc.ujg.jsonld",
      "--screenshots",
      "inputs/screenshots.json",
      "--touchpoints",
      "inputs/touchpoints.json",
      "--inline",
      "--out",
      "inline",
    ],
    work,
  );

  await test("the packed CLI writes the prebuilt site beside the document, its maps and every local screenshot", async () => {
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

  // Two edited copies: touchpoints that are not a presentation, and the bare site on a host that
  // answers missing files with the page (as single-page-app hosting does).
  const malformed = "/malformed/";
  const fallback = "/fallback/";
  await cp(out, join(www, "malformed"), { recursive: true });
  await writeFile(
    join(www, "malformed", "journey", "touchpoints.json"),
    "null",
  );
  await cp(out, join(www, "fallback"), { recursive: true });
  await rm(join(www, "fallback", "journey"), { recursive: true });

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
      const content = await readFile(path);
      response
        .writeHead(200, {
          "content-type": types[extname(path)] ?? "application/octet-stream",
        })
        .end(content);
    } catch {
      if (pathname.startsWith(fallback))
        return void response
          .writeHead(200, { "content-type": "text/html" })
          .end(await readFile(join(www, "fallback", "index.html")));
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
  await test("the inline page opens from file:// with its code, document and screenshots embedded", async () => {
    assert.match(inlineWritten, /Open inline\/index\.html directly/);
    assert.deepEqual(await readdir(inlineOut), ["index.html"]);
    const inlinePage = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
      reducedMotion: "reduce",
    });
    const inlineErrors = [];
    inlinePage.on("pageerror", (error) => inlineErrors.push(error.message));
    await inlinePage.goto(pathToFileURL(join(inlineOut, "index.html")).href);
    const inlineViewer = inlinePage.locator("[data-application-viewer]");
    await inlineViewer.waitFor();
    assert.equal(
      await inlinePage.getByRole("heading", { level: 1 }).textContent(),
      "solid-oidc.ujg.jsonld",
    );
    await inlineViewer
      .getByText("10 journeys · 47 states · 120 transitions · 37 screens", {
        exact: true,
      })
      .waitFor();
    const icon = inlinePage
      .getByRole("link", { name: "Journey Viewer home", exact: true })
      .locator("img");
    assert.match(
      await icon.getAttribute("src"),
      /^data:image\/svg\+xml;base64,/,
    );
    await inlinePage
      .getByRole("group", { name: "View", exact: true })
      .getByRole("button", { name: "Flow" })
      .click();
    await inlineViewer
      .getByRole("button", { name: "Screen: Sign-in required", exact: true })
      .first()
      .click();
    const image = inlinePage.getByRole("dialog").locator("img").first();
    await image.waitFor();
    assert.match(await image.getAttribute("src"), /^data:image\/png;base64,/);
    assert.deepEqual(inlineErrors, []);
    await inlinePage.close();
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  });
  page.setDefaultTimeout(15000);
  const errors = [],
    requests = [],
    failures = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => requests.push(request.url()));
  page.on("response", (response) => {
    if (response.status() >= 400)
      failures.push(`${response.status()} ${response.url()}`);
  });
  page.on("requestfailed", (request) => failures.push(request.url()));
  const title = page.getByRole("heading", { level: 1 });
  const status = page.locator('[data-application-header] [role="status"]');
  const viewer = page.locator("[data-application-viewer]");
  const view = page.getByRole("group", { name: "View", exact: true });
  const canvas = page.getByRole("region", { name: "Journey flow" });
  const downloadButton = page.getByRole("button", {
    name: "Download UJG assets",
    exact: true,
  });
  const downloadStatus = page.locator("[data-asset-download-status]");
  const downloadFiles = async (keyboard = false) => {
    const downloading = page.waitForEvent("download");
    if (keyboard) {
      await downloadButton.focus();
      await downloadButton.press("Enter");
    } else await downloadButton.click();
    const download = await downloading;
    assert.equal(await download.failure(), null);
    return {
      name: download.suggestedFilename(),
      files: unzipSync(new Uint8Array(await readFile(await download.path()))),
    };
  };
  await page.addInitScript(() => {
    window.__assetURLs = new Set();
    const create = URL.createObjectURL;
    const revoke = URL.revokeObjectURL;
    URL.createObjectURL = function (...args) {
      const url = create.apply(this, args);
      window.__assetURLs.add(url);
      return url;
    };
    URL.revokeObjectURL = function (url) {
      window.__assetURLs.delete(url);
      return revoke.call(this, url);
    };
  });

  await test("the served page offers Tree and Flow, with Rows and Columns inside Tree, under a sub-path", async () => {
    await page.goto(origin + mount);
    await viewer.locator("[data-explorer-bar]").waitFor();
    assert.equal(await title.textContent(), "solid-oidc.ujg.jsonld");
    assert.equal((await status.textContent()).trim(), "No findings");
    // The brand icon leads the header and links home: this site's own folder.
    const brand = page
      .locator("[data-application-header]")
      .getByRole("link", { name: "Journey Viewer home", exact: true });
    assert.equal(await brand.getAttribute("href"), "./");
    const icon = brand.locator("img");
    await page.waitForFunction(
      (element) => element.complete && element.naturalWidth > 0,
      await icon.elementHandle(),
    );
    assert.ok(
      (await icon.evaluate((element) => element.currentSrc)).startsWith(
        `${origin}${mount}assets/`,
      ),
    );
    assert.equal(
      Math.round((await icon.boundingBox()).width),
      22,
      "the icon is 22px, as in apps/web",
    );
    await viewer
      .getByText("10 journeys · 47 states · 120 transitions · 37 screens", {
        exact: true,
      })
      .waitFor();
    // It opens collapsed: the root journey and its states, with every composite closed.
    const journey = (id) =>
      viewer.locator(`[data-journey-ref="urn:ujg:solid-oidc:${id}"]`);
    await journey("app-auth-journey").waitFor();
    assert.equal(await viewer.locator("[data-journey-ref]").count(), 1);
    assert.equal(await journey("idp-auth-journey").count(), 0);
    await page.screenshot({ path: join(evidence, "tree-opening-1440.png") });
    await viewer.getByRole("button", { name: "Expand all" }).click();
    assert.equal(await viewer.locator("[data-journey-ref]").count(), 10);
    assert.equal(await viewer.locator("[data-state-ref]").count(), 47);
    await page.screenshot({ path: join(evidence, "tree-1440.png") });

    assert.deepEqual(await view.getByRole("button").allTextContents(), [
      "Tree",
      "Flow",
    ]);
    const layout = viewer
      .locator("[data-explorer-bar]")
      .getByRole("group", { name: "Tree layout", exact: true });
    assert.equal(await viewer.locator("[data-canvas-header]").count(), 0);
    assert.equal(await layout.locator('[data-icon="layout-rows"]').count(), 1);
    assert.equal(
      await layout.locator('[data-icon="layout-columns"]').count(),
      1,
    );
    assert.equal(
      await layout
        .getByRole("button", { name: "Rows" })
        .getAttribute("aria-pressed"),
      "true",
    );
    const columns = layout.getByRole("button", { name: "Columns" });
    await columns.focus();
    await columns.press("Enter");
    await viewer.getByRole("group", { name: "Journey columns" }).waitFor();
    assert.equal(
      await view
        .getByRole("button", { name: "Tree" })
        .getAttribute("aria-pressed"),
      "true",
    );
    assert.equal(
      await viewer.getByRole("button", { name: "Expand all" }).count(),
      0,
    );
    await page.screenshot({ path: join(evidence, "columns-1440.png") });

    await view.getByRole("button", { name: "Flow" }).click();
    await canvas.waitFor();
    assert.equal(await layout.count(), 0);
    await view.getByRole("button", { name: "Tree" }).click();
    assert.equal(
      await layout
        .getByRole("button", { name: "Columns" })
        .getAttribute("aria-pressed"),
      "true",
    );
    await layout.getByRole("button", { name: "Rows" }).click();
    assert.equal(
      await viewer.locator("[data-state-ref]").count(),
      47,
      "rows retain the expanded hierarchy",
    );
    await view.getByRole("button", { name: "Flow" }).click();
    await canvas.waitFor();
    assert.ok(
      (await canvas.locator('[data-flow-key^="state:"]').count()) > 0,
      "the canvas draws the journey's states",
    );
    // Flow's own controls sit in its canvas header, beside the journey path, not in the bar.
    const header = page.locator("[data-canvas-header]");
    await header.getByRole("navigation", { name: "Journey path" }).waitFor();
    await header.getByRole("group", { name: "Placement" }).waitFor();
    await header.getByRole("group", { name: "Zoom" }).waitFor();
    assert.equal(
      await page
        .locator("[data-explorer-bar]")
        .getByRole("group", { name: "Placement" })
        .count(),
      0,
    );
    await page.screenshot({ path: join(evidence, "flow-1440.png") });

    await page
      .getByRole("button", { name: "Screen: Sign-in required", exact: true })
      .first()
      .click();
    const dialog = page.getByRole("dialog");
    const image = dialog.locator("img").first();
    await image.waitFor();
    await page.waitForFunction(
      (element) => element.complete && element.naturalWidth > 0,
      await image.elementHandle(),
    );
    assert.ok(
      (await image.getAttribute("src")).startsWith(
        `${origin}${mount}journey/screens/`,
      ),
    );
    await page.keyboard.press("Escape");
    await dialog.waitFor({ state: "detached" });
    assert.deepEqual(errors, []);
  });

  await test("no request leaves the site's folder and none fails", () => {
    const outside = requests.filter(
      (url) => !url.startsWith("data:") && !url.startsWith(origin + mount),
    );
    assert.deepEqual(outside, []);
    assert.deepEqual(
      served.filter((path) => !path.startsWith(mount)),
      [],
    );
    assert.deepEqual(failures, []);
    assert.ok(requests.some((url) => url.endsWith("journey/source.json")));
  });

  await test("keyboard download saves the original document, settings and all 37 screenshots in a portable ZIP", async () => {
    await downloadButton.focus();
    await page
      .getByText("Download UJG assets", { exact: true })
      .waitFor({ state: "visible" });
    const { name, files } = await downloadFiles(true);
    assert.equal(name, "solid-oidc-ujg-assets.zip");
    assert.equal(
      strFromU8(files["document.jsonld"]),
      await readFile(join(example, "solid-oidc.ujg.jsonld"), "utf8"),
    );
    assert.deepEqual(
      JSON.parse(strFromU8(files["touchpoints.json"])),
      JSON.parse(await readFile(join(example, "touchpoints.json"), "utf8")),
    );
    const original = JSON.parse(
      await readFile(join(example, "screenshots.json"), "utf8"),
    );
    const exported = JSON.parse(strFromU8(files["screenshots.json"]));
    assert.deepEqual(
      Object.keys(exported).sort(),
      Object.keys(original).sort(),
    );
    assert.equal(Object.keys(files).length, 40);
    for (const [ref, path] of Object.entries(exported)) {
      assert.match(path, /^screens\/[^/]+\.png$/);
      assert.deepEqual(
        Buffer.from(files[path]),
        await readFile(join(example, original[ref])),
      );
    }
    await page.waitForFunction(() => window.__assetURLs.size === 0);
    assert.equal(await downloadStatus.textContent(), "");
    assert.equal((await status.textContent()).trim(), "No findings");
  });

  await test("a missing screenshot stops the download and allows a complete retry", async () => {
    const downloads = [];
    const record = (download) => downloads.push(download);
    page.on("download", record);
    await page.route("**/journey/screens/**", (route) =>
      route.fulfill({ status: 404, body: "missing" }),
    );
    await page.setViewportSize({ width: 320, height: 900 });
    await downloadButton.click();
    await downloadStatus
      .getByText(
        /Could not download UJG assets.*Screenshot.*status 404.*Try again/,
      )
      .waitFor();
    assert.equal(downloads.length, 0);
    assert.equal(await downloadButton.isEnabled(), true);
    assert.equal((await status.textContent()).trim(), "No findings");
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    await page.screenshot({ path: join(evidence, "assets-error-320.png") });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.unroute("**/journey/screens/**");
    const { files } = await downloadFiles();
    assert.equal(Object.keys(files).length, 40);
    assert.equal(await downloadStatus.textContent(), "");
    page.off("download", record);
  });

  await test("preparation prevents duplicate downloads and a new upload cancels the pending export", async () => {
    const downloads = [];
    const record = (download) => downloads.push(download);
    page.on("download", record);
    let release;
    const gate = new Promise((resolve) => {
      release = resolve;
    });
    let started;
    const requestStarted = new Promise((resolve) => {
      started = resolve;
    });
    await page.route("**/journey/screens/**", async (route) => {
      started();
      await gate;
      await route.continue().catch(() => {});
    });
    await downloadButton.evaluate((button) => {
      button.click();
      button.click();
    });
    await requestStarted;
    assert.equal(await downloadButton.isDisabled(), true);
    assert.equal(await downloadButton.getAttribute("aria-busy"), "true");
    await downloadStatus
      .getByText("Preparing UJG assets…", { exact: true })
      .waitFor();
    // A rejected replacement still cancels the export, retaining the last successful document.
    await page.locator("#journey-file").setInputFiles({
      name: "broken.json",
      mimeType: "application/json",
      buffer: Buffer.from("{"),
    });
    await status
      .getByRole("button", { name: "Couldn't open broken.json" })
      .waitFor();
    release();
    await page.unroute("**/journey/screens/**", undefined, {
      behavior: "wait",
    });
    assert.equal(await title.textContent(), "solid-oidc.ujg.jsonld");
    assert.equal(await downloadButton.isEnabled(), true);
    assert.equal(await downloadStatus.textContent(), "");
    // A fresh export completes after the cancelled one; there is still only one download.
    const { files } = await downloadFiles();
    assert.equal(Object.keys(files).length, 40);
    assert.equal(downloads.length, 1);
    page.off("download", record);
  });

  await test("Upload UJG replaces the document; a rejected file or UJG version keeps it", async () => {
    const input = page.locator("#journey-file");
    // Editor's Draft contexts: they name the version and are never fetched.
    const local = {
      "@context": [
        "https://ujg.specs.openuji.org/ed/ns/core.context.jsonld",
        "https://ujg.specs.openuji.org/ed/ns/graph.context.jsonld",
      ],
      "@id": "urn:local:document",
      "@type": "UJGDocument",
      nodes: [
        {
          "@id": "urn:local:journey",
          "@type": "Journey",
          label: "Local journey",
          entryRefs: ["urn:local:entry"],
          stateRefs: ["urn:local:first", "urn:local:second"],
        },
        {
          "@id": "urn:local:entry",
          "@type": "JourneyEntry",
          label: "Start locally",
          stateRef: "urn:local:first",
        },
        { "@id": "urn:local:first", "@type": "State", label: "Local first" },
        { "@id": "urn:local:second", "@type": "State", label: "Local second" },
      ],
    };
    await page
      .getByRole("button", { name: "Upload UJG", exact: true })
      .waitFor();
    await input.setInputFiles({
      name: "local.jsonld",
      mimeType: "application/ld+json",
      buffer: Buffer.from(JSON.stringify(local)),
    });
    await page.waitForFunction(
      () => document.querySelector("h1")?.textContent === "local.jsonld",
    );
    await viewer
      .getByRole("heading", { name: "Local journey", exact: true })
      .waitFor();
    assert.equal(
      await viewer.getByText("App auth journey", { exact: true }).count(),
      0,
    );
    assert.match(
      await page.locator("[data-application-header]").textContent(),
      /urn:local:document/,
    );
    // Opening a new document resets the viewer to its first view.
    assert.equal(
      await view
        .getByRole("button", { name: "Tree" })
        .getAttribute("aria-pressed"),
      "true",
    );
    await input.setInputFiles({
      name: "broken.json",
      mimeType: "application/json",
      buffer: Buffer.from("{"),
    });
    await status
      .getByRole("button", { name: "Couldn't open broken.json" })
      .waitFor();
    assert.equal(await title.textContent(), "local.jsonld");
    await viewer
      .getByRole("heading", { name: "Local journey", exact: true })
      .waitFor();
    // A UJG version the app cannot read is refused with its contexts, keeping the open graph.
    const dated =
      "https://ujg.specs.openuji.org/2027-01-15/ns/core.context.jsonld";
    await input.setInputFiles({
      name: "future.jsonld",
      mimeType: "application/ld+json",
      buffer: Buffer.from(JSON.stringify({ ...local, "@context": dated })),
    });
    await status
      .getByRole("button", { name: "Couldn't open future.jsonld" })
      .click();
    await page
      .locator("[data-findings]")
      .getByText(`Unsupported UJG version: ${dated}`, { exact: false })
      .waitFor();
    await page.keyboard.press("Escape");
    assert.equal(await title.textContent(), "local.jsonld");
    await viewer
      .getByRole("heading", { name: "Local journey", exact: true })
      .waitFor();
    assert.deepEqual(errors, []);
    const { name, files } = await downloadFiles();
    assert.equal(name, "local-ujg-assets.zip");
    assert.equal(strFromU8(files["document.jsonld"]), JSON.stringify(local));
    assert.deepEqual(Object.keys(files).sort(), [
      "document.jsonld",
      "screenshots.json",
      "touchpoints.json",
    ]);
    assert.deepEqual(JSON.parse(strFromU8(files["screenshots.json"])), {});
    assert.deepEqual(JSON.parse(strFromU8(files["touchpoints.json"])), {});
  });

  await test("large local documents retain uninterpreted fields through browser-worker compression", async () => {
    const original = JSON.parse(
      await readFile(join(example, "solid-oidc.ujg.jsonld"), "utf8"),
    );
    const text = JSON.stringify({
      ...original,
      vendorPayload: "preserve this field ".repeat(30_000),
    });
    await page.locator("#journey-file").setInputFiles({
      name: "large.jsonld",
      mimeType: "application/ld+json",
      buffer: Buffer.from(text),
    });
    await page
      .getByRole("heading", { level: 1, name: "large.jsonld", exact: true })
      .waitFor();
    const { files } = await downloadFiles();
    assert.equal(strFromU8(files["document.jsonld"]), text);
    assert.deepEqual(errors, []);
  });

  await test("a malformed presentation input is reported and leaves Upload UJG working", async () => {
    await page.goto(origin + malformed);
    await status
      .getByRole("button", { name: "Couldn't open solid-oidc.ujg.jsonld" })
      .click();
    await page
      .locator("[data-findings]")
      .getByText(/touchpoints\.json must map Touchpoint IDs/)
      .waitFor();
    await page.keyboard.press("Escape");
    await page
      .getByRole("heading", { name: "Choose a journey file" })
      .waitFor();
    assert.equal(await downloadButton.isDisabled(), true);
    await page.locator("#journey-file").setInputFiles({
      name: "replacement.jsonld",
      mimeType: "application/ld+json",
      buffer: await readFile(join(example, "solid-oidc.ujg.jsonld")),
    });
    await viewer.locator("[data-explorer-bar]").waitFor();
    assert.equal(await title.textContent(), "replacement.jsonld");
    assert.deepEqual(errors, []);
  });

  await test("a host's HTML answer for the missing source still mounts the application", async () => {
    await page.goto(origin + fallback);
    await page
      .getByRole("heading", { name: "Choose a journey file" })
      .waitFor();
    assert.equal(await title.textContent(), "Open a journey");
    assert.equal(await page.getByText("Loading viewer…").count(), 0);
    assert.ok(
      served.includes(`${fallback}journey/source.json`),
      "the source was requested and answered with the page",
    );
    assert.deepEqual(errors, []);
  });

  await test("no page overflow at 320–1440 in Tree Rows, Tree Columns and Flow", async () => {
    await page.goto(origin + mount);
    await viewer.locator("[data-explorer-bar]").waitFor();
    for (const presentation of ["Rows", "Columns", "Flow"]) {
      for (const width of [320, 375, 859, 860, 1099, 1100, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        await page
          .getByRole("group", { name: "View", exact: true })
          .getByRole("button", {
            name: presentation === "Flow" ? "Flow" : "Tree",
          })
          .click();
        if (presentation !== "Flow")
          await viewer
            .getByRole("group", { name: "Tree layout" })
            .getByRole("button", { name: presentation })
            .click();
        const overflow = await page.evaluate(
          () =>
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
        );
        assert.equal(overflow, 0, `${presentation} at ${width}px`);
        await page.keyboard.press("Tab");
        for (const label of ["Upload UJG", "Download UJG assets"]) {
          const button = page
            .locator("[data-application-header]")
            .getByRole("button", { name: label, exact: true });
          await button.focus();
          assert.equal(
            await button.evaluate(
              (element, min) =>
                document.activeElement === element &&
                getComputedStyle(element).outlineStyle !== "none" &&
                element.getBoundingClientRect().height >= min,
              width < 860 ? 44 : 30,
            ),
            true,
            `${label} focus and target at ${width}`,
          );
        }
        await page
          .getByText("Download UJG assets", { exact: true })
          .waitFor({ state: "visible" });
        const tip = await page
          .getByText("Download UJG assets", { exact: true })
          .boundingBox();
        assert.ok(
          tip.x >= 0 && tip.x + tip.width <= width,
          `download tooltip fits ${width}`,
        );
        if (width === 375)
          await page.screenshot({
            path: join(evidence, `${presentation.toLowerCase()}-375.png`),
          });
      }
    }
    assert.deepEqual(errors, []);
  });
} finally {
  await browser?.close();
  server?.close();
  await rm(work, { recursive: true, force: true });
}
