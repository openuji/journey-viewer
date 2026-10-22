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
    const content = await readFile(path);
    response.writeHead(200, { "content-type": types[extname(path)] ?? "application/octet-stream" }).end(content);
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
    assert.equal(stories.filter((entry) => entry.title.startsWith("Design system/")).length, 51);
    assert.equal(stories.filter((entry) => entry.title.startsWith("Viewer/")).length, 29);
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
    await first().getByRole("button", { name: "Reset view", exact: true }).click();
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

  await test("search supports native keyboard picking/clearing, no matches, whitespace and instance isolation", async () => {
    await page.goto(`${url}/viewer-consumer/`);
    const search = first().getByRole("searchbox", { name: "Search the graph", exact: true });
    await search.focus();
    assert.equal(await search.evaluate((element) => getComputedStyle(element).outlineStyle), "solid");
    await search.fill("no such item");
    await first().getByText("No matches.", { exact: true }).waitFor();
    await search.press("Escape");
    assert.equal(await search.inputValue(), "");
    await search.fill("   ");
    assert.equal(await first().getByRole("list", { name: "Search results" }).count(), 0);
    await search.fill("SMS");
    const results = first().getByRole("list", { name: "Search results" });
    assert.ok(await results.getByRole("button").count() >= 2);
    await search.fill("sms-verification-journey");
    await search.press("Enter");
    assert.equal(await search.inputValue(), "");
    assert.equal(await identity(first()), `${prefix}sms-verification-journey`);
    assert.equal(await identity(second()), `${prefix}app-sign-in-required`);
    assert.equal(await second().getByRole("searchbox").inputValue(), "");
    const crumbs = first().getByRole("navigation", { name: "Selection breadcrumbs" });
    assert.equal(await crumbs.getByRole("listitem").count(), 4);
    await first().getByRole("button", { name: "Focus selected scope", exact: true }).click();
    assert.equal(await first().getByRole("group", { name: "Focused journey path" }).locator("[data-journey-ref]").count(), 4);
    assert.deepEqual(errors, []);
  });

  await test("row, breadcrumb, inspector and focus navigation retain a query; clicking a search result clears it", async () => {
    await page.goto(`${url}/viewer-consumer/`);
    const search = first().getByRole("searchbox");
    await search.fill("SMS");
    await stateButton(first(), `${prefix}app-access-denied`, "Access denied").click();
    assert.equal(await search.inputValue(), "SMS");
    const crumbs = first().getByRole("navigation", { name: "Selection breadcrumbs" });
    await crumbs.getByRole("button", { name: "App auth journey", exact: true }).click();
    assert.equal(await search.inputValue(), "SMS");
    await inspector(first()).getByRole("navigation", { name: "Related items" })
      .getByRole("button", { name: /^State: Sign-in required/ }).click();
    assert.equal(await search.inputValue(), "SMS");
    await first().getByRole("button", { name: "Focus IdP auth journey", exact: true }).click();
    assert.equal(await search.inputValue(), "SMS");
    await first().getByRole("list", { name: "Search results" }).getByRole("button").first().click();
    assert.equal(await search.inputValue(), "");
    assert.equal(await identity(first()), `${prefix}mfa-sms-message`);
    assert.equal(await second().getByRole("searchbox").inputValue(), "");
    assert.deepEqual(errors, []);
  });

  await test("equal touchpoint labels, bounded results and repeated references remain distinguishable with unresolved refs", async () => {
    await page.goto(`${url}/viewer-consumer/`);
    await page.getByRole("button", { name: "Load navigation review", exact: true }).click();
    const filters = first().getByRole("group", { name: "Touchpoint filter" });
    const web = filters.getByRole("button", { name: "Web (urn:test:web)", exact: true });
    const phone = filters.getByRole("button", { name: "Web (urn:test:phone)", exact: true });
    assert.equal(await web.count(), 1);
    assert.equal(await phone.count(), 1);
    assert.equal(await filters.getByRole("button", { name: "Web", exact: true }).count(), 0);
    await web.click();
    assert.match(await filters.textContent(), /1 of 6 journeys match/);
    assert.equal(await phone.getAttribute("aria-pressed"), "false");
    await phone.click();
    assert.match(await filters.textContent(), /2 of 6 journeys match/);
    await web.click();
    await phone.click();
    const search = first().getByRole("searchbox");
    await search.fill("urn:test:");
    const results = first().getByRole("list", { name: "Search results" });
    assert.equal(await results.getByRole("button").count(), 18);
    await first().getByText("Showing first 18 matches. Refine your search to narrow the results.", { exact: true }).waitFor();
    await search.fill("urn:test:shared");
    const matches = results.getByRole("button");
    assert.equal(await matches.count(), 3);
    assert.match(await matches.nth(0).textContent(), /reference 1 of 2/);
    assert.match(await matches.nth(1).textContent(), /reference 2 of 2/);
    assert.doesNotMatch(await matches.nth(2).textContent(), /reference \d|state \d|child \d/);
    for (const width of [320, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
      await filters.screenshot({ path: `${evidence}/stage7-review-filters-${width}.png` });
      await results.screenshot({ path: `${evidence}/stage7-review-contexts-${width}.png` });
    }
    await matches.nth(1).click();
    const selectedOccurrence = first().locator('[data-journey-ref="urn:test:shared"]').nth(1);
    await selectedOccurrence.getByRole("button", { name: "Recurse here", exact: true }).click();
    const logicalMatches = first().locator('[data-state-ref="urn:test:repeat"]').getByRole("button", { name: "Recurse here", exact: true });
    assert.equal(await logicalMatches.count(), 3);
    assert.equal(await logicalMatches.evaluateAll((buttons) => buttons.every((button) => button.getAttribute("aria-pressed") === "true")), true);
    const crumbs = first().getByRole("navigation", { name: "Selection breadcrumbs" });
    assert.match(await crumbs.textContent(), /reference 2 of 2/);
    await first().getByRole("button", { name: "Focus selected scope", exact: true }).click();
    const lanes = first().getByRole("group", { name: "Focused journey path" });
    await lanes.getByRole("button", { name: "Open Repeated child (reference 1 of 2)", exact: true }).waitFor();
    await lanes.getByRole("button", { name: "Open Repeated child (reference 2 of 2)", exact: true }).waitFor();
    await lanes.getByRole("button", { name: "Open Other child", exact: true }).waitFor();
    assert.doesNotMatch(await lanes.textContent(), /state \d|child \d/);
    assert.deepEqual(errors, []);
  });

  await test("focus and breadcrumbs distinguish repeated child occurrences and explicit rootless starting points", async () => {
    await page.goto(`${url}/viewer-consumer/`);
    await page.getByRole("button", { name: "Load topology document", exact: true }).click();
    const search = first().getByRole("searchbox");
    await search.fill("urn:test:shared");
    const results = first().getByRole("list", { name: "Search results" }).getByRole("button");
    assert.equal(await results.count(), 3);
    await results.nth(1).click();
    const crumbs = first().getByRole("navigation", { name: "Selection breadcrumbs" });
    assert.match(await crumbs.textContent(), /reference 2 of 2/);
    await first().getByRole("button", { name: "Focus selected scope", exact: true }).click();
    const lanes = first().getByRole("group", { name: "Focused journey path" });
    assert.deepEqual(await lanes.locator("[data-journey-ref]").evaluateAll((elements) => elements.map((element) => element.getAttribute("data-journey-ref"))), ["urn:test:first", "urn:test:shared"]);
    assert.equal(await lanes.getByText("Recursive journey reference: Repeated child", { exact: true }).count(), 1);
    assert.equal(await lanes.locator("[aria-expanded]").count(), 0, "focus offers explicit child links instead of tree disclosures");
    await lanes.getByRole("button", { name: "Open Other child", exact: true }).click();
    assert.equal(await identity(first()), "urn:test:other");
    assert.match(await crumbs.textContent(), /Other child/);
    assert.doesNotMatch(await crumbs.textContent(), /reference \d|state \d|child \d/);
    await crumbs.getByRole("button", { name: "First root", exact: true }).click();
    assert.equal(await lanes.locator("[data-journey-ref]").count(), 1);
    await first().getByRole("button", { name: "Overview", exact: true }).click();
    assert.equal(await first().locator('[data-journey-ref="urn:test:shared"]').count(), 3);
    await search.fill("urn:test:cycle-b");
    const cycles = first().getByRole("list", { name: "Search results" }).getByRole("button");
    assert.equal(await cycles.count(), 4, "journey and composite-state ID searches are literal substring matches");
    await cycles.last().click();
    await first().getByRole("button", { name: "Focus selected scope", exact: true }).click();
    assert.equal(await first().getByRole("navigation", { name: "Selection breadcrumbs" }).getByRole("listitem").count(), 1);
    assert.deepEqual(errors, []);
  });

  await test("touchpoint filtering preserves nested boundaries and matching children stay undimmed", async () => {
    await page.goto(`${url}/viewer-consumer/`);
    const filters = first().getByRole("group", { name: "Touchpoint filter" });
    const smsFilter = filters.getByRole("button", { name: "SMS channel touchpoint", exact: true });
    await smsFilter.click();
    assert.equal(await smsFilter.getAttribute("aria-pressed"), "true");
    assert.match(await filters.textContent(), /1 of 10 journeys match/);
    assert.equal(await first().locator("[data-journey-ref]").count(), 10);
    const smsState = first().locator(`[data-state-ref="${prefix}mfa-sms-message-presented"]`);
    assert.equal(await smsState.locator("[data-filtered]").count(), 0);
    assert.equal(await smsState.evaluate((element) => {
      for (let current = element; current; current = current.parentElement) if (Number(getComputedStyle(current).opacity) < 1) return false;
      return true;
    }), true, "a filtered ancestor must not dim a matching descendant");
    const appState = first().locator(`[data-state-ref="${prefix}app-sign-in-required"]`);
    assert.equal(await appState.locator("[data-filtered]").count(), 1);
    assert.equal(await second().locator("[data-filtered]").count(), 0);
    await first().getByRole("searchbox").fill("App auth");
    await first().getByText("No matches.", { exact: true }).waitFor();
    await filters.getByRole("button", { name: "App touchpoint", exact: true }).click();
    assert.match(await filters.textContent(), /2 of 10 journeys match/);
    assert.equal(await first().getByRole("list", { name: "Search results" }).getByRole("button").count(), 2);
    await first().getByRole("button", { name: "Reset view", exact: true }).click();
    assert.equal(await first().locator("[data-filtered]").count(), 0);
    assert.equal(await first().getByRole("searchbox").inputValue(), "");
    assert.deepEqual(errors, []);
  });

  await test("inspector buttons navigate explicit child entries, entry starts and parent exit continuations", async () => {
    await page.goto(`${url}/viewer-consumer/`);
    const related = () => inspector(first()).getByRole("navigation", { name: "Related items" });
    await related().getByRole("button", { name: /^Enter child: Start at login/ }).click();
    assert.equal(await identity(first()), `${prefix}idp-login-entry`);
    await related().getByRole("button", { name: /^Starts at: Login/ }).click();
    assert.equal(await identity(first()), `${prefix}idp-login`);
    await first().locator(`[data-contract-ref="${prefix}idp-auth-failed"]`).getByRole("button").click();
    await related().getByRole("button", { name: /^Parent continuation · Continue after failed login/ }).click();
    assert.equal(await identity(first()), `${prefix}app-login-error`);
    assert.equal(await first().getByRole("navigation", { name: "Selection breadcrumbs" }).getByRole("listitem").count(), 1);
    assert.deepEqual(errors, []);
  });

  await test("hover-derived highlights take precedence and document replacement resets all navigation", async () => {
    await page.goto(`${url}/viewer-consumer/`);
    const initial = first().locator(`[data-state-ref="${prefix}app-sign-in-required"]`);
    const composite = first().locator(`[data-state-ref="${prefix}idp-auth-flow"]`);
    await stateButton(first(), `${prefix}app-sign-in-required`, "Sign-in required").hover();
    assert.equal(await composite.locator(":scope > div > div[data-relation]").getAttribute("data-relation"), "outgoing");
    await stateButton(first(), `${prefix}idp-auth-flow`, "Authenticate with identity provider").hover();
    assert.equal(await initial.locator("[data-relation]").getAttribute("data-relation"), "incoming");
    await first().getByRole("searchbox").hover();
    assert.equal(await initial.locator("[data-relation]").count(), 0);
    await first().getByRole("button", { name: "Focus selected scope", exact: true }).click();
    await first().getByRole("group", { name: "Touchpoint filter" }).getByRole("button").first().click();
    await first().getByRole("searchbox").fill("SMS");
    await page.getByRole("button", { name: "Replace document with same ID", exact: true }).click();
    assert.equal(await first().getByRole("button", { name: "Overview", exact: true }).getAttribute("aria-pressed"), "true");
    assert.equal(await first().getByRole("searchbox").inputValue(), "");
    assert.equal(await first().locator("[data-filtered]").count(), 0);
    assert.equal(await identity(first()), `${prefix}app-sign-in-required`);
    await page.getByRole("button", { name: "Load empty document", exact: true }).click();
    assert.equal(await first().getByRole("button", { name: "Focus selected scope", exact: true }).isDisabled(), true);
    await first().getByText("No selected scope.", { exact: true }).waitFor();
    assert.deepEqual(errors, []);
  });

  await test("navigation, focused columns and search results fit mobile and shared breakpoint boundaries", async () => {
    await page.goto(`${url}/viewer-consumer/`);
    await first().getByRole("searchbox").fill("sms-verification-journey");
    await first().getByRole("searchbox").press("Enter");
    await first().getByRole("button", { name: "Focus selected scope", exact: true }).click();
    for (const width of [320, 859, 860, 861, 1099, 1100, 1101]) {
      await page.setViewportSize({ width, height: 900 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false, `focus overflow at ${width}`);
    }
    for (const width of [320, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      await first().getByRole("searchbox").scrollIntoViewIfNeeded();
      await page.screenshot({ path: `${evidence}/stage7-navigation-${width}.png` });
      await first().getByRole("group", { name: "Focused journey path" }).locator("[data-journey-ref]").last().scrollIntoViewIfNeeded();
      await first().getByRole("group", { name: "Focused journey path" }).screenshot({ path: `${evidence}/stage7-focus-${width}.png` });
    }
    await first().getByRole("searchbox").fill("SMS");
    await page.setViewportSize({ width: 320, height: 900 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
    await first().getByRole("list", { name: "Search results" }).screenshot({ path: `${evidence}/stage7-search-320.png` });
    assert.deepEqual(errors, []);
  });

  const screensFirst = () => page.getByTestId("screens-first");
  const screensSecond = () => page.getByTestId("screens-second");
  const lightbox = () => page.getByRole("dialog", { name: "Screenshot viewer", exact: true });
  const firstSurface = `${prefix}app-sign-in-required-surface`;
  const openInitialScreen = async () => {
    const button = screensFirst().locator(`[data-state-ref="${prefix}app-sign-in-required"]`).getByRole("button", { name: /^Open screenshot:/ });
    await button.focus();
    await button.press("Enter");
    await lightbox().waitFor();
    return button;
  };
  const readyImage = async () => {
    await lightbox().locator('[data-image-status="ready"]').waitFor();
    assert.equal(await lightbox().getByRole("img").evaluate((element) => element.complete && element.naturalWidth > 0), true);
  };
  const imageFits = async (scope) => {
    assert.equal(await scope.getByRole("img").evaluate((element) => {
      const image = element.getBoundingClientRect();
      const frame = element.parentElement.getBoundingClientRect();
      return getComputedStyle(element).objectFit === "contain" && image.left >= frame.left && image.top >= frame.top
        && image.right <= frame.right + 1 && image.bottom <= frame.bottom + 1;
    }), true, "the complete image fits its bounded frame");
  };
  // Simulate a caller input update while native modality makes the outer controls inert.
  const replaceFromCaller = async (name) => page.getByRole("button", { name, exact: true, includeHidden: true })
    .evaluate((element) => element.dispatchEvent(new MouseEvent("click", { bubbles: true })));

  await test("all 37 mapped OIDC PNGs load, source-ordered lightbox navigation wraps and Escape restores keyboard focus", async () => {
    await page.goto(`${url}/viewer-consumer/`);
    assert.equal(await screensFirst().getByRole("button", { name: /^Open screenshot:/ }).count(), 38, "37 row controls and the selection preview");
    const mapping = await (await fetch(`${url}/solid-oidc/screenshots.json`)).json();
    const baseline = await (await fetch(`${url}/solid-oidc/baseline.json`)).json();
    for (const record of baseline.screens) {
      const response = await fetch(new URL(mapping[record.surfaceRef], `${url}/solid-oidc/`));
      assert.equal(response.status, 200, record.surfaceRef);
      assert.match(response.headers.get("content-type"), /image\/png/);
    }
    const opener = await openInitialScreen();
    await readyImage();
    assert.equal(await lightbox().evaluate((element) => element.matches(":modal")), true);
    const visited = [];
    for (const [index, record] of baseline.screens.entries()) {
      await readyImage();
      assert.equal(await lightbox().locator("header code").textContent(), record.surfaceRef);
      assert.equal(await lightbox().getByRole("img").getAttribute("src"), new URL(mapping[record.surfaceRef], `${url}/solid-oidc/`).href);
      assert.equal(await screensFirst().locator('aside[aria-label="Selection inspector"] header code').textContent(), record.graphNodeRef);
      await lightbox().getByText(`${index + 1} / 37`, { exact: true }).waitFor();
      visited.push(record.surfaceRef);
      await lightbox().getByRole("button", { name: "Next screen", exact: true }).click();
    }
    assert.equal(new Set(visited).size, 37);
    assert.equal(await lightbox().locator("header code").textContent(), firstSurface);
    await lightbox().press("ArrowLeft");
    assert.equal(await lightbox().locator("header code").textContent(), `${prefix}pod-support-surface`);
    await lightbox().press("ArrowRight");
    assert.equal(await lightbox().locator("header code").textContent(), firstSurface);
    for (let count = 0; count < 8; count += 1) {
      await page.keyboard.press("Tab");
      assert.equal(await lightbox().evaluate((element) => element.contains(element.ownerDocument.activeElement)), true);
    }
    await lightbox().getByRole("button", { name: "Close screenshot", exact: true }).focus();
    await page.keyboard.press("Shift+Tab");
    assert.equal(await lightbox().getByRole("button", { name: "Next screen", exact: true }).evaluate((element) => element === element.ownerDocument.activeElement), true);
    await page.keyboard.press("Escape");
    assert.equal(await lightbox().count(), 0);
    assert.equal(await opener.evaluate((element) => element === element.ownerDocument.activeElement), true);
    assert.deepEqual(errors, []);
  });

  await test("live screenshot map/path replacement preserves interaction, updates an open image and keeps instances independent", async () => {
    await page.goto(`${url}/viewer-consumer/`);
    const scope = screensFirst();
    await scope.getByRole("button", { name: "Collapse all", exact: true }).click();
    await scope.getByRole("button", { name: "Focus selected scope", exact: true }).click();
    await scope.getByRole("group", { name: "Touchpoint filter" }).getByRole("button", { name: "App", exact: true }).click();
    await scope.getByRole("searchbox").fill("keep this query");
    await openInitialScreen();
    await readyImage();
    const previousSource = await lightbox().getByRole("img").getAttribute("src");
    await replaceFromCaller("Replace first screenshot path");
    await lightbox().locator('img[src$="app-logged-in.png?revision=2"]').waitFor();
    await readyImage();
    assert.equal(await lightbox().locator("header code").textContent(), firstSurface);
    assert.notEqual(await lightbox().getByRole("img").getAttribute("src"), previousSource);
    assert.equal(await scope.locator('input[type="search"]').inputValue(), "keep this query");
    assert.equal(await scope.locator(`[data-touchpoint-ref="${prefix}app"]`).getAttribute("aria-pressed"), "true");
    assert.equal(await scope.locator('[aria-label="Focused journey path"] [data-journey-ref]').count(), 1);
    assert.equal(await screensSecond().locator('aside[aria-label="Selection inspector"] header code').textContent(), `${prefix}app-sign-in-required`);
    assert.equal(await screensSecond().locator('[aria-label="Screenshot previews"] img').getAttribute("src"), previousSource);
    await replaceFromCaller("Remove first screenshot mapping");
    await lightbox().getByText("Screenshot unavailable.", { exact: true }).waitFor();
    assert.equal(await lightbox().locator("img").count(), 0, "removed mappings never display a stale image");
    await replaceFromCaller("Restore screenshot map");
    await readyImage();
    assert.equal(await lightbox().getByRole("img").getAttribute("src"), previousSource);
    await replaceFromCaller("Clear screenshot map");
    await lightbox().getByText("Screenshot unavailable.", { exact: true }).waitFor();
    assert.equal(await lightbox().getByRole("button", { name: "Next screen", exact: true }).isDisabled(), true);
    await lightbox().press("ArrowRight");
    assert.equal(await lightbox().locator("header code").textContent(), firstSurface);
    await lightbox().getByRole("button", { name: "Close screenshot", exact: true }).click();
    assert.equal(await scope.getByRole("button", { name: "Overview", exact: true }).evaluate((element) => element === element.ownerDocument.activeElement), true);
    assert.equal(await scope.getByRole("searchbox").inputValue(), "keep this query");
    await scope.getByRole("button", { name: "Overview", exact: true }).click();
    assert.equal(await scope.locator('[data-journey-ref]').count(), 1, "mapping updates preserve collapsed child groups");
    assert.deepEqual(errors, []);
  });

  await test("image errors are explicit and recover after URL replacement; same-ID UJG replacement resets modal state", async () => {
    await page.goto(`${url}/viewer-consumer/`);
    await openInitialScreen();
    await readyImage();
    await replaceFromCaller("Use missing screenshot file");
    await lightbox().getByText("Screenshot unavailable.", { exact: true }).waitFor();
    assert.equal(await lightbox().locator("img").count(), 0);
    await lightbox().press("ArrowRight");
    await readyImage();
    assert.equal(await lightbox().locator("header code").textContent(), `${prefix}app-auth-callback-processing-surface`);
    await replaceFromCaller("Restore screenshot map");
    await lightbox().press("ArrowLeft");
    await readyImage();
    assert.equal(await lightbox().locator("header code").textContent(), firstSurface);
    await replaceFromCaller("Replace screenshot viewer document");
    assert.equal(await lightbox().count(), 0);
    assert.equal(await screensFirst().getByRole("searchbox").inputValue(), "");
    assert.equal(await screensFirst().getByRole("button", { name: "Overview", exact: true }).getAttribute("aria-pressed"), "true");
    assert.equal(await screensFirst().locator('aside[aria-label="Selection inspector"] header code').textContent(), `${prefix}app-sign-in-required`);
    assert.deepEqual(errors, []);
  });

  await test("hover/selection previews, search availability and touchpoint presentation use the supplied inputs", async () => {
    await page.goto(`${url}/viewer-consumer/`);
    const scope = screensFirst();
    const preview = scope.getByRole("group", { name: "Screenshot previews" });
    const initialUrl = await preview.locator("img").getAttribute("src");
    await stateButton(scope, `${prefix}app-logged-in`, "Logged in").hover();
    assert.match(await preview.locator("img").getAttribute("src"), /app-logged-in\.png$/);
    await scope.getByRole("searchbox").hover();
    assert.equal(await preview.locator("img").getAttribute("src"), initialUrl);
    await scope.getByRole("searchbox").fill("app-sign-in-required");
    await scope.getByRole("list", { name: "Search results" }).getByText("Screenshot", { exact: true }).waitFor();
    await page.getByRole("button", { name: "Remove first screenshot mapping", exact: true }).click();
    assert.equal(await scope.getByRole("list", { name: "Search results" }).getByText("Screenshot", { exact: true }).count(), 0);
    assert.equal(await preview.getByRole("button", { name: /^Open screenshot:/ }).isDisabled(), true);
    const appFilter = scope.locator(`[data-touchpoint-ref="${prefix}app"]`);
    assert.equal(await appFilter.textContent(), "App");
    const dot = appFilter.locator('[aria-hidden="true"]');
    assert.equal(await dot.evaluate((element) => getComputedStyle(element).backgroundColor), "rgb(227, 138, 82)");
    assert.equal(await scope.getByRole("heading", { name: "App auth journey", exact: true }).count(), 1);
    assert.deepEqual(errors, []);
  });

  await test("multiple surfaces preserve composite disclosure and reused views show distinct call-site counters", async () => {
    await page.goto(`${url}/iframe.html?id=viewer-journeyviewer--several-surfaces&viewMode=story`);
    const scope = page.locator("#storybook-root");
    await scope.getByRole("button", { name: "Collapse all", exact: true }).click();
    await scope.locator('[data-state-ref="urn:composite"]').getByRole("button", { name: /Open screenshot:.*opaque:11/ }).click();
    await readyImage();
    assert.equal(await lightbox().locator("header code").textContent(), "opaque:11");
    await lightbox().press("Escape");
    assert.equal(await scope.locator('[data-journey-ref="urn:child"]').count(), 0);
    const leaf = scope.locator('[data-state-ref="urn:leaf"]');
    assert.equal(await leaf.getByRole("button", { name: /^Open screenshot:/ }).count(), 2);
    await leaf.getByRole("button", { name: /opaque:9/ }).click();
    await readyImage();
    assert.equal(await lightbox().locator("header code").textContent(), "opaque:9");
    await lightbox().press("Escape");
    assert.equal(await scope.locator('[data-journey-ref="urn:child"]').count(), 0);
    await scope.getByRole("button", { name: "Call shared", exact: true }).click();
    assert.equal(await scope.locator('[data-journey-ref="urn:child"]').count(), 3);
    const shared = scope.locator('[data-journey-ref="urn:child"]').nth(1).getByRole("button", { name: /^Open screenshot:/ });
    await shared.click();
    await readyImage();
    assert.match(await lightbox().textContent(), /reference 2 of 2/);
    await lightbox().getByText("5 / 6 views · 2 of 3 call sites", { exact: true }).waitFor();
    const sharedSource = await lightbox().getByRole("img").getAttribute("src");
    for (const width of [320, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
      assert.equal(await lightbox().evaluate((element) => element.scrollWidth > element.clientWidth + 1), false);
      await lightbox().screenshot({ path: `${evidence}/stage8-review-call-sites-${width}.png` });
    }
    await lightbox().press("ArrowRight");
    await readyImage();
    await lightbox().getByText("6 / 6 views · 3 of 3 call sites", { exact: true }).waitFor();
    assert.equal(await lightbox().getByRole("img").getAttribute("src"), sharedSource);
    assert.match(await lightbox().textContent(), /Other parent/);
    await lightbox().press("ArrowRight");
    await lightbox().getByText("1 / 6 views", { exact: true }).waitFor();
    await lightbox().press("ArrowLeft");
    await lightbox().getByText("6 / 6 views · 3 of 3 call sites", { exact: true }).waitFor();
    assert.deepEqual(errors, []);
    await lightbox().press("Escape");
  });

  await test("screen previews and lightbox fit mobile and shared thresholds with native focus and compiled styles", async () => {
    await page.goto(`${url}/viewer-consumer/`);
    await openInitialScreen();
    await readyImage();
    for (const width of [320, 859, 860, 861, 1099, 1100, 1101, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false, `screens overflow at ${width}`);
      const bounds = await lightbox().evaluate((element) => {
        const box = element.getBoundingClientRect();
        return { left: box.left, right: box.right, top: box.top, bottom: box.bottom, overflow: element.scrollWidth > element.clientWidth + 1 };
      });
      assert.ok(bounds.left >= 0 && bounds.right <= width + 1 && bounds.top >= 0 && bounds.bottom <= 901, `dialog bounds at ${width}`);
      assert.equal(bounds.overflow, false);
      await imageFits(lightbox());
      if (width === 320 || width === 1280) await lightbox().screenshot({ path: `${evidence}/stage8-lightbox-${width}.png` });
    }
    await lightbox().press("Escape");
    for (const width of [320, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      await screensFirst().getByRole("searchbox").hover();
      const preview = screensFirst().getByRole("group", { name: "Screenshot previews" });
      await preview.scrollIntoViewIfNeeded();
      await preview.locator('[data-image-status="ready"]').waitFor();
      await imageFits(preview);
      await preview.screenshot({ path: `${evidence}/stage8-preview-${width}.png` });
      await screensFirst().getByRole("group", { name: "Touchpoint filter" }).screenshot({ path: `${evidence}/stage8-touchpoints-${width}.png` });
    }
    assert.deepEqual(errors, []);
  });
  const extensionsFirst = () => page.getByTestId("extensions-first");
  const extensionsSecond = () => page.getByTestId("extensions-second");
  const extensionState = () => extensionsFirst().evaluate((element) => ({
    identity: element.querySelector('aside[aria-label="Selection inspector"] header code')?.textContent,
    query: element.querySelector('input[type="search"]')?.value,
    breadcrumbs: element.querySelector('nav[aria-label="Selection breadcrumbs"]')?.textContent,
    focus: element.querySelector('[aria-label="Focused journey path"]') !== null,
    journeys: [...element.querySelectorAll("[data-journey-ref]")].map((node) => node.getAttribute("data-journey-ref")),
    disclosure: [...element.querySelectorAll("button[aria-expanded]")].map((node) => node.getAttribute("aria-expanded")),
    filters: [...element.querySelectorAll("button[data-touchpoint-ref]")].map((node) => node.getAttribute("aria-pressed")),
  }));

  await test("compiled descriptors add panels/annotations and override rows while retaining native controls and children", async () => {
    await page.goto(`${url}/viewer-consumer/`);
    const scope = extensionsFirst();
    await inspector(scope).getByRole("heading", { name: "Source note", exact: true }).waitFor();
    assert.equal(await scope.getByText("Review nested boundary", { exact: true }).count(), 2);
    assert.equal(await scope.getByRole("list", { name: "Annotations", exact: true }).count(), 0);
    assert.match(await inspector(scope).ariaSnapshot(), /Review nested boundary/);
    assert.equal(await scope.getByText("Custom boundary presentation", { exact: true }).count(), 1);
    assert.equal(await inspector(scope).getByRole("heading", { name: "Incoming transitions", exact: true }).count(), 1);
    assert.equal(await scope.locator('[data-journey-ref="urn:test:shared"]').count(), 3);
    assert.equal(await extensionsSecond().getByText("Review nested boundary", { exact: true }).count(), 0);
    assert.equal(await inspector(extensionsSecond()).getByRole("heading", { name: "Source note", exact: true }).count(), 0);
    const state = scope.locator('[data-state-ref="urn:test:compose"]');
    await state.getByRole("button", { name: "Collapse Several child journeys", exact: true }).focus();
    await page.keyboard.press("Space");
    assert.equal(await scope.locator('[data-journey-ref="urn:test:shared"]').count(), 0);
    await page.getByRole("button", { name: "Toggle example extensions", exact: true }).click();
    assert.equal(await scope.locator('[data-journey-ref="urn:test:shared"]').count(), 0);
    await page.getByRole("button", { name: "Toggle example extensions", exact: true }).click();
    assert.equal(await scope.locator('[data-journey-ref="urn:test:shared"]').count(), 0);
    const row = state.getByRole("button", { name: /^Several child journeys Custom boundary presentation$/ });
    await row.focus();
    await page.keyboard.press("Enter");
    assert.equal(await identity(scope), "urn:test:compose");
    assert.equal(await scope.locator('[data-journey-ref="urn:test:shared"]').count(), 3);
    await scope.getByRole("button", { name: "Inspect First root", exact: true }).click();
    assert.equal(await identity(scope), "urn:test:first");
    assert.equal(await inspector(scope).getByRole("heading", { name: "Source note", exact: true }).count(), 1);
    await scope.getByRole("button", { name: /^Begin first root/ }).click();
    assert.equal(await identity(scope), "urn:test:entry");
    await scope.getByRole("button", { name: "Finish first root", exact: true }).click();
    assert.equal(await identity(scope), "urn:test:exit");
    assert.match(await inspector(scope).textContent(), /This exit is read directly from/);
    assert.deepEqual(errors, []);
  });

  await test("descriptor replacement/removal preserves repeated occurrence, focus, query, filters and disclosure in one instance", async () => {
    await page.goto(`${url}/viewer-consumer/`);
    const scope = extensionsFirst();
    await scope.locator('[data-journey-ref="urn:test:shared"]').nth(1).getByRole("button", { name: "Recurse here", exact: true }).click();
    await scope.getByRole("button", { name: "Focus selected scope", exact: true }).click();
    await scope.getByRole("searchbox").fill("Recurse");
    await scope.getByRole("group", { name: "Touchpoint filter" }).getByRole("button", { name: "Web", exact: true }).click();
    const active = await extensionState();
    assert.equal(active.identity, "urn:test:repeat");
    assert.equal(active.focus, true);
    assert.deepEqual(active.filters, ["true", "false"]);
    assert.match(active.breadcrumbs, /reference 2 of 2/);
    await page.getByRole("button", { name: "Replace example extensions", exact: true }).click();
    assert.deepEqual(await extensionState(), active);
    assert.equal(await scope.getByText("Review nested boundary", { exact: true }).count(), 0);
    assert.equal(await scope.getByText("Custom boundary presentation", { exact: true }).count(), 1);
    await page.getByRole("button", { name: "Toggle example extensions", exact: true }).click();
    assert.deepEqual(await extensionState(), active);
    assert.equal(await scope.getByText("Custom boundary presentation", { exact: true }).count(), 0);
    assert.equal(await inspector(scope).getByRole("heading", { name: "Source note", exact: true }).count(), 0);
    assert.equal(await scope.getByRole("button", { name: "Several child journeys", exact: true }).count(), 1);
    assert.equal(await identity(extensionsSecond()), "urn:test:compose");
    assert.equal(await extensionsSecond().getByRole("searchbox").inputValue(), "");
    await page.getByRole("button", { name: "Toggle example extensions", exact: true }).click();
    assert.deepEqual(await extensionState(), active);
    await page.getByRole("button", { name: "Replace extension viewer document", exact: true }).click();
    assert.equal(await identity(scope), "urn:test:compose");
    assert.equal(await scope.getByRole("searchbox").inputValue(), "");
    assert.equal(await scope.getByRole("group", { name: "Focused journey path" }).count(), 0);
    assert.equal(await inspector(scope).getByRole("heading", { name: "Source note", exact: true }).count(), 1);
    assert.deepEqual(errors, []);
  });

  await test("extension content fits mobile and shared thresholds and restores the default presentation on removal", async () => {
    await page.goto(`${url}/iframe.html?id=viewer-journeyviewer--removable-extensions&viewMode=story`);
    await page.getByRole("heading", { name: "Source note", exact: true }).waitFor();
    for (const width of [320, 859, 860, 861, 1099, 1100, 1101, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false, `extensions overflow at ${width}`);
      if (width === 320 || width === 1280) {
        await page.getByRole("button", { name: "Toggle example extensions", exact: true }).scrollIntoViewIfNeeded();
        await page.screenshot({ path: `${evidence}/stage9-extensions-${width}.png` });
        await page.getByRole("complementary", { name: "Selection inspector" }).screenshot({ path: `${evidence}/stage9-panel-${width}.png` });
      }
    }
    await page.getByRole("button", { name: "Toggle example extensions", exact: true }).click();
    assert.equal(await page.getByText("Custom boundary presentation", { exact: true }).count(), 0);
    assert.equal(await page.getByText("Review nested boundary", { exact: true }).count(), 0);
    assert.equal(await page.getByRole("heading", { name: "Source note", exact: true }).count(), 0);
    assert.equal(await page.locator('[data-journey-ref="urn:test:shared"]').count(), 3);
    assert.deepEqual(errors, []);
  });
} finally {
  await browser?.close();
  await new Promise((done) => server.close(done));
}
