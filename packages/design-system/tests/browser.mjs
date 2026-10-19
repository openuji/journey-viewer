import assert from "node:assert/strict";
import test from "node:test";
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { resolve, sep, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { readTokens } from "../scripts/token-data.mjs";
import { generateTokens } from "../scripts/tokens.mjs";

const root = resolve(
  fileURLToPath(new URL("../storybook-static/", import.meta.url)),
);
const evidence = fileURLToPath(new URL("../.test-output/", import.meta.url));
await mkdir(evidence, { recursive: true });
const mime = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".png": "image/png",
};
const server = createServer(async (request, response) => {
  const pathname = decodeURIComponent(
    new URL(request.url, "http://localhost").pathname,
  );
  const path = resolve(
    root,
    `.${pathname.endsWith("/") ? `${pathname}index.html` : pathname}`,
  );
  if (!path.startsWith(root + sep) && path !== root) {
    response.writeHead(403).end();
    return;
  }
  try {
    response
      .writeHead(200, {
        "content-type": mime[extname(path)] ?? "application/octet-stream",
      })
      .end(await readFile(path));
  } catch {
    response.writeHead(404).end("Not found");
  }
});
await new Promise((done) => server.listen(0, "127.0.0.1", done));
const url = `http://127.0.0.1:${server.address().port}`;
let browser;
try {
  browser = await chromium.launch({
    headless: true,
    ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
      : {}),
  });
  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const consumer = () => page.goto(`${url}/consumer/`);
  const light = () => page.getByTestId("light");

  await test("compiled CSS supports independent and nested themes without consumer Tailwind processing", async () => {
    await consumer();
    await page
      .getByTestId("alternate")
      .getByRole("button", { name: "Continue", exact: true })
      .waitFor();
    const details = await Promise.all(
      ["light", "dark", "alternate"].map((name) =>
        page
          .getByTestId(name)
          .getByRole("button", { name: "Continue", exact: true })
          .evaluate((element) => ({
            color: getComputedStyle(element).backgroundColor,
            font: getComputedStyle(element).fontFamily,
            space: getComputedStyle(element)
              .getPropertyValue("--jv-space-sm")
              .trim(),
          })),
      ),
    );
    assert.equal(new Set(details.map((detail) => detail.color)).size, 3);
    assert.equal(parseFloat(details[0].space), 0.5);
    assert.equal(parseFloat(details[2].space), 0.75);
    assert.match(details[2].font, /Georgia/);
    const nestedColor = await page
      .getByTestId("nested-light")
      .getByRole("button")
      .evaluate((element) => getComputedStyle(element).color);
    const lightColor = await light()
      .getByRole("button", { name: "Add item" })
      .evaluate((element) => getComputedStyle(element).color);
    assert.equal(nestedColor, lightColor);
  });

  await test("320px and both breakpoint boundaries preserve wrapping and shared control sizing", async () => {
    for (const width of [320, 859, 860, 861, 1099, 1100, 1101]) {
      await page.setViewportSize({ width, height: 900 });
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      );
      assert.equal(overflow, false, `page overflow at ${width}`);
      const height = await light()
        .getByRole("button", { name: "Add item" })
        .evaluate((element) => element.getBoundingClientRect().height);
      assert.equal(
        height,
        width < 860 ? 44 : 30,
        `shared button size at ${width}`,
      );
      const description = await light()
        .getByText("Nested journey", { exact: true })
        .evaluate((element) => getComputedStyle(element).display);
      assert.equal(
        description === "none",
        width < 860,
        `module breakpoint at ${width}`,
      );
    }
    await page.setViewportSize({ width: 320, height: 900 });
    await page.screenshot({
      path: `${evidence}/stage4-mobile.png`,
      fullPage: true,
    });
  });

  await test("native keyboard activation, controlled snapshots, focus, disabled and form behavior work", async () => {
    await consumer();
    await page.keyboard.press("Tab");
    const toggle = light().getByRole("button", { name: /^Expand / });
    await toggle.waitFor();
    assert.equal(
      await toggle.evaluate((element) => element === document.activeElement),
      true,
    );
    assert.equal(
      await toggle.evaluate(
        (element) => getComputedStyle(element).outlineStyle,
      ),
      "solid",
    );
    await page.keyboard.press("Space");
    assert.equal(
      await light()
        .getByRole("button", { name: /^Collapse / })
        .getAttribute("aria-expanded"),
      "true",
    );
    assert.equal(await light().getByText("Caller-supplied content").count(), 1);
    await page.keyboard.press("Enter");
    assert.equal(await light().getByText("Caller-supplied content").count(), 0);
    const select = light()
      .getByRole("button", { pressed: false })
      .filter({ hasText: "Averylong" });
    await select.focus();
    await page.keyboard.press("Enter");
    assert.equal(
      await light().getByRole("button", { pressed: true }).count(),
      1,
    );
    assert.equal(
      await page
        .getByTestId("dark")
        .getByRole("button", { pressed: true })
        .count(),
      0,
    );
    assert.equal(
      await light().getByRole("button", { name: "Unavailable" }).isDisabled(),
      true,
    );
    await page
      .getByRole("button", { name: "Default button inside form" })
      .click();
    assert.equal(
      await page.locator("html").getAttribute("data-submitted"),
      null,
    );
    await page.getByRole("button", { name: "Submit", exact: true }).click();
    assert.equal(
      await page.locator("html").getAttribute("data-submitted"),
      "true",
    );
  });

  await test("coarse pointer devices retain 44px hit areas at desktop widths", async () => {
    const touch = await browser.newContext({
      viewport: { width: 1101, height: 900 },
      hasTouch: true,
    });
    try {
      const touchPage = await touch.newPage();
      await touchPage.goto(`${url}/consumer/`);
      const button = touchPage
        .getByTestId("light")
        .getByRole("button", { name: "Add item" });
      assert.equal(
        await button.evaluate(
          (element) => element.getBoundingClientRect().height,
        ),
        44,
      );
    } finally {
      await touch.close();
    }
  });

  await test("entry/exit explanations appear in the accessibility tree and touchpoint captions occur once", async () => {
    await consumer();
    const article = light().locator("article");
    await article.waitFor();
    const snapshot = await article.ariaSnapshot();
    assert.match(snapshot, /1 entry/);
    assert.match(snapshot, /2 exits/);
    assert.doesNotMatch(snapshot, /←|→/);
    assert.equal((snapshot.match(/\bWeb\b/g) ?? []).length, 1);
    assert.equal(await article.getByRole("img", { name: "Web" }).count(), 0);
  });

  await test("state-row text inherits hover, active and selected colors in every theme", async () => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await consumer();
    const color = (locator) =>
      locator.evaluate((element) => getComputedStyle(element).color);
    for (const theme of ["light", "dark", "alternate"]) {
      const row = page
        .getByTestId(theme)
        .getByRole("button", { pressed: false })
        .filter({ hasText: "Averylong" });
      const label = row.locator('[data-role="label"]');
      const baseline = await color(row);
      assert.equal(await color(label), baseline);
      await row.hover();
      assert.equal(await color(label), await color(row));
      await page.mouse.down();
      const active = await color(row);
      assert.notEqual(active, baseline);
      assert.equal(await color(label), active);
      await page.mouse.up();
      await page.mouse.move(0, 0);
      const selected = page
        .getByTestId(theme)
        .getByRole("button", { pressed: true });
      assert.notEqual(await color(selected), baseline);
      assert.equal(
        await color(selected.locator('[data-role="label"]')),
        await color(selected),
      );
    }
  });

  await test("a DTCG source change reaches both primitive styling and generated utilities", async () => {
    await page.goto(
      `${url}/iframe.html?id=foundations-system--token-utilities&viewMode=story`,
    );
    const button = page.getByRole("button", { name: "Continue", exact: true });
    const utility = page.getByTestId("utility-probe");
    await utility.waitFor();
    const padding = (locator) =>
      locator.evaluate(
        (element) => getComputedStyle(element).paddingInlineStart,
      );
    assert.equal(await padding(button), "8px");
    assert.equal(await padding(utility), "8px");
    const { foundation, themes } = await readTokens();
    const changed = structuredClone(foundation);
    changed.foundation.space.sm.$value.value = 1.25;
    changed.foundation.text["heading-sm"].$value.value = 1.25;
    changed.foundation.light.accent.$value.components = [0.5, 0.2, 0.1];
    await page.addStyleTag({
      content: generateTokens(changed, themes).tokensCss,
    });
    assert.equal(await padding(button), "20px");
    assert.equal(await padding(utility), "20px");
    const color = (locator) =>
      locator.evaluate((element) => getComputedStyle(element).backgroundColor);
    assert.equal(await color(button), await color(utility));
    assert.equal(await color(button), "rgb(128, 51, 26)");
    assert.equal(
      await page
        .getByRole("heading", { name: "Shared token consumers" })
        .evaluate((element) => getComputedStyle(element).fontSize),
      "20px",
    );
  });

  await test("all component stories load; utility breakpoints match module breakpoints", async () => {
    const index = await (await fetch(`${url}/index.json`)).json();
    const stories = Object.values(index.entries).filter(
      (entry) => entry.type === "story",
    );
    assert.ok(stories.length >= 20);
    for (const story of stories) {
      await page.goto(`${url}/iframe.html?id=${story.id}&viewMode=story`);
      await page.locator("#storybook-root").waitFor();
      await page.waitForFunction(
        () => document.querySelector("#storybook-root")?.childElementCount > 0,
      );
      assert.equal(
        await page.locator(".sb-errordisplay").isVisible(),
        false,
        story.id,
      );
    }
    await page.goto(
      `${url}/iframe.html?id=foundations-system--themes&viewMode=story`,
    );
    const grid = page.locator("#storybook-root .grid");
    await grid.waitFor();
    for (const width of [320, 859, 860, 861, 1099, 1100, 1101]) {
      await page.setViewportSize({ width, height: 900 });
      const columns = await grid.evaluate(
        (element) =>
          getComputedStyle(element).gridTemplateColumns.split(" ").length,
      );
      assert.equal(
        columns,
        width < 860 ? 1 : width < 1100 ? 2 : 3,
        `utility breakpoint at ${width}`,
      );
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > window.innerWidth,
        ),
        false,
        `story overflow at ${width}`,
      );
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.screenshot({
      path: `${evidence}/stage4-themes.png`,
      fullPage: true,
    });
    await page.goto(
      `${url}/iframe.html?id=foundations-system--built-consumer&viewMode=story`,
    );
    await page
      .frameLocator(
        'iframe[title="Compiled components without Tailwind processing"]',
      )
      .getByTestId("light")
      .getByRole("button", { name: "Continue", exact: true })
      .waitFor();
    assert.deepEqual(errors, []);
  });
} finally {
  await browser?.close();
  await new Promise((done) => server.close(done));
}
