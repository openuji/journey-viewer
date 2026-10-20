import assert from "node:assert/strict";
import { readFile, mkdir } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { chromium } from "playwright";

const root = fileURLToPath(new URL("../storybook-static/", import.meta.url));
const evidence = fileURLToPath(new URL("../.test-output/", import.meta.url));
await mkdir(evidence, { recursive: true });
const types = {
  ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png",
  ".woff2": "font/woff2",
};
const server = createServer(async (request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  const path = resolve(root, `.${pathname.endsWith("/") ? `${pathname}index.html` : pathname}`);
  if (!path.startsWith(resolve(root) + sep)) return void response.writeHead(403).end();
  try {
    response.writeHead(200, { "content-type": types[extname(path)] ?? "application/octet-stream" }).end(await readFile(path));
  } catch {
    response.writeHead(404).end();
  }
});
await new Promise((done) => server.listen(0, "127.0.0.1", done));
let browser;
try {
  browser = await chromium.launch({
    headless: true,
    ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {}),
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const url = `http://127.0.0.1:${server.address().port}`;
  await page.goto(`${url}/viewer-consumer/`);
  const oidc = page.getByTestId("oidc");
  await oidc.getByRole("heading", { name: "App auth journey", exact: true }).waitFor();

  await test("compiled consumer preserves the OIDC baseline and each journey's explicit display order", async () => {
    assert.equal(await oidc.locator("[data-journey-ref]").count(), 10);
    assert.equal(await oidc.locator("[data-state-ref]").count(), 47);
    assert.equal(await oidc.locator('[data-contract-kind="entry"]').count(), 20);
    assert.equal(await oidc.locator('[data-contract-kind="exit"]').count(), 24);
    const document = JSON.parse(await readFile(new URL("../../../examples/solid-oidc/solid-oidc.ujg.jsonld", import.meta.url), "utf8"));
    for (const journey of document.nodes.filter((node) => node["@type"] === "Journey")) {
      const branch = oidc.locator(`[data-journey-ref="${journey["@id"]}"]`);
      const actual = await branch.evaluate((element) => {
        const own = (selector, attribute) => [...element.querySelectorAll(selector)]
          .filter((child) => child.closest("[data-journey-ref]") === element)
          .map((child) => child.getAttribute(attribute));
        return {
          states: own("[data-state-ref]", "data-state-ref"),
          entries: own('[data-contract-kind="entry"]', "data-contract-ref"),
          exits: own('[data-contract-kind="exit"]', "data-contract-ref"),
        };
      });
      assert.deepEqual(actual, { states: journey.stateRefs, entries: journey.entryRefs, exits: journey.exitRefs ?? [] });
    }
    const sms = oidc.locator('[data-journey-ref="urn:ujg:solid-oidc:sms-verification-journey"]');
    assert.equal(await sms.locator("xpath=ancestor::*[@data-journey-ref]").count(), 3);
    assert.equal(await oidc.getByRole("button").count(), 0);
    assert.equal(await oidc.getByRole("region").count(), 0);
  });

  await test("multiple child references, reuse, rootless cycles, and static semantics remain explicit", async () => {
    const fixture = page.getByTestId("fixture");
    assert.equal(await fixture.locator('[data-journey-ref="urn:test:shared"]').count(), 3);
    assert.equal(await fixture.locator('[data-recursive-ref="urn:test:shared"]').count(), 3);
    const rootless = fixture.getByRole("group", { name: "Journeys without a root" });
    assert.equal(await rootless.locator("[data-recursive-ref]").count(), 2);
    const snapshot = await fixture.ariaSnapshot();
    const contracts = fixture.locator("dl").first();
    assert.deepEqual(await contracts.getByRole("term").allTextContents(), ["Entries", "Exits"]);
    const contractSnapshot = await contracts.ariaSnapshot();
    assert.equal((contractSnapshot.match(/\bEntries\b/g) ?? []).length, 1);
    assert.equal((contractSnapshot.match(/\bExits\b/g) ?? []).length, 1);
    assert.match(snapshot, /Begin first root.*default/);
    assert.match(snapshot, /1 entry names this state/);
    assert.match(snapshot, /1 listed exit reached by a direct transition from this state/);
    assert.doesNotMatch(snapshot, /button|←|→/);
    assert.deepEqual(errors, []);
  });

  await test("320px and named breakpoint boundaries wrap the expanded hierarchy without overflow", async () => {
    for (const width of [320, 859, 860, 861, 1099, 1100, 1101]) {
      await page.setViewportSize({ width, height: 900 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false, `overflow at ${width}`);
      const overflow = await page.locator("[data-journey-ref], [data-state-ref], [data-contract-ref]").evaluateAll((elements) => elements
        .filter((element) => element.getBoundingClientRect().right > window.innerWidth + 1)
        .map((element) => element.outerHTML.slice(0, 150)));
      assert.deepEqual(overflow, [], `hierarchy overflow at ${width}`);
    }
    await page.setViewportSize({ width: 320, height: 900 });
    await oidc.screenshot({ path: `${evidence}/stage5-mobile.png` });
    await page.setViewportSize({ width: 1280, height: 900 });
    await oidc.screenshot({ path: `${evidence}/stage5-oidc.png` });
  });

  await test("separate theme boundaries style the same static hierarchy through shared tokens", async () => {
    const foreground = (locator) => locator.getByRole("heading", { name: "First root", exact: true })
      .evaluate((element) => getComputedStyle(element).color);
    assert.notEqual(await foreground(page.getByTestId("fixture")), await foreground(page.getByTestId("dark")));
    await page.getByTestId("dark").screenshot({ path: `${evidence}/stage5-dark.png` });
    assert.deepEqual(errors, []);
  });

  await test("viewer Storybook extends the design-system catalog and loads all stories and consumer iframes", async () => {
    const index = await (await fetch(`${url}/index.json`)).json();
    const stories = Object.values(index.entries).filter((entry) => entry.type === "story");
    assert.equal(stories.filter((entry) => entry.title.startsWith("Design system/")).length, 39);
    assert.equal(stories.filter((entry) => entry.title.startsWith("Viewer/")).length, 16);
    for (const story of stories) {
      await page.goto(`${url}/iframe.html?id=${story.id}&viewMode=story`);
      await page.waitForFunction(() => document.querySelector("#storybook-root")?.childElementCount > 0);
      assert.equal(await page.locator(".sb-errordisplay").isVisible(), false, story.id);
    }
    await page.goto(`${url}/iframe.html?id=viewer-journeyhierarchy--built-consumer&viewMode=story`);
    await page.frameLocator('iframe[title="Compiled viewer without Tailwind processing"]')
      .getByTestId("oidc").getByRole("heading", { name: "App auth journey", exact: true }).waitFor();
    await page.goto(`${url}/iframe.html?id=design-system-foundations-system--built-consumer&viewMode=story`);
    await page.frameLocator('iframe[title="Compiled components without Tailwind processing"]')
      .getByTestId("light").getByRole("button", { name: "Continue", exact: true }).waitFor();
    assert.deepEqual(errors, []);
  });

  await test("viewer stories inherit theme globals and preserve source rendering and responsive layout", async () => {
    const appearances = [];
    for (const theme of ["light", "dark", "alternate"]) {
      await page.goto(`${url}/iframe.html?id=viewer-journeyhierarchy--multiple-roots-and-recursion&viewMode=story&globals=theme:${theme}`);
      const scope = page.locator(`.story-scope[data-jv-theme="${theme}"]`);
      const heading = scope.getByRole("heading", { name: "First root", exact: true });
      await heading.waitFor();
      appearances.push(await heading.evaluate((element) => ({
        color: getComputedStyle(element).color,
        font: getComputedStyle(element).fontFamily,
        space: getComputedStyle(element).getPropertyValue("--jv-space-sm").trim(),
      })));
      assert.equal(await scope.locator('[data-journey-ref="urn:test:shared"]').count(), 3);
      for (const width of [320, 859, 860, 861, 1099, 1100, 1101]) {
        await page.setViewportSize({ width, height: 900 });
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false, `${theme} story overflow at ${width}`);
      }
    }
    assert.notEqual(appearances[0].color, appearances[1].color);
    assert.notEqual(appearances[0].font, appearances[2].font);
    assert.notEqual(appearances[0].space, appearances[2].space);
    await page.goto(`${url}/iframe.html?id=viewer-journeyhierarchy--oidc&viewMode=story`);
    await page.getByRole("heading", { name: "App auth journey", exact: true }).waitFor();
    assert.equal(await page.locator("[data-journey-ref]").count(), 10);
    assert.equal(await page.locator("[data-state-ref]").count(), 47);
    assert.equal(await page.locator('[data-contract-kind="entry"]').count(), 20);
    assert.equal(await page.locator('[data-contract-kind="exit"]').count(), 24);
    await page.setViewportSize({ width: 320, height: 900 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
    await page.screenshot({ path: `${evidence}/stage5-storybook-mobile.png`, fullPage: true });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.screenshot({ path: `${evidence}/stage5-storybook-oidc.png`, fullPage: true });
    await page.goto(`${url}/iframe.html?id=viewer-journeyhierarchy--empty&viewMode=story`);
    await page.getByText("No journeys.", { exact: true }).waitFor();
    assert.deepEqual(errors, []);
  });

  const inspector = (scope) => scope.getByRole("complementary", { name: "Selection inspector" });
  const identity = (scope) => inspector(scope).locator("header code").textContent();
  const first = () => page.getByTestId("interactive-first");
  const second = () => page.getByTestId("interactive-second");
  const prefix = "urn:ujg:solid-oidc:";
  const stateButton = (scope, ref, name) => scope.locator(`[data-state-ref="${ref}"]`).getByRole("button", { name, exact: true });

  await test("compiled viewer selection and keyboard interaction are independent across instances", async () => {
    await page.goto(`${url}/viewer-consumer/`);
    assert.equal(await identity(first()), `${prefix}app-sign-in-required`);
    assert.equal(await identity(second()), `${prefix}app-sign-in-required`);
    const denied = stateButton(first(), `${prefix}app-access-denied`, "Access denied");
    await denied.focus();
    assert.equal(await denied.evaluate((element) => getComputedStyle(element).outlineStyle), "solid");
    await page.keyboard.press("Enter");
    assert.equal(await identity(first()), `${prefix}app-access-denied`);
    assert.equal(await denied.getAttribute("aria-pressed"), "true");
    assert.equal(await identity(second()), `${prefix}app-sign-in-required`);
    await first().getByRole("button", { name: "Inspect App auth journey", exact: true }).click();
    assert.equal(await identity(first()), `${prefix}app-auth-journey`);
    assert.equal(await inspector(first()).getByRole("heading", { name: "States", exact: true }).count(), 1);
    await first().locator(`[data-contract-ref="${prefix}idp-login-entry"]`).getByRole("button").click();
    assert.equal(await identity(first()), `${prefix}idp-login-entry`);
    assert.equal(await inspector(first()).getByRole("heading", { name: "Call sites", exact: true }).count(), 1);
    assert.match(await inspector(first()).textContent(), /app-starts-idp-auth/);
    await first().locator(`[data-contract-ref="${prefix}idp-auth-failed"]`).getByRole("button").click();
    assert.equal(await identity(first()), `${prefix}idp-auth-failed`);
    assert.match(await inspector(first()).textContent(), /app-continues-after-idp-failed/);
    assert.equal(await identity(second()), `${prefix}app-sign-in-required`);
    assert.deepEqual(errors, []);
  });

  await test("disclosure, expand/collapse all, composite selection and reset use immutable snapshots", async () => {
    await page.goto(`${url}/viewer-consumer/`);
    await first().locator(`[data-contract-ref="${prefix}idp-login-entry"]`).getByRole("button").click();
    await first().getByRole("button", { name: "Collapse all", exact: true }).click();
    assert.equal(await first().locator("[data-state-ref]").count(), 10);
    assert.equal(await first().locator(`[data-contract-ref="${prefix}idp-login-entry"]`).count(), 0);
    assert.equal(await identity(first()), `${prefix}idp-login-entry`);
    assert.equal(await second().locator("[data-state-ref]").count(), 47);
    const expand = first().getByRole("button", { name: "Expand Authenticate with identity provider", exact: true });
    await expand.focus();
    await page.keyboard.press("Space");
    assert.equal(await first().locator(`[data-journey-ref="${prefix}idp-auth-journey"]`).count(), 1);
    assert.equal(await first().locator(`[data-journey-ref="${prefix}mfa-challenge-journey"]`).count(), 0);
    await first().getByRole("button", { name: "Collapse Authenticate with identity provider", exact: true }).click();
    assert.equal(await first().locator(`[data-journey-ref="${prefix}idp-auth-journey"]`).count(), 0);
    await stateButton(first(), `${prefix}idp-auth-flow`, "Authenticate with identity provider").click();
    assert.equal(await first().locator(`[data-journey-ref="${prefix}idp-auth-journey"]`).count(), 1);
    assert.equal(await identity(first()), `${prefix}idp-auth-flow`);
    await first().getByRole("button", { name: "Expand all", exact: true }).click();
    assert.equal(await first().locator("[data-state-ref]").count(), 47);
    assert.equal(await identity(first()), `${prefix}idp-auth-flow`);
    await first().getByRole("button", { name: "Reset selection and expansion", exact: true }).click();
    assert.equal(await identity(first()), `${prefix}app-sign-in-required`);
    assert.deepEqual(errors, []);
  });

  await test("same-ID replacement and empty/different documents reset selection and expansion without affecting another viewer", async () => {
    await page.goto(`${url}/viewer-consumer/`);
    await stateButton(first(), `${prefix}app-access-denied`, "Access denied").click();
    await first().getByRole("button", { name: "Collapse all", exact: true }).click();
    await page.getByRole("button", { name: "Replace document with same ID", exact: true }).click();
    assert.equal(await identity(first()), `${prefix}app-sign-in-required`);
    assert.equal(await first().locator("[data-state-ref]").count(), 47);
    await page.getByRole("button", { name: "Load empty document", exact: true }).click();
    assert.equal(await first().getByText("No journeys.", { exact: true }).count(), 1);
    assert.equal(await inspector(first()).getByText("Select a journey, state, entry or exit to inspect it.", { exact: true }).count(), 1);
    assert.equal(await first().locator("[data-state-ref]").count(), 0);
    assert.equal(await identity(second()), `${prefix}app-sign-in-required`);
    await page.getByRole("button", { name: "Load topology document", exact: true }).click();
    assert.equal(await identity(first()), "urn:test:compose");
    assert.equal(await first().locator('[data-journey-ref="urn:test:shared"]').count(), 3);
    await first().getByRole("button", { name: "Collapse Several child journeys", exact: true }).click();
    assert.equal(await first().locator('[data-journey-ref="urn:test:shared"]').count(), 0);
    assert.equal(await first().locator('[data-journey-ref="urn:test:other"]').count(), 0);
    await first().getByRole("button", { name: "Several child journeys", exact: true }).click();
    assert.equal(await first().locator('[data-journey-ref="urn:test:shared"]').count(), 3);
    assert.equal(await first().locator('[data-journey-ref="urn:test:other"]').count(), 1);
    assert.equal(await first().locator('[data-recursive-ref="urn:test:shared"]').count(), 3);
    assert.deepEqual(errors, []);
  });

  await test("interactive source stories and compiled layouts retain responsive boundaries and precise inspection", async () => {
    await page.goto(`${url}/viewer-consumer/`);
    for (const width of [320, 859, 860, 861, 1099, 1100, 1101]) {
      await page.setViewportSize({ width, height: 900 });
      const columns = await first().locator(":scope > div > div").last().evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(" ").length);
      assert.equal(columns, width < 1100 ? 1 : 2, `viewer columns at ${width}`);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false, `viewer overflow at ${width}`);
    }
    await page.setViewportSize({ width: 320, height: 900 });
    await first().screenshot({ path: `${evidence}/stage6-mobile.png` });
    await first().getByRole("button", { name: "Collapse all", exact: true }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${evidence}/stage6-mobile-viewport.png` });
    await inspector(first()).screenshot({ path: `${evidence}/stage6-inspector-mobile.png` });
    await page.setViewportSize({ width: 1280, height: 900 });
    await first().screenshot({ path: `${evidence}/stage6-viewer.png` });
    await first().getByRole("button", { name: "Collapse all", exact: true }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${evidence}/stage6-viewer-viewport.png` });
    await page.goto(`${url}/iframe.html?id=viewer-journeyviewer--document-replacement&viewMode=story`);
    const source = page.locator("#storybook-root");
    await stateButton(source, `${prefix}app-access-denied`, "Access denied").click();
    assert.equal(await identity(source), `${prefix}app-access-denied`);
    await source.getByRole("button", { name: "Replace document with same ID", exact: true }).click();
    assert.equal(await identity(source), `${prefix}app-sign-in-required`);
    assert.deepEqual(errors, []);
  });

  await test("empty-composite notices stay nested and selectable without a meaningless disclosure", async () => {
    await page.goto(`${url}/viewer-consumer/`);
    await page.getByRole("button", { name: "Load empty composites", exact: true }).click();
    await first().getByRole("button", { name: "Collapse all", exact: true }).click();
    for (const [ref, label] of [["empty", "No child references"], ["unresolved", "No resolvable children"]]) {
      const state = first().locator(`[data-state-ref="urn:test:${ref}"]`);
      const notice = state.getByText("No child journeys.", { exact: true });
      assert.equal(await state.getByRole("button").count(), 1);
      assert.equal(await state.locator("[aria-expanded]").count(), 0);
      await state.getByRole("button", { name: label, exact: true }).click();
      assert.equal(await identity(first()), `urn:test:${ref}`);
      assert.equal(await notice.evaluate((element) => {
        const nested = element.parentElement.parentElement;
        return parseFloat(getComputedStyle(nested).marginInlineStart) > 0
          && nested.parentElement.parentElement.hasAttribute("data-state-ref");
      }), true);
    }
    assert.equal(await first().getByText("No child journeys.", { exact: true }).count(), 2);
    assert.equal(await first().locator('[data-state-ref="urn:test:leaf"]').getByText("No child journeys.", { exact: true }).count(), 0);
    for (const width of [320, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
      await first().screenshot({ path: `${evidence}/stage6-empty-composites-${width}.png` });
    }
    assert.equal(await identity(second()), `${prefix}app-sign-in-required`);
    assert.deepEqual(errors, []);
  });
} finally {
  await browser?.close();
  await new Promise((done) => server.close(done));
}
