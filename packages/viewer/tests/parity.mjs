/**
 * Development-only parity harness: compares the original journey-graph hierarchy with the
 * Journey Viewer app route. Both servers must already be running; nothing is started here.
 *
 *   ORIGINAL_URL (default http://localhost:5174/hierarchy)
 *   VIEWER_URL   (default http://localhost:4321/app/examples/solid-oidc/)
 *
 * Paired screenshots are written to the ignored `.test-output/parity/` directory.
 */
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { chromium } from "playwright";

const originalUrl =
  process.env.ORIGINAL_URL ?? "http://localhost:5174/hierarchy";
const viewerUrl =
  process.env.VIEWER_URL ?? "http://localhost:4321/app/examples/solid-oidc/";
const evidence = fileURLToPath(
  new URL("../.test-output/parity/", import.meta.url),
);
await mkdir(evidence, { recursive: true });

for (const target of [originalUrl, viewerUrl]) {
  const reachable = await fetch(target).then(
    (response) => response.ok,
    () => false,
  );
  if (!reachable) {
    console.error(
      `Parity harness needs both servers; ${target} is not reachable.`,
    );
    process.exit(1);
  }
}

const browser = await chromium.launch({ headless: true });
const original = {
  name: "original",
  url: originalUrl,
  root: "body",
  bar: "header",
  inspector: "aside",
  row: (label) => `button:has-text("${label}")`,
  phone: (label) => `button[aria-label="Screen mockup: ${label}"]`,
  columns: '[class*="_lanes_"]',
  lane: '[class*="_lanes_"] > section',
  results: '[class*="_results_"]',
  previewCard: '[class*="_preview_"][class*="_on_"]',
};
const viewer = {
  name: "viewer",
  url: viewerUrl,
  root: "[data-application-viewer]",
  bar: "[data-explorer-bar]",
  inspector: 'aside[aria-label="Selection inspector"]',
  row: (label) => `[data-row] button:has-text("${label}")`,
  phone: (label) => `button[aria-label="Screen mockup: ${label}"]`,
  columns: '[aria-label="Journey columns"]',
  lane: '[aria-label="Journey columns"] > *',
  results: "[data-search-field] ul",
  previewCard: "[data-visible]",
};

async function open(side, width, height = 900) {
  const page = await browser.newPage({ viewport: { width, height } });
  await page.goto(side.url, { waitUntil: "networkidle" });
  await page.locator(side.row("Sign-in required")).first().waitFor();
  // Align both pages so their explorer bars start at the viewport top.
  await page.evaluate((selector) => {
    const bar = document.querySelector(selector);
    window.scrollTo(0, bar.getBoundingClientRect().top + window.scrollY);
  }, side.bar);
  await page.waitForTimeout(200);
  return page;
}

const metrics = (page, side) =>
  page.evaluate(
    ({ bar, inspector, root }) => {
      const barBox = document.querySelector(bar).getBoundingClientRect();
      const first = [...document.querySelectorAll(`${root} button`)].find(
        (button) => button.textContent.trim().startsWith("Sign-in required"),
      );
      const panel = document.querySelector(inspector).getBoundingClientRect();
      const visible = [
        ...document.querySelector(root).querySelectorAll("button"),
      ].filter((button) => {
        const box = button.getBoundingClientRect();
        return box.width > 0 && box.height > 0;
      }).length;
      return {
        firstRowOffset: Math.round(
          first.getBoundingClientRect().top - barBox.bottom,
        ),
        rowHeight: Math.round(
          first.closest("div").getBoundingClientRect().height,
        ),
        inspectorLeft: Math.round(panel.left),
        inspectorTop: Math.round(panel.top),
        inspectorWidth: Math.round(panel.width),
        firstRowTop: Math.round(first.getBoundingClientRect().top),
        buttons: visible,
      };
    },
    { bar: side.bar, inspector: side.inspector, root: side.root },
  );

