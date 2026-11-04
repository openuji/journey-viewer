import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { chromium } from "playwright";
import { strFromU8, unzipSync } from "fflate";

const root = fileURLToPath(new URL("../storybook-static/", import.meta.url));
const evidence = fileURLToPath(new URL("../.test-output/", import.meta.url));
await mkdir(evidence, { recursive: true });
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".jsonld": "application/ld+json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
};
let server, browser;
try {
  let origin = process.env.APP_STORYBOOK_URL;
  if (!origin) {
    server = createServer(async (request, response) => {
      const pathname = decodeURIComponent(
        new URL(request.url, "http://localhost").pathname,
      );
      const path = resolve(
        root,
        `.${pathname.endsWith("/") ? `${pathname}index.html` : pathname}`,
      );
      if (!path.startsWith(resolve(root) + sep))
        return void response.writeHead(403).end();
      try {
        const content = await readFile(path);
        response
          .writeHead(200, {
            "content-type": types[extname(path)] ?? "application/octet-stream",
          })
          .end(content);
      } catch {
        response.writeHead(404).end();
      }
    });
    await new Promise((done) => server.listen(0, "127.0.0.1", done));
    origin = `http://127.0.0.1:${server.address().port}`;
  }
  browser = await chromium.launch({
    headless: true,
    ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
      : {}),
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
  });
  page.setDefaultTimeout(10000);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const index = await (await fetch(`${origin}/index.json`)).json();
  const stories = Object.values(index.entries).filter(
    (entry) => entry.type === "story",
  );
  const story = async (id, theme = "light") => {
    await page.goto(
      `${origin}/iframe.html?id=${id}&viewMode=story&globals=theme:${theme}`,
    );
    await page.waitForFunction(
      () => document.querySelector("#storybook-root")?.childElementCount > 0,
    );
    assert.equal(await page.locator(".sb-errordisplay").isVisible(), false, id);
  };
  const header = page.locator("[data-application-header]");
  const download = () =>
    header.getByRole("button", { name: "Download UJG assets", exact: true });

  await test("each app component except BrandLink has a colocated catalog with renderable light/dark stories", async () => {
    assert.deepEqual([...new Set(stories.map((entry) => entry.title))].sort(), [
      "App/Application",
      "App/ApplicationEmpty",
      "App/ApplicationHeader",
      "App/ApplicationViewer",
    ]);
    assert.ok(stories.length >= 19);
    for (const entry of stories) {
      assert.match(
        entry.importPath,
        /src\/components\/[^/]+\/[^/]+\.stories\.tsx$/,
      );
      for (const theme of ["light", "dark"]) {
        await story(entry.id, theme);
        if (
          entry.id === "app-application--solid-oidc" ||
          entry.id === "app-application--document-only"
        )
          await page.locator("[data-application-viewer]").waitFor();
        if (entry.id === "app-application--syntax-error")
          await header
            .getByRole("button", { name: "Couldn't open broken.json" })
            .waitFor();
      }
    }
    assert.deepEqual(errors, []);
  });

  await test("the full application story supports keyboard ZIP export and a real local upload", async () => {
    await story("app-application--solid-oidc");
    await page.locator("[data-application-viewer]").waitFor();
    await download().focus();
    await page
      .getByText("Download UJG assets", { exact: true })
      .waitFor({ state: "visible" });
    const downloading = page.waitForEvent("download");
    await download().press("Enter");
    const saved = await downloading;
    assert.equal(saved.suggestedFilename(), "solid-oidc-ujg-assets.zip");
    assert.equal(await saved.failure(), null);
    const files = unzipSync(new Uint8Array(await readFile(await saved.path())));
    assert.equal(Object.keys(files).length, 40);
    const text = await readFile(
      join(root, "solid-oidc", "solid-oidc.ujg.jsonld"),
      "utf8",
    );
    assert.equal(strFromU8(files["document.jsonld"]), text);
    const chooser = page.waitForEvent("filechooser");
    await header
      .getByRole("button", { name: "Upload UJG", exact: true })
      .click();
    await (
      await chooser
    ).setFiles({
      name: "local.jsonld",
      mimeType: "application/ld+json",
      buffer: Buffer.from(text),
    });
    await page
      .getByRole("heading", { level: 1, name: "local.jsonld", exact: true })
      .waitFor();
    assert.doesNotMatch(
      await page.locator("[data-explorer-bar]").textContent(),
      /37 screens/,
    );
    assert.deepEqual(errors, []);
  });

  await test("header stories expose document findings and independent download feedback", async () => {
    await story("app-applicationheader--warnings");
    await header.getByRole("button", { name: "1 warning" }).click();
    await page
      .getByRole("dialog", {
        name: "solid-oidc.ujg.jsonld opened with 1 warning",
      })
      .waitFor();
    await page.getByText("ujg/reference-targets", { exact: false }).waitFor();
    await story("app-applicationheader--empty");
    assert.equal(await download().isDisabled(), true);
    await story("app-applicationheader--reading");
    assert.equal(await download().isDisabled(), true);
    await story("app-applicationheader--downloading");
    assert.equal(await download().isDisabled(), true);
    await header.getByText("Preparing UJG assets…", { exact: true }).waitFor();
    await story("app-applicationheader--download-error");
    await header.getByText(/Could not download UJG assets/).waitFor();
    assert.equal(await download().isEnabled(), true);
    assert.equal(
      (await header.getByRole("status").textContent()).trim(),
      "No findings",
    );
    assert.deepEqual(errors, []);
  });

  await test("component stories preserve mobile layouts, shared controls and theme boundaries", async () => {
    const colors = [];
    for (const theme of ["light", "dark"]) {
      for (const id of [
        "app-applicationheader--default",
        "app-applicationheader--long-document-name",
        "app-applicationheader--download-error",
        "app-applicationempty--with-alternative",
        "app-applicationviewer--screens",
      ]) {
        await story(id, theme);
        for (const width of [320, 859, 860, 1440]) {
          await page.setViewportSize({ width, height: 900 });
          assert.equal(
            await page.evaluate(
              () => document.documentElement.scrollWidth > innerWidth,
            ),
            false,
            `${id}, ${theme}, ${width}`,
          );
          if (id === "app-applicationheader--default") {
            const upload = header.getByRole("button", {
              name: "Upload UJG",
              exact: true,
            });
            await page.keyboard.press("Tab");
            await upload.focus();
            assert.equal(
              await upload.evaluate(
                (element, min) =>
                  document.activeElement === element &&
                  getComputedStyle(element).outlineStyle !== "none" &&
                  element.getBoundingClientRect().height >= min,
                width < 860 ? 44 : 30,
              ),
              true,
            );
            if (width === 1440)
              colors.push(
                await header.evaluate(
                  (element) => getComputedStyle(element).backgroundColor,
                ),
              );
          }
          if (width === 320 || width === 1440)
            await page.screenshot({
              path: join(evidence, `storybook-${id}-${theme}-${width}.png`),
            });
        }
      }
    }
    assert.notEqual(colors[0], colors[1]);
    await story("app-applicationviewer--screens");
    const view = page.getByRole("group", { name: "View", exact: true });
    await view.getByRole("button", { name: "Flow", exact: true }).click();
    await page.getByRole("region", { name: "Journey flow" }).waitFor();
    await page.getByRole("group", { name: "Placement", exact: true }).waitFor();
    await view.getByRole("button", { name: "Tree", exact: true }).click();
    await page
      .getByRole("group", { name: "Tree layout", exact: true })
      .getByRole("button", { name: "Columns", exact: true })
      .click();
    await page
      .getByRole("group", { name: "Journey columns", exact: true })
      .waitFor();
    assert.deepEqual(errors, []);
  });
} finally {
  await browser?.close();
  if (server) await new Promise((done) => server.close(done));
}