try {
  // The original used max-width queries (≤1100px, ≤860px); the agreed mobile-first breakpoints switch
  // at ≥1100px and ≥860px. Compare just inside each threshold, where both define the same layout.
  for (const width of [1440, 1099, 859, 375]) {
    await test(`initial layout matches the original at ${width}px`, async () => {
      const pages = await Promise.all(
        [original, viewer].map((side) => open(side, width)),
      );
      const [before, after] = await Promise.all(
        pages.map((page, index) => metrics(page, [original, viewer][index])),
      );
      await Promise.all(
        pages.map((page, index) =>
          page.screenshot({
            path: `${evidence}/initial-${width}-${[original, viewer][index].name}.png`,
          }),
        ),
      );
      console.log(width, JSON.stringify({ original: before, viewer: after }));
      if (width >= 860) {
        assert.ok(
          Math.abs(after.firstRowOffset - before.firstRowOffset) <= 40,
          "first row follows the bar like the original",
        );
        assert.ok(
          after.inspectorLeft > width / 2,
          "inspector is the right-hand column",
        );
        assert.ok(
          Math.abs(after.inspectorWidth - before.inspectorWidth) <= 4,
          "inspector column width matches",
        );
      } else {
        assert.ok(
          after.inspectorTop < after.firstRowTop,
          "inspector precedes the tree on narrow layouts",
        );
        assert.equal(before.inspectorTop < before.firstRowTop, true);
      }
      assert.ok(
        after.buttons <= before.buttons * 1.15,
        `control count stays comparable (${after.buttons} vs ${before.buttons})`,
      );
      await Promise.all(pages.map((page) => page.close()));
    });
  }

  await test("row hover tones and the floating phone preview match the original", async () => {
    for (const side of [original, viewer]) {
      const page = await open(side, 1440);
      await page.locator(side.row("Login")).first().hover();
      await page.screenshot({ path: `${evidence}/hover-row-${side.name}.png` });
      await page.locator(side.phone("Login")).first().hover();
      await page.waitForTimeout(300);
      const card = page.locator(side.previewCard).first();
      await card.waitFor();
      const box = await card.boundingBox();
      assert.ok(
        box.width <= 250 && box.height > box.width,
        `${side.name} shows a portrait preview card`,
      );
      await page.screenshot({
        path: `${evidence}/hover-preview-${side.name}.png`,
      });
      await page.locator(side.phone("Login")).first().click();
      const dialog = page.locator("dialog[open]");
      await dialog.waitFor();
      await page.waitForTimeout(400);
      const image = await dialog.locator("img").first().boundingBox();
      assert.ok(
        Math.abs(image.width / image.height - 840 / 1520) < 0.02,
        `${side.name} lightbox keeps the portrait ratio`,
      );
      assert.ok(
        image.height <= 761,
        `${side.name} lightbox image is at most 760px tall`,
      );
      await page.screenshot({ path: `${evidence}/lightbox-${side.name}.png` });
      await page.close();
    }
  });

  await test("columns after selecting Login show the same lanes as the original", async () => {
    const lanes = [];
    for (const side of [original, viewer]) {
      const page = await open(side, 1440);
      await page.locator(side.row("Login")).first().click();
      await page.getByRole("button", { name: "Columns", exact: true }).click();
      await page.waitForTimeout(400);
      lanes.push(
        await page
          .locator(side.lane)
          .evaluateAll((elements) =>
            elements.map((element) =>
              Math.round(element.getBoundingClientRect().width),
            ),
          ),
      );
      await page.screenshot({ path: `${evidence}/columns-${side.name}.png` });
      await page.close();
    }
    assert.deepEqual(lanes[1], lanes[0]);
  });

  await test("the IdP filter and an SMS search present like the original", async () => {
    for (const side of [original, viewer]) {
      const page = await open(side, 1440);
      await page.getByRole("button", { name: "IdP", exact: true }).click();
      await page.screenshot({
        path: `${evidence}/filter-idp-${side.name}.png`,
      });
      await page.keyboard.press("/");
      await page.keyboard.type("SMS");
      const results = page.locator(side.results).first();
      await results.waitFor();
      const box = await results.boundingBox();
      assert.ok(box.width <= 340, `${side.name} results are a compact popover`);
      await page.screenshot({
        path: `${evidence}/search-sms-${side.name}.png`,
      });
      await page.close();
    }
  });
} finally {
  await browser.close();
}
