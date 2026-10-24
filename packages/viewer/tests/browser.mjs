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
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
};
const server = createServer(async (request, response) => {
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
  const url = `http://127.0.0.1:${server.address().port}`;
  await page.goto(`${url}/viewer-consumer/`);
  const oidc = page.getByTestId("oidc");
  await oidc
    .getByRole("heading", { name: "App auth journey", exact: true })
    .waitFor();

  await test("compiled consumer preserves the OIDC baseline and each journey's explicit display order", async () => {
    assert.equal(await oidc.locator("[data-journey-ref]").count(), 10);
    assert.equal(await oidc.locator("[data-state-ref]").count(), 47);
    assert.equal(
      await oidc.locator('[data-contract-kind="entry"]').count(),
      20,
    );
    assert.equal(await oidc.locator('[data-contract-kind="exit"]').count(), 24);
    const document = JSON.parse(
      await readFile(
        new URL(
          "../../../examples/solid-oidc/solid-oidc.ujg.jsonld",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    for (const journey of document.nodes.filter(
      (node) => node["@type"] === "Journey",
    )) {
      const branch = oidc.locator(`[data-journey-ref="${journey["@id"]}"]`);
      const actual = await branch.evaluate((element) => {
        const own = (selector, attribute) =>
          [...element.querySelectorAll(selector)]
            .filter((child) => child.closest("[data-journey-ref]") === element)
            .map((child) => child.getAttribute(attribute));
        return {
          states: own("[data-state-ref]", "data-state-ref"),
          entries: own('[data-contract-kind="entry"]', "data-contract-ref"),
          exits: own('[data-contract-kind="exit"]', "data-contract-ref"),
        };
      });
      assert.deepEqual(actual, {
        states: journey.stateRefs,
        entries: journey.entryRefs,
        exits: journey.exitRefs ?? [],
      });
    }
    const sms = oidc.locator(
      '[data-journey-ref="urn:ujg:solid-oidc:sms-verification-journey"]',
    );
    assert.equal(
      await sms.locator("xpath=ancestor::*[@data-journey-ref]").count(),
      3,
    );
    assert.equal(await oidc.getByRole("button").count(), 0);
    assert.equal(await oidc.getByRole("region").count(), 0);
  });

  await test("multiple child references, reuse, rootless cycles, and static semantics remain explicit", async () => {
    const fixture = page.getByTestId("fixture");
    assert.equal(
      await fixture.locator('[data-journey-ref="urn:test:shared"]').count(),
      3,
    );
    assert.equal(
      await fixture.locator('[data-recursive-ref="urn:test:shared"]').count(),
      3,
    );
    const rootless = fixture.getByRole("group", {
      name: "Journeys without a root",
    });
    assert.equal(await rootless.locator("[data-recursive-ref]").count(), 2);
    const snapshot = await fixture.ariaSnapshot();
    const contracts = fixture.locator("dl").first();
    assert.deepEqual(await contracts.getByRole("term").allTextContents(), [
      "Entries",
      "Exits",
    ]);
    const contractSnapshot = await contracts.ariaSnapshot();
    assert.equal((contractSnapshot.match(/\bEntries\b/g) ?? []).length, 1);
    assert.equal((contractSnapshot.match(/\bExits\b/g) ?? []).length, 1);
    assert.match(snapshot, /Begin first root.*default/);
    assert.match(snapshot, /1 entry names this state/);
    assert.match(
      snapshot,
      /1 listed exit reached by a direct transition from this state/,
    );
    assert.doesNotMatch(snapshot, /button|←|→/);
    assert.deepEqual(errors, []);
  });

  await test("320px and named breakpoint boundaries wrap the expanded hierarchy without overflow", async () => {
    for (const width of [320, 859, 860, 861, 1099, 1100, 1101]) {
      await page.setViewportSize({ width, height: 900 });
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > window.innerWidth,
        ),
        false,
        `overflow at ${width}`,
      );
      const overflow = await page
        .locator("[data-journey-ref], [data-state-ref], [data-contract-ref]")
        .evaluateAll((elements) =>
          elements
            .filter(
              (element) =>
                element.getBoundingClientRect().right > window.innerWidth + 1,
            )
            .map((element) => element.outerHTML.slice(0, 150)),
        );
      assert.deepEqual(overflow, [], `hierarchy overflow at ${width}`);
    }
    await page.setViewportSize({ width: 320, height: 900 });
    await oidc.screenshot({ path: `${evidence}/stage5-mobile.png` });
    await page.setViewportSize({ width: 1280, height: 900 });
    await oidc.screenshot({ path: `${evidence}/stage5-oidc.png` });
  });

  await test("separate theme boundaries style the same static hierarchy through shared tokens", async () => {
    const foreground = (locator) =>
      locator
        .getByRole("heading", { name: "First root", exact: true })
        .evaluate((element) => getComputedStyle(element).color);
    assert.notEqual(
      await foreground(page.getByTestId("fixture")),
      await foreground(page.getByTestId("dark")),
    );
    await page
      .getByTestId("dark")
      .screenshot({ path: `${evidence}/stage5-dark.png` });
    assert.deepEqual(errors, []);
  });

  await test("viewer Storybook holds only its own stories and loads them and the consumer iframe", async () => {
    const index = await (await fetch(`${url}/index.json`)).json();
    const stories = Object.values(index.entries).filter(
      (entry) => entry.type === "story",
    );
    assert.equal(stories.length, 33);
    assert.ok(stories.every((entry) => entry.title.startsWith("Viewer/")));
    for (const story of stories) {
      await page.goto(`${url}/iframe.html?id=${story.id}&viewMode=story`);
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
      `${url}/iframe.html?id=viewer-journeyhierarchy--built-consumer&viewMode=story`,
    );
    await page
      .frameLocator(
        'iframe[title="Compiled viewer without Tailwind processing"]',
      )
      .getByTestId("oidc")
      .getByRole("heading", { name: "App auth journey", exact: true })
      .waitFor();
    assert.deepEqual(errors, []);
  });

  await test("viewer stories inherit theme globals and preserve source rendering and responsive layout", async () => {
    const appearances = [];
    for (const theme of ["light", "dark"]) {
      await page.goto(
        `${url}/iframe.html?id=viewer-journeyhierarchy--multiple-roots-and-recursion&viewMode=story&globals=theme:${theme}`,
      );
      const scope = page.locator(`.story-scope[data-jv-theme="${theme}"]`);
      const heading = scope.getByRole("heading", {
        name: "First root",
        exact: true,
      });
      await heading.waitFor();
      appearances.push(
        await heading.evaluate((element) => getComputedStyle(element).color),
      );
      assert.equal(
        await scope.locator('[data-journey-ref="urn:test:shared"]').count(),
        3,
      );
      for (const width of [320, 859, 860, 861, 1099, 1100, 1101]) {
        await page.setViewportSize({ width, height: 900 });
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth > window.innerWidth,
          ),
          false,
          `${theme} story overflow at ${width}`,
        );
      }
    }
    assert.notEqual(appearances[0], appearances[1]);
    await page.goto(
      `${url}/iframe.html?id=viewer-journeyhierarchy--oidc&viewMode=story`,
    );
    await page
      .getByRole("heading", { name: "App auth journey", exact: true })
      .waitFor();
    assert.equal(await page.locator("[data-journey-ref]").count(), 10);
    assert.equal(await page.locator("[data-state-ref]").count(), 47);
    assert.equal(
      await page.locator('[data-contract-kind="entry"]').count(),
      20,
    );
    assert.equal(await page.locator('[data-contract-kind="exit"]').count(), 24);
    await page.setViewportSize({ width: 320, height: 900 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      ),
      false,
    );
    await page.screenshot({
      path: `${evidence}/stage5-storybook-mobile.png`,
      fullPage: true,
    });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.screenshot({
      path: `${evidence}/stage5-storybook-oidc.png`,
      fullPage: true,
    });
    await page.goto(
      `${url}/iframe.html?id=viewer-journeyhierarchy--empty&viewMode=story`,
    );
    await page.getByText("No journeys.", { exact: true }).waitFor();
    assert.deepEqual(errors, []);
  });

  /** Each check starts from the same desktop viewport, independently of earlier failures. */
  const consumerPage = async () => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`${url}/viewer-consumer/`);
  };
  const inspector = (scope) =>
    scope.getByRole("complementary", { name: "Selection inspector" });
  const identity = (scope) =>
    inspector(scope).locator("header code").textContent();
  const crumb = (scope) =>
    inspector(scope).locator("header p").first().textContent();
  const first = () => page.getByTestId("interactive-first");
  const second = () => page.getByTestId("interactive-second");
  const prefix = "urn:ujg:solid-oidc:";
  const stateButton = (scope, ref, name) =>
    scope
      .locator(`[data-state-ref="${ref}"]`)
      .getByRole("button", {
        name:
          typeof name === "string"
            ? new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`)
            : name,
      })
      .first();
  const row = (scope, ref) =>
    scope.locator(`[data-state-ref="${ref}"] [data-row]`).first();
  const contracts = (scope, summary) =>
    scope.getByRole("button", { name: summary, exact: true }).first();
  const section = (scope, title) =>
    inspector(scope)
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: title }) });
  const inView = (locator) =>
    locator.evaluate((element) => {
      const box = element.getBoundingClientRect();
      return (
        box.top >= 0 &&
        box.bottom <= element.ownerDocument.defaultView.innerHeight
      );
    });

  await test("compiled viewer selection and keyboard interaction are independent across instances", async () => {
    await consumerPage();
    assert.equal(await identity(first()), `${prefix}app-sign-in-required`);
    assert.equal(await identity(second()), `${prefix}app-sign-in-required`);
    const denied = stateButton(
      first(),
      `${prefix}app-access-denied`,
      "Access denied",
    );
    await denied.focus();
    assert.equal(
      await denied.evaluate(
        (element) => getComputedStyle(element).outlineStyle,
      ),
      "solid",
    );
    await page.keyboard.press("Enter");
    assert.equal(await identity(first()), `${prefix}app-access-denied`);
    assert.equal(await denied.getAttribute("aria-pressed"), "true");
    assert.equal(
      await row(first(), `${prefix}app-access-denied`).getAttribute(
        "data-selected",
      ),
      "true",
    );
    assert.equal(await identity(second()), `${prefix}app-sign-in-required`);
    const search = first().getByRole("searchbox", {
      name: "Search the graph",
      exact: true,
    });
    await search.fill(`${prefix}app-auth-journey`);
    await search.press("Enter");
    assert.equal(await identity(first()), `${prefix}app-auth-journey`);
    assert.match(await inspector(first()).textContent(), /Journey/);
    await contracts(first(), "5 entries · 4 exits").click();
    await first()
      .locator(`[data-contract-ref="${prefix}idp-login-entry"]`)
      .getByRole("button")
      .click();
    assert.equal(await identity(first()), `${prefix}idp-login-entry`);
    assert.equal(
      await inspector(first())
        .getByRole("heading", { name: /^Invoked from App auth journey/ })
        .count(),
      1,
    );
    assert.match(await inspector(first()).textContent(), /Start sign-in/);
    await first()
      .locator(`[data-contract-ref="${prefix}idp-auth-failed"]`)
      .getByRole("button")
      .click();
    assert.equal(await identity(first()), `${prefix}idp-auth-failed`);
    assert.equal(
      await inspector(first())
        .getByRole("heading", { name: /^Handled by parent/ })
        .count(),
      1,
    );
    assert.match(
      await inspector(first()).textContent(),
      /Continue after failed login/,
    );
    assert.equal(await identity(second()), `${prefix}app-sign-in-required`);
    assert.deepEqual(errors, []);
  });

  await test("disclosure, contract lists, expand/collapse all, composite selection and reset use immutable snapshots", async () => {
    await consumerPage();
    assert.equal(
      await first().locator("[data-contract-ref]").count(),
      0,
      "entry/exit lists start closed",
    );
    const idpContracts = contracts(first(), "5 entries · 4 exits");
    assert.equal(await idpContracts.getAttribute("aria-expanded"), "false");
    await idpContracts.click();
    assert.equal(await idpContracts.getAttribute("aria-expanded"), "true");
    await first()
      .locator(`[data-contract-ref="${prefix}idp-login-entry"]`)
      .getByRole("button")
      .click();
    await first()
      .getByRole("button", { name: "Collapse all", exact: true })
      .click();
    assert.equal(await first().locator("[data-state-ref]").count(), 10);
    assert.equal(
      await first()
        .locator(`[data-contract-ref="${prefix}idp-login-entry"]`)
        .count(),
      0,
    );
    assert.equal(await identity(first()), `${prefix}idp-login-entry`);
    assert.equal(await second().locator("[data-state-ref]").count(), 47);
    const expand = first().getByRole("button", {
      name: "Expand Authenticate with identity provider",
      exact: true,
    });
    await expand.focus();
    await page.keyboard.press("Space");
    assert.equal(
      await first()
        .locator(`[data-journey-ref="${prefix}idp-auth-journey"]`)
        .count(),
      1,
    );
    assert.equal(
      await first()
        .locator(`[data-journey-ref="${prefix}mfa-challenge-journey"]`)
        .count(),
      0,
    );
    await first()
      .getByRole("button", {
        name: "Collapse Authenticate with identity provider",
        exact: true,
      })
      .click();
    assert.equal(
      await first()
        .locator(`[data-journey-ref="${prefix}idp-auth-journey"]`)
        .count(),
      0,
    );
    await stateButton(
      first(),
      `${prefix}idp-auth-flow`,
      "Authenticate with identity provider",
    ).click();
    assert.equal(
      await first()
        .locator(`[data-journey-ref="${prefix}idp-auth-journey"]`)
        .count(),
      1,
    );
    assert.equal(await identity(first()), `${prefix}idp-auth-flow`);
    await first()
      .getByRole("button", { name: "Expand all", exact: true })
      .click();
    assert.equal(await first().locator("[data-state-ref]").count(), 47);
    assert.equal(await identity(first()), `${prefix}idp-auth-flow`);
    await first()
      .getByRole("button", { name: "Reset view", exact: true })
      .click();
    assert.equal(await identity(first()), `${prefix}app-sign-in-required`);
    assert.equal(await first().locator("[data-contract-ref]").count(), 0);
    assert.deepEqual(errors, []);
  });

  await test("same-ID replacement and empty/different documents reset selection and expansion without affecting another viewer", async () => {
    await consumerPage();
    await stateButton(
      first(),
      `${prefix}app-access-denied`,
      "Access denied",
    ).click();
    await first()
      .getByRole("button", { name: "Collapse all", exact: true })
      .click();
    await page
      .getByRole("button", {
        name: "Replace document with same ID",
        exact: true,
      })
      .click();
    assert.equal(await identity(first()), `${prefix}app-sign-in-required`);
    assert.equal(await first().locator("[data-state-ref]").count(), 47);
    await page
      .getByRole("button", { name: "Load empty document", exact: true })
      .click();
    assert.equal(
      await first().getByText("No journeys.", { exact: true }).count(),
      1,
    );
    assert.equal(
      await inspector(first())
        .getByText("Select a journey, state, entry or exit to inspect it.", {
          exact: true,
        })
        .count(),
      1,
    );
    assert.equal(await first().locator("[data-state-ref]").count(), 0);
    assert.equal(await identity(second()), `${prefix}app-sign-in-required`);
    await page
      .getByRole("button", { name: "Load topology document", exact: true })
      .click();
    assert.equal(await identity(first()), "urn:test:compose");
    assert.equal(
      await first().locator('[data-journey-ref="urn:test:shared"]').count(),
      3,
    );
    await first()
      .getByRole("button", {
        name: "Collapse Several child journeys",
        exact: true,
      })
      .click();
    assert.equal(
      await first().locator('[data-journey-ref="urn:test:shared"]').count(),
      0,
    );
    assert.equal(
      await first().locator('[data-journey-ref="urn:test:other"]').count(),
      0,
    );
    await stateButton(
      first(),
      "urn:test:compose",
      "Several child journeys",
    ).click();
    assert.equal(
      await first().locator('[data-journey-ref="urn:test:shared"]').count(),
      3,
    );
    assert.equal(
      await first().locator('[data-journey-ref="urn:test:other"]').count(),
      1,
    );
    assert.equal(
      await first().locator('[data-recursive-ref="urn:test:shared"]').count(),
      3,
    );
    assert.deepEqual(errors, []);
  });

  await test("the explorer bar, original grid and sticky inspector follow the shared breakpoints", async () => {
    await consumerPage();
    const layout = () => inspector(first()).locator("xpath=../..");
    for (const width of [320, 859, 860, 861, 1099, 1100, 1101]) {
      await page.setViewportSize({ width, height: 900 });
      const shape = await layout().evaluate((element) => ({
        display: getComputedStyle(element).display,
        columns:
          getComputedStyle(element).gridTemplateColumns.split(" ").length,
        inspector: element.lastElementChild.getBoundingClientRect().width,
        inspectorFirst:
          element.lastElementChild.getBoundingClientRect().top <
          element.firstElementChild.getBoundingClientRect().top,
      }));
      if (width < 860) {
        assert.equal(shape.display, "flex", `stacked layout at ${width}`);
        assert.equal(
          shape.inspectorFirst,
          true,
          `inspector precedes the graph at ${width}`,
        );
      } else {
        assert.equal(shape.columns, 2, `two columns at ${width}`);
        assert.equal(
          Math.round(shape.inspector),
          width < 1100 ? 300 : 340,
          `inspector width at ${width}`,
        );
      }
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > window.innerWidth,
        ),
        false,
        `viewer overflow at ${width}`,
      );
    }
    await page.setViewportSize({ width: 1280, height: 900 });
    // Short touchpoint labels keep the bar to at most two compact lines, as in the original header.
    const barHeight = await page
      .getByTestId("screens-first")
      .locator("[data-explorer-bar]")
      .evaluate((element) => element.offsetHeight);
    assert.ok(barHeight < 100, `one compact explorer bar (${barHeight}px)`);
    const firstRowOffset = await first().evaluate((element) => {
      const row = element.querySelector("[data-row]").getBoundingClientRect();
      return (
        row.top -
        element.querySelector("[data-explorer-bar]").getBoundingClientRect()
          .bottom
      );
    });
    assert.ok(
      firstRowOffset < 120,
      `the first state row follows the bar closely (${firstRowOffset}px)`,
    );
    await first().evaluate((element) =>
      element.ownerDocument.defaultView.scrollTo(
        0,
        element.getBoundingClientRect().top +
          element.ownerDocument.defaultView.scrollY +
          900,
      ),
    );
    const sticky = await first().evaluate((element) => ({
      bar: element.querySelector("[data-explorer-bar]").getBoundingClientRect(),
      panel: element
        .querySelector('aside[aria-label="Selection inspector"]')
        .getBoundingClientRect(),
    }));
    assert.ok(
      Math.abs(sticky.bar.top) < 1,
      "the explorer bar sticks to the viewport top",
    );
    assert.ok(
      sticky.panel.top >= sticky.bar.bottom &&
        sticky.panel.top <= sticky.bar.bottom + 24,
      "the inspector sticks below the bar",
    );
    await page.screenshot({ path: `${evidence}/stage10d-sticky-1280.png` });
    await page.setViewportSize({ width: 320, height: 900 });
    await first().screenshot({ path: `${evidence}/stage10d-mobile.png` });
    await page.setViewportSize({ width: 1280, height: 900 });
    await first().screenshot({ path: `${evidence}/stage10d-viewer.png` });
    await page.goto(
      `${url}/iframe.html?id=viewer-journeyviewer--document-replacement&viewMode=story`,
    );
    const source = page.locator("#storybook-root");
    await stateButton(
      source,
      `${prefix}app-access-denied`,
      "Access denied",
    ).click();
    assert.equal(await identity(source), `${prefix}app-access-denied`);
    await source
      .getByRole("button", {
        name: "Replace document with same ID",
        exact: true,
      })
      .click();
    assert.equal(await identity(source), `${prefix}app-sign-in-required`);
    assert.deepEqual(errors, []);
  });

  await test("empty-composite notices stay nested and selectable without a meaningless disclosure", async () => {
    await consumerPage();
    await page
      .getByRole("button", { name: "Load empty composites", exact: true })
      .click();
    await first()
      .getByRole("button", { name: "Collapse all", exact: true })
      .click();
    for (const [ref, label] of [
      ["empty", "No child references"],
      ["unresolved", "No resolvable children"],
    ]) {
      const state = first().locator(`[data-state-ref="urn:test:${ref}"]`);
      const notice = state.getByText("No child journeys.", { exact: true });
      assert.equal(await state.getByRole("button").count(), 1);
      assert.equal(await state.locator("[aria-expanded]").count(), 0);
      await state.getByRole("button", { name: label, exact: true }).click();
      assert.equal(await identity(first()), `urn:test:${ref}`);
      assert.equal(
        await notice.evaluate((element) => {
          const nested = element.parentElement.parentElement;
          return (
            parseFloat(getComputedStyle(nested).marginInlineStart) > 0 &&
            nested.parentElement.parentElement.hasAttribute("data-state-ref")
          );
        }),
        true,
      );
    }
    assert.equal(
      await first().getByText("No child journeys.", { exact: true }).count(),
      2,
    );
    assert.equal(
      await first()
        .locator('[data-state-ref="urn:test:leaf"]')
        .getByText("No child journeys.", { exact: true })
        .count(),
      0,
    );
    for (const width of [320, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > window.innerWidth,
        ),
        false,
      );
      await first().screenshot({
        path: `${evidence}/stage6-empty-composites-${width}.png`,
      });
    }
    assert.equal(await identity(second()), `${prefix}app-sign-in-required`);
    assert.deepEqual(errors, []);
  });

  const results = (scope) =>
    scope.getByRole("list", { name: "Search the graph results" });
  const lanes = (scope) =>
    scope.getByRole("group", { name: "Journey columns" });
  const mode = (scope, name) =>
    scope
      .getByRole("group", { name: "View" })
      .getByRole("button", { name, exact: true });

  await test("search supports native keyboard picking/clearing, the slash shortcut, outside dismissal and instance isolation", async () => {
    await consumerPage();
    const search = first().getByRole("searchbox", {
      name: "Search the graph",
      exact: true,
    });
    await search.focus();
    assert.equal(
      await search.evaluate(
        (element) => getComputedStyle(element).outlineStyle,
      ),
      "solid",
    );
    await search.fill("no such item");
    await first().getByText("No matches", { exact: true }).waitFor();
    await search.press("Escape");
    assert.equal(await search.inputValue(), "");
    assert.equal(
      await search.evaluate(
        (element) => element === element.ownerDocument.activeElement,
      ),
      false,
      "Escape leaves the field",
    );
    await page.locator("body").click({ position: { x: 1, y: 1 } });
    await page.keyboard.press("/");
    assert.equal(
      await search.evaluate(
        (element) => element === element.ownerDocument.activeElement,
      ),
      true,
      "/ focuses search",
    );
    await search.fill("   ");
    assert.equal(await results(first()).count(), 0);
    await search.fill("SMS");
    assert.ok((await results(first()).getByRole("button").count()) >= 2);
    const box = await results(first()).boundingBox();
    assert.ok(
      box && box.x >= 0 && box.x + box.width <= 1281,
      "results open as a popover within the viewport",
    );
    await stateButton(first(), `${prefix}app-logged-in`, "Logged in").click();
    assert.equal(
      await results(first()).count(),
      0,
      "an outside click closes results",
    );
    assert.equal(await search.inputValue(), "SMS");
    await search.fill("sms-verification-journey");
    await search.press("Enter");
    assert.equal(await search.inputValue(), "");
    assert.equal(await identity(first()), `${prefix}sms-verification-journey`);
    assert.equal(
      await crumb(first()),
      "App auth journey / IdP auth journey / MFA challenge journey / SMS verification message",
    );
    assert.equal(await identity(second()), `${prefix}app-sign-in-required`);
    assert.equal(await second().getByRole("searchbox").inputValue(), "");
    await mode(first(), "Columns").click();
    assert.equal(await lanes(first()).locator("[data-journey-ref]").count(), 4);
    assert.deepEqual(errors, []);
  });

  await test("row, inspector and column navigation retain a query; picking a search result clears it and reveals the target", async () => {
    await consumerPage();
    const search = first().getByRole("searchbox");
    await search.fill("SMS");
    await stateButton(
      first(),
      `${prefix}app-access-denied`,
      "Access denied",
    ).click();
    assert.equal(await search.inputValue(), "SMS");
    await stateButton(
      first(),
      `${prefix}app-sign-in-required`,
      "Sign-in required",
    ).click();
    await section(first(), /^Outgoing/)
      .getByRole("button", { name: /^Authenticate with identity provider/ })
      .click();
    assert.equal(await identity(first()), `${prefix}idp-auth-flow`);
    assert.equal(await search.inputValue(), "SMS");
    await mode(first(), "Columns").click();
    assert.equal(await search.inputValue(), "SMS");
    await search.click();
    await results(first()).getByRole("button").first().click();
    assert.equal(await search.inputValue(), "");
    assert.equal(await identity(first()), `${prefix}mfa-sms-message`);
    await page.waitForTimeout(400);
    assert.equal(
      await inView(row(first(), `${prefix}mfa-sms-message`)),
      true,
      "a picked result is scrolled into view",
    );
    assert.equal(await second().getByRole("searchbox").inputValue(), "");
    assert.deepEqual(errors, []);
  });

  await test("equal touchpoint labels, single selection, bounded results and repeated references remain distinguishable", async () => {
    await consumerPage();
    await page
      .getByRole("button", { name: "Load navigation review", exact: true })
      .click();
    const filters = first().getByRole("group", { name: "Touchpoint filter" });
    const all = filters.getByRole("button", { name: "All", exact: true });
    const web = filters.getByRole("button", {
      name: "Web (urn:test:web)",
      exact: true,
    });
    const phone = filters.getByRole("button", {
      name: "Web (urn:test:phone)",
      exact: true,
    });
    assert.equal(await web.count(), 1);
    assert.equal(await phone.count(), 1);
    assert.equal(
      await filters.getByRole("button", { name: "Web", exact: true }).count(),
      0,
    );
    assert.equal(await all.getAttribute("aria-pressed"), "true");
    await web.click();
    assert.equal(await web.getAttribute("aria-pressed"), "true");
    assert.equal(await all.getAttribute("aria-pressed"), "false");
    assert.equal(await phone.getAttribute("aria-pressed"), "false");
    await phone.click();
    assert.equal(await phone.getAttribute("aria-pressed"), "true");
    assert.equal(
      await web.getAttribute("aria-pressed"),
      "false",
      "the filter is single-select",
    );
    await all.click();
    assert.equal(await all.getAttribute("aria-pressed"), "true");
    const search = first().getByRole("searchbox");
    await search.fill("urn:test:");
    assert.equal(await results(first()).getByRole("button").count(), 18);
    await first()
      .getByText(
        "Showing first 18 matches. Refine your search to narrow the results.",
        { exact: true },
      )
      .waitFor();
    await search.fill("urn:test:shared");
    const matches = results(first()).getByRole("button");
    assert.equal(await matches.count(), 3);
    assert.match(await matches.nth(0).textContent(), /reference 1 of 2/);
    assert.match(await matches.nth(1).textContent(), /reference 2 of 2/);
    assert.doesNotMatch(
      await matches.nth(2).textContent(),
      /reference \d|state \d|child \d/,
    );
    for (const width of [320, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > window.innerWidth,
        ),
        false,
      );
      await filters.screenshot({
        path: `${evidence}/stage10d-filters-${width}.png`,
      });
      await results(first()).screenshot({
        path: `${evidence}/stage10d-search-${width}.png`,
      });
    }
    await matches.nth(1).click();
    assert.match(await crumb(first()), /reference 2 of 2/);
    const selectedOccurrence = first()
      .locator('[data-journey-ref="urn:test:shared"]')
      .nth(1);
    await stateButton(
      selectedOccurrence,
      "urn:test:repeat",
      "Recurse here",
    ).click();
    const logical = first().locator(
      '[data-state-ref="urn:test:repeat"] [data-row]',
    );
    assert.equal(await logical.count(), 3);
    assert.equal(
      await logical.evaluateAll((rows) =>
        rows.every((element) => element.dataset.selected === "true"),
      ),
      true,
    );
    assert.match(await crumb(first()), /reference 2 of 2/);
    await mode(first(), "Columns").click();
    assert.equal(await lanes(first()).locator("[data-journey-ref]").count(), 2);
    await stateButton(
      lanes(first()),
      "urn:test:compose",
      "Several child journeys",
    ).click();
    assert.equal(
      await lanes(first()).locator("[data-journey-ref]").count(),
      4,
      "selecting a composite opens each child column",
    );
    assert.doesNotMatch(
      await lanes(first()).textContent(),
      /state \d|child \d/,
    );
    assert.deepEqual(errors, []);
  });

  await test("columns follow the selected call path, mark open composites and trim when selection moves", async () => {
    await consumerPage();
    await page
      .getByRole("button", { name: "Load topology document", exact: true })
      .click();
    const search = first().getByRole("searchbox");
    await search.fill("urn:test:shared");
    await results(first()).getByRole("button").nth(1).click();
    assert.match(await crumb(first()), /reference 2 of 2/);
    await mode(first(), "Columns").click();
    assert.equal(
      await mode(first(), "Columns").getAttribute("aria-pressed"),
      "true",
    );
    assert.equal(
      await first()
        .getByRole("button", { name: "Expand all", exact: true })
        .count(),
      0,
      "tree tools are hidden",
    );
    assert.deepEqual(
      await lanes(first())
        .locator("[data-journey-ref]")
        .evaluateAll((elements) =>
          elements.map((element) => element.getAttribute("data-journey-ref")),
        ),
      ["urn:test:first", "urn:test:shared"],
    );
    assert.equal(
      await lanes(first())
        .locator('[aria-label^="Expand "], [aria-label^="Collapse "]')
        .count(),
      0,
      "columns use carets, not tree disclosures",
    );
    assert.match(
      await lanes(first())
        .locator("[data-journey-ref] header p")
        .first()
        .textContent(),
      /Root journey/,
    );
    assert.equal(
      await lanes(first())
        .locator('[data-state-ref="urn:test:compose"] [data-row] > [data-open]')
        .count(),
      1,
      "the composite in the path is marked",
    );
    assert.equal(
      await lanes(first()).evaluate(
        (element) => getComputedStyle(element).overflowX,
      ),
      "auto",
    );
    assert.equal(
      Math.round(
        await lanes(first())
          .locator("[data-journey-ref]")
          .first()
          .evaluate((element) => element.getBoundingClientRect().width),
      ),
      284,
    );
    await stateButton(
      lanes(first()),
      "urn:test:compose",
      "Several child journeys",
    ).click();
    assert.equal(await identity(first()), "urn:test:compose");
    assert.equal(await lanes(first()).locator("[data-journey-ref]").count(), 4);
    await stateButton(lanes(first()), "urn:test:terminal", "Averylong").click();
    assert.equal(await lanes(first()).locator("[data-journey-ref]").count(), 1);
    await mode(first(), "Tree").click();
    assert.equal(
      await first().locator('[data-journey-ref="urn:test:shared"]').count(),
      3,
    );
    await search.fill("urn:test:cycle-b");
    const cycles = results(first()).getByRole("button");
    assert.equal(
      await cycles.count(),
      4,
      "journey and composite-state ID searches are literal substring matches",
    );
    await cycles.last().click();
    await mode(first(), "Columns").click();
    assert.deepEqual(
      await lanes(first())
        .locator("[data-journey-ref]")
        .evaluateAll((elements) =>
          elements.map((element) => element.getAttribute("data-journey-ref")),
        ),
      ["urn:test:cycle-b", "urn:test:cycle-a"],
      "a rootless start column opens its composite's child once",
    );
    assert.deepEqual(errors, []);
  });

  await test("the touchpoint filter marks matching nested scopes and leaves matching children undimmed", async () => {
    await consumerPage();
    const filters = first().getByRole("group", { name: "Touchpoint filter" });
    const smsFilter = filters.getByRole("button", {
      name: "SMS channel touchpoint",
      exact: true,
    });
    await smsFilter.click();
    assert.equal(await smsFilter.getAttribute("aria-pressed"), "true");
    assert.equal(
      await filters
        .getByRole("button", { name: "All", exact: true })
        .getAttribute("aria-pressed"),
      "false",
    );
    assert.equal(await first().locator("[data-journey-ref]").count(), 10);
    const smsState = first().locator(
      `[data-state-ref="${prefix}mfa-sms-message-presented"]`,
    );
    assert.equal(await smsState.locator("[data-filtered]").count(), 0);
    assert.equal(
      await smsState.evaluate((element) => {
        for (let current = element; current; current = current.parentElement)
          if (Number(getComputedStyle(current).opacity) < 1) return false;
        return true;
      }),
      true,
      "a filtered ancestor must not dim a matching descendant",
    );
    assert.equal(
      await first().locator("[data-matched]").count(),
      1,
      "the matching nested journey is marked",
    );
    const appState = first().locator(
      `[data-state-ref="${prefix}app-sign-in-required"]`,
    );
    assert.equal(await appState.locator("[data-filtered]").count(), 1);
    assert.equal(await second().locator("[data-filtered]").count(), 0);
    await first().getByRole("searchbox").fill("App auth");
    await first().getByText("No matches", { exact: true }).waitFor();
    await filters
      .getByRole("button", { name: "App touchpoint", exact: true })
      .click();
    assert.equal(await smsFilter.getAttribute("aria-pressed"), "false");
    assert.equal(
      await results(first()).count(),
      0,
      "the filter click closes the result popover",
    );
    await first().getByRole("searchbox").click();
    assert.ok((await results(first()).getByRole("button").count()) >= 1);
    assert.match(
      await results(first()).getByRole("button").first().textContent(),
      /App auth journey/,
    );
    await first()
      .getByRole("button", { name: "Reset view", exact: true })
      .click();
    assert.equal(await first().locator("[data-filtered]").count(), 0);
    assert.equal(await first().getByRole("searchbox").inputValue(), "");
    assert.equal(
      await filters
        .getByRole("button", { name: "All", exact: true })
        .getAttribute("aria-pressed"),
      "true",
    );
    assert.deepEqual(errors, []);
  });

  await test("inspector group heads and details navigate explicit transitions, child journeys, entry starts and parent exits", async () => {
    await consumerPage();
    await section(first(), /^Outgoing/)
      .getByRole("button", { name: /^Authenticate with identity provider/ })
      .click();
    assert.equal(await identity(first()), `${prefix}idp-auth-flow`);
    assert.match(await inspector(first()).textContent(), /Composite state/);
    assert.match(
      await inspector(first()).textContent(),
      /Touchpoint change: App touchpoint → Identity provider touchpoint/,
    );
    await section(first(), /^Nested journey/)
      .getByRole("button")
      .click();
    assert.match(await crumb(first()), /App auth journey \/ IdP auth journey$/);
    await contracts(first(), "5 entries · 4 exits").click();
    await first()
      .locator(`[data-contract-ref="${prefix}idp-login-entry"]`)
      .getByRole("button")
      .click();
    assert.equal(await identity(first()), `${prefix}idp-login-entry`);
    await section(first(), /^Starts at/)
      .getByRole("button", { name: /^Login/ })
      .click();
    assert.equal(await identity(first()), `${prefix}idp-login`);
    await first()
      .locator(`[data-contract-ref="${prefix}idp-auth-failed"]`)
      .getByRole("button")
      .click();
    await section(first(), /^Handled by parent/)
      .getByRole("button", { name: /^Login error/ })
      .click();
    assert.equal(await identity(first()), `${prefix}app-login-error`);
    assert.equal(await crumb(first()), "App auth journey");
    await page.waitForTimeout(400);
    assert.equal(
      await inView(row(first(), `${prefix}app-login-error`)),
      true,
      "inspector navigation reveals the target row",
    );
    assert.deepEqual(errors, []);
  });

  await test("hover-derived tones and marks take precedence and document replacement resets all navigation", async () => {
    await consumerPage();
    await stateButton(
      first(),
      `${prefix}app-sign-in-required`,
      "Sign-in required",
    ).hover();
    assert.equal(
      await row(first(), `${prefix}idp-auth-flow`).getAttribute("data-tone"),
      "outgoing",
    );
    assert.match(
      await row(first(), `${prefix}idp-auth-flow`).textContent(),
      /→5/,
    );
    assert.equal(
      await row(first(), `${prefix}app-logged-in`).getAttribute("data-tone"),
      "dim",
    );
    await stateButton(
      first(),
      `${prefix}idp-auth-flow`,
      "Authenticate with identity provider",
    ).hover();
    assert.equal(
      await row(first(), `${prefix}app-sign-in-required`).getAttribute(
        "data-tone",
      ),
      "incoming",
    );
    assert.equal(
      await row(first(), `${prefix}idp-auth-flow`).getAttribute("data-tone"),
      "active",
    );
    await first().getByRole("searchbox").hover();
    assert.equal(
      await row(first(), `${prefix}app-sign-in-required`).getAttribute(
        "data-tone",
      ),
      "active",
      "leaving rows restores the selection",
    );
    assert.equal(
      await row(first(), `${prefix}idp-auth-flow`).getAttribute("data-tone"),
      "outgoing",
    );
    await mode(first(), "Columns").click();
    await first()
      .getByRole("group", { name: "Touchpoint filter" })
      .getByRole("button")
      .nth(1)
      .click();
    await first().getByRole("searchbox").fill("SMS");
    await page
      .getByRole("button", {
        name: "Replace document with same ID",
        exact: true,
      })
      .click();
    assert.equal(
      await mode(first(), "Tree").getAttribute("aria-pressed"),
      "true",
    );
    assert.equal(await first().getByRole("searchbox").inputValue(), "");
    assert.equal(await first().locator("[data-filtered]").count(), 0);
    assert.equal(await identity(first()), `${prefix}app-sign-in-required`);
    await page
      .getByRole("button", { name: "Load empty document", exact: true })
      .click();
    await first().getByText("No journeys.", { exact: true }).waitFor();
    await mode(first(), "Columns").click();
    assert.equal(await first().locator("[data-journey-ref]").count(), 0);
    assert.deepEqual(errors, []);
  });

  await test("the bar, columns and search results fit mobile and shared breakpoint boundaries", async () => {
    await consumerPage();
    await first().getByRole("searchbox").fill("sms-verification-journey");
    await first().getByRole("searchbox").press("Enter");
    await mode(first(), "Columns").click();
    for (const width of [320, 859, 860, 861, 1099, 1100, 1101]) {
      await page.setViewportSize({ width, height: 900 });
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > window.innerWidth,
        ),
        false,
        `columns overflow at ${width}`,
      );
    }
    for (const width of [320, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      await first().locator("[data-explorer-bar]").scrollIntoViewIfNeeded();
      await page.screenshot({ path: `${evidence}/stage10d-bar-${width}.png` });
      await lanes(first())
        .locator("[data-journey-ref]")
        .last()
        .scrollIntoViewIfNeeded();
      await lanes(first()).screenshot({
        path: `${evidence}/stage10d-columns-${width}.png`,
      });
    }
    await first().getByRole("searchbox").fill("SMS");
    await page.setViewportSize({ width: 320, height: 900 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      ),
      false,
    );
    const box = await results(first()).boundingBox();
    assert.ok(
      box && box.x >= 0 && box.x + box.width <= 321,
      "the results popover fits 320px",
    );
    await results(first()).screenshot({
      path: `${evidence}/stage10d-search-popover-320.png`,
    });
    assert.deepEqual(errors, []);
  });

  const screensFirst = () => page.getByTestId("screens-first");
  const screensSecond = () => page.getByTestId("screens-second");
  const lightbox = () =>
    page.getByRole("dialog", { name: "Screenshot viewer", exact: true });
  const lightboxTitle = () => lightbox().getByRole("heading").textContent();
  const position = () => lightbox().getByRole("status").last().textContent();
  const thumbnail = (scope) =>
    inspector(scope).getByRole("group", { name: "Screenshot previews" });
  const openInitialScreen = async () => {
    const button = screensFirst()
      .locator(`[data-state-ref="${prefix}app-sign-in-required"]`)
      .getByRole("button", {
        name: "Screen mockup: Sign-in required",
        exact: true,
      });
    await button.focus();
    await button.press("Enter");
    await lightbox().waitFor();
    return button;
  };
  const readyImage = async () => {
    await lightbox().locator('[data-image-status="ready"]').waitFor();
    assert.equal(
      await lightbox()
        .getByRole("img")
        .evaluate((element) => element.complete && element.naturalWidth > 0),
      true,
    );
  };
  // Simulate a caller input update while native modality makes the outer controls inert.
  const replaceFromCaller = async (name) =>
    page
      .getByRole("button", { name, exact: true, includeHidden: true })
      .evaluate((element) =>
        element.dispatchEvent(new MouseEvent("click", { bubbles: true })),
      );

  await test("all 37 mapped OIDC PNGs load, source-ordered lightbox navigation wraps, keyboard focus is trapped and restored", async () => {
    await consumerPage();
    assert.equal(
      await screensFirst()
        .getByRole("button", { name: /^Screen mockup: / })
        .count(),
      37,
    );
    assert.equal(
      await thumbnail(screensFirst())
        .getByRole("button", {
          name: "Enlarge screenshot: Sign-in required",
          exact: true,
        })
        .count(),
      1,
    );
    const mapping = await (
      await fetch(`${url}/solid-oidc/screenshots.json`)
    ).json();
    const baseline = await (
      await fetch(`${url}/solid-oidc/baseline.json`)
    ).json();
    for (const record of baseline.screens) {
      const response = await fetch(
        new URL(mapping[record.surfaceRef], `${url}/solid-oidc/`),
      );
      assert.equal(response.status, 200, record.surfaceRef);
      assert.match(response.headers.get("content-type"), /image\/png/);
    }
    const opener = await openInitialScreen();
    await readyImage();
    assert.equal(
      await lightbox().evaluate((element) => element.matches(":modal")),
      true,
    );
    const source = (record) =>
      new URL(mapping[record.surfaceRef], `${url}/solid-oidc/`).href;
    const visited = [];
    for (const [index, record] of baseline.screens.entries()) {
      await readyImage();
      assert.equal(
        await lightbox().getByRole("img").getAttribute("src"),
        source(record),
      );
      assert.equal(
        await screensFirst()
          .locator('aside[aria-label="Selection inspector"] header code')
          .textContent(),
        record.graphNodeRef,
      );
      assert.equal(await position(), `${index + 1} / 37`);
      visited.push(record.surfaceRef);
      await lightbox()
        .getByRole("button", { name: "Next screen", exact: true })
        .click();
    }
    assert.equal(new Set(visited).size, 37);
    assert.equal(
      await lightbox().getByRole("img").getAttribute("src"),
      source(baseline.screens[0]),
    );
    await lightbox().press("ArrowLeft");
    assert.equal(
      await lightbox().getByRole("img").getAttribute("src"),
      source(baseline.screens.at(-1)),
    );
    await lightbox().press("ArrowRight");
    assert.equal(await lightboxTitle(), "Sign-in required");
    for (let count = 0; count < 8; count += 1) {
      await page.keyboard.press("Tab");
      assert.equal(
        await lightbox().evaluate((element) =>
          element.contains(element.ownerDocument.activeElement),
        ),
        true,
      );
    }
    await lightbox()
      .getByRole("button", { name: "Close screenshot", exact: true })
      .focus();
    await page.keyboard.press("Shift+Tab");
    assert.equal(
      await lightbox()
        .getByRole("button", { name: "Next screen", exact: true })
        .evaluate((element) => element === element.ownerDocument.activeElement),
      true,
    );
    await page.keyboard.press("Escape");
    assert.equal(await lightbox().count(), 0);
    assert.equal(
      await opener.evaluate(
        (element) => element === element.ownerDocument.activeElement,
      ),
      true,
    );
    await openInitialScreen();
    await page.mouse.click(4, 4);
    assert.equal(
      await lightbox().count(),
      0,
      "a backdrop click closes the lightbox",
    );
    assert.deepEqual(errors, []);
  });

  await test("live screenshot map/path replacement preserves interaction, updates an open image and keeps instances independent", async () => {
    await consumerPage();
    const scope = screensFirst();
    await scope
      .getByRole("button", { name: "Collapse all", exact: true })
      .click();
    await mode(scope, "Columns").click();
    await scope
      .getByRole("group", { name: "Touchpoint filter" })
      .getByRole("button", { name: "App", exact: true })
      .click();
    await scope.getByRole("searchbox").fill("keep this query");
    await openInitialScreen();
    await readyImage();
    const previousSource = await lightbox()
      .getByRole("img")
      .getAttribute("src");
    await replaceFromCaller("Replace first screenshot path");
    await lightbox()
      .locator('img[src$="app-logged-in.png?revision=2"]')
      .waitFor();
    await readyImage();
    assert.equal(await lightboxTitle(), "Sign-in required");
    assert.notEqual(
      await lightbox().getByRole("img").getAttribute("src"),
      previousSource,
    );
    assert.equal(
      await scope.locator('input[type="search"]').inputValue(),
      "keep this query",
    );
    assert.equal(
      await scope
        .locator(`[data-touchpoint-ref="${prefix}app"]`)
        .getAttribute("aria-pressed"),
      "true",
    );
    assert.equal(
      await scope
        .locator('[aria-label="Journey columns"] [data-journey-ref]')
        .count(),
      1,
    );
    assert.equal(
      await screensSecond()
        .locator('aside[aria-label="Selection inspector"] header code')
        .textContent(),
      `${prefix}app-sign-in-required`,
    );
    assert.equal(
      await screensSecond()
        .locator('[aria-label="Screenshot previews"] img')
        .getAttribute("src"),
      previousSource,
    );
    await replaceFromCaller("Remove first screenshot mapping");
    await lightbox()
      .getByText("Screenshot unavailable.", { exact: true })
      .waitFor();
    assert.equal(
      await lightbox().locator("img").count(),
      0,
      "removed mappings never display a stale image",
    );
    await replaceFromCaller("Restore screenshot map");
    await readyImage();
    assert.equal(
      await lightbox().getByRole("img").getAttribute("src"),
      previousSource,
    );
    await replaceFromCaller("Clear screenshot map");
    await lightbox()
      .getByText("Screenshot unavailable.", { exact: true })
      .waitFor();
    assert.equal(
      await lightbox()
        .getByRole("button", { name: "Next screen", exact: true })
        .isDisabled(),
      true,
    );
    await lightbox().press("ArrowRight");
    assert.equal(await lightboxTitle(), "Sign-in required");
    await lightbox()
      .getByRole("button", { name: "Close screenshot", exact: true })
      .click();
    assert.equal(
      await mode(scope, "Tree").evaluate(
        (element) => element === element.ownerDocument.activeElement,
      ),
      true,
      "focus falls back to the viewer's first control when the opener disappears",
    );
    assert.equal(
      await scope.getByRole("searchbox").inputValue(),
      "keep this query",
    );
    await mode(scope, "Tree").click();
    assert.equal(
      await scope.locator("[data-journey-ref]").count(),
      1,
      "mapping updates preserve collapsed child groups",
    );
    assert.deepEqual(errors, []);
  });

  await test("image errors are explicit and recover after URL replacement; same-ID UJG replacement resets modal state", async () => {
    await consumerPage();
    await openInitialScreen();
    await readyImage();
    await replaceFromCaller("Use missing screenshot file");
    await lightbox()
      .getByText("Screenshot unavailable.", { exact: true })
      .waitFor();
    assert.equal(await lightbox().locator("img").count(), 0);
    await lightbox().press("ArrowRight");
    await readyImage();
    assert.equal(await lightboxTitle(), "Completing sign-in");
    await replaceFromCaller("Restore screenshot map");
    await lightbox().press("ArrowLeft");
    await readyImage();
    assert.equal(await lightboxTitle(), "Sign-in required");
    await replaceFromCaller("Replace screenshot viewer document");
    assert.equal(await lightbox().count(), 0);
    assert.equal(await screensFirst().getByRole("searchbox").inputValue(), "");
    assert.equal(
      await mode(screensFirst(), "Tree").getAttribute("aria-pressed"),
      "true",
    );
    assert.equal(
      await screensFirst()
        .locator('aside[aria-label="Selection inspector"] header code')
        .textContent(),
      `${prefix}app-sign-in-required`,
    );
    assert.deepEqual(errors, []);
  });

  await test("hover previews float beside their opener while the inspector screenshot follows the selection", async () => {
    await consumerPage();
    const scope = screensFirst();
    const initialUrl = await thumbnail(scope)
      .locator("img")
      .getAttribute("src");
    await stateButton(scope, `${prefix}app-logged-in`, "Logged in").hover();
    assert.equal(
      await thumbnail(scope).locator("img").getAttribute("src"),
      initialUrl,
      "row hover never swaps the inspector image",
    );
    const opener = scope.getByRole("button", {
      name: "Screen mockup: Logged in",
      exact: true,
    });
    await opener.hover();
    const card = page
      .locator("[data-visible]")
      .filter({ has: page.locator('img[src$="app-logged-in.png"]') });
    await card.waitFor();
    await card.locator('[data-image-status="ready"]').waitFor();
    const placement = await card.evaluate((element) => {
      const box = element.getBoundingClientRect();
      return {
        left: box.left,
        right: box.right,
        top: box.top,
        bottom: box.bottom,
        width: box.width,
        hidden: element.getAttribute("aria-hidden"),
      };
    });
    const anchor = await opener.boundingBox();
    assert.equal(placement.hidden, "true");
    assert.ok(
      placement.left >= anchor.x + anchor.width || placement.right <= anchor.x,
      "the card sits beside its opener",
    );
    assert.ok(
      placement.top >= 0 && placement.bottom <= 900 && placement.width <= 248,
    );
    assert.match(await card.textContent(), /Logged in.*App auth journey · App/);
    await page.screenshot({
      path: `${evidence}/stage10d-hover-preview-1280.png`,
    });
    await scope.getByRole("searchbox").hover();
    await page
      .locator("[data-visible]")
      .waitFor({ state: "detached" })
      .catch(() => undefined);
    assert.equal(await page.locator("[data-visible]").count(), 0);
    await scope.getByRole("searchbox").fill("app-sign-in-required");
    await results(scope)
      .locator('[title="Screenshot available"]')
      .first()
      .waitFor();
    await page
      .getByRole("button", {
        name: "Remove first screenshot mapping",
        exact: true,
      })
      .click();
    assert.equal(
      await results(scope).locator('[title="Screenshot available"]').count(),
      0,
    );
    assert.equal(await thumbnail(scope).getByRole("button").count(), 0);
    await thumbnail(scope)
      .getByText("Screenshot unavailable.", { exact: true })
      .waitFor();
    const appFilter = scope.locator(`[data-touchpoint-ref="${prefix}app"]`);
    assert.equal(await appFilter.textContent(), "App");
    const dot = appFilter.locator('[aria-hidden="true"]');
    assert.equal(
      await dot.evaluate(
        (element) => getComputedStyle(element).backgroundColor,
      ),
      "rgb(227, 138, 82)",
    );
    assert.equal(
      await scope
        .getByRole("heading", { name: "App auth journey", exact: true })
        .count(),
      1,
    );
    assert.deepEqual(errors, []);
  });

  await test("multiple surfaces preserve composite disclosure and reused views show distinct call-site counters", async () => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(
      `${url}/iframe.html?id=viewer-journeyviewer--several-surfaces&viewMode=story`,
    );
    const scope = page.locator("#storybook-root");
    await scope
      .getByRole("button", { name: "Collapse all", exact: true })
      .click();
    await scope
      .locator('[data-state-ref="urn:composite"]')
      .getByRole("button", { name: /^Screen mockup: Call shared/ })
      .click();
    await readyImage();
    assert.equal(await lightboxTitle(), "Call shared");
    await lightbox().press("Escape");
    assert.equal(
      await scope.locator('[data-journey-ref="urn:child"]').count(),
      0,
    );
    const leaf = scope.locator('[data-state-ref="urn:leaf"]');
    assert.equal(
      await leaf.getByRole("button", { name: /^Screen mockup:/ }).count(),
      2,
    );
    await leaf.getByRole("button", { name: /opaque:9/ }).click();
    await readyImage();
    assert.match(
      await lightbox().getByRole("img").getAttribute("src"),
      /app-logged-in\.png$/,
    );
    await lightbox().press("Escape");
    assert.equal(
      await scope.locator('[data-journey-ref="urn:child"]').count(),
      0,
    );
    await stateButton(scope, "urn:composite", "Call shared").click();
    assert.equal(
      await scope.locator('[data-journey-ref="urn:child"]').count(),
      3,
    );
    const shared = scope
      .locator('[data-journey-ref="urn:child"]')
      .nth(1)
      .getByRole("button", { name: /^Screen mockup:/ });
    await shared.click();
    await readyImage();
    assert.match(await lightbox().textContent(), /reference 2 of 2/);
    assert.equal(await position(), "5 / 6 views · 2 of 3 call sites");
    const sharedSource = await lightbox().getByRole("img").getAttribute("src");
    for (const width of [320, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > window.innerWidth,
        ),
        false,
      );
      assert.equal(
        await lightbox().evaluate(
          (element) => element.scrollWidth > element.clientWidth + 1,
        ),
        false,
      );
      await lightbox().screenshot({
        path: `${evidence}/stage10d-call-sites-${width}.png`,
      });
    }
    await lightbox().press("ArrowRight");
    await readyImage();
    assert.equal(await position(), "6 / 6 views · 3 of 3 call sites");
    assert.equal(
      await lightbox().getByRole("img").getAttribute("src"),
      sharedSource,
    );
    assert.match(await lightbox().textContent(), /Other parent/);
    await lightbox().press("ArrowRight");
    assert.equal(await position(), "1 / 6 views");
    await lightbox().press("ArrowLeft");
    assert.equal(await position(), "6 / 6 views · 3 of 3 call sites");
    assert.deepEqual(errors, []);
    await lightbox().press("Escape");
  });

  await test("thumbnails and the phone-sized lightbox fit mobile and shared thresholds with compiled styles", async () => {
    await consumerPage();
    await openInitialScreen();
    await readyImage();
    for (const width of [320, 859, 860, 861, 1099, 1100, 1101, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > window.innerWidth,
        ),
        false,
        `screens overflow at ${width}`,
      );
      const bounds = await lightbox().evaluate((element) => {
        const box = element.getBoundingClientRect();
        const image = element.querySelector("img").getBoundingClientRect();
        return {
          box,
          image,
          ratio: image.width / image.height,
          overflow: element.scrollWidth > element.clientWidth + 1,
        };
      });
      assert.ok(
        bounds.box.left >= 0 &&
          bounds.box.right <= width + 1 &&
          bounds.box.top >= 0 &&
          bounds.box.bottom <= 901,
        `dialog bounds at ${width}`,
      );
      assert.ok(
        bounds.image.left >= bounds.box.left - 1 &&
          bounds.image.right <= bounds.box.right + 1,
        `image bounds at ${width}`,
      );
      assert.ok(
        Math.abs(bounds.ratio - 840 / 1520) < 0.02,
        `portrait screenshot keeps its ratio at ${width}`,
      );
      assert.ok(bounds.image.height <= 761, "the image is at most 760px tall");
      assert.equal(bounds.overflow, false);
      if (width === 320 || width === 1280)
        await lightbox().screenshot({
          path: `${evidence}/stage10d-lightbox-${width}.png`,
        });
    }
    await lightbox().press("Escape");
    for (const [width, expected] of [
      [320, 110],
      [1280, 150],
    ]) {
      await page.setViewportSize({ width, height: 900 });
      const preview = thumbnail(screensFirst());
      await preview.scrollIntoViewIfNeeded();
      await preview.locator('[data-image-status="ready"]').waitFor();
      assert.equal(
        Math.round(
          await preview
            .locator("img")
            .evaluate((element) => element.getBoundingClientRect().width),
        ),
        expected,
      );
      await preview.screenshot({
        path: `${evidence}/stage10d-thumbnail-${width}.png`,
      });
    }
    assert.deepEqual(errors, []);
  });

  const extensionsFirst = () => page.getByTestId("extensions-first");
  const extensionsSecond = () => page.getByTestId("extensions-second");
  const extensionState = () =>
    extensionsFirst().evaluate((element) => ({
      identity: element.querySelector(
        'aside[aria-label="Selection inspector"] header code',
      )?.textContent,
      crumb: element.querySelector(
        'aside[aria-label="Selection inspector"] header p',
      )?.textContent,
      query: element.querySelector('input[type="search"]')?.value,
      columns: element.querySelector('[aria-label="Journey columns"]') !== null,
      journeys: [...element.querySelectorAll("[data-journey-ref]")].map(
        (node) => node.getAttribute("data-journey-ref"),
      ),
      disclosure: [...element.querySelectorAll("button[aria-expanded]")].map(
        (node) => node.getAttribute("aria-expanded"),
      ),
      filters: [...element.querySelectorAll("button[data-touchpoint-ref]")].map(
        (node) => node.getAttribute("aria-pressed"),
      ),
    }));

  await test("compiled descriptors add panels/annotations and override rows while retaining native controls and children", async () => {
    await consumerPage();
    const scope = extensionsFirst();
    await inspector(scope)
      .getByRole("heading", { name: "Source note", exact: true })
      .waitFor();
    assert.equal(
      await scope.getByText("Review nested boundary", { exact: true }).count(),
      2,
    );
    assert.equal(
      await scope
        .getByRole("list", { name: "Annotations", exact: true })
        .count(),
      0,
    );
    assert.match(
      await inspector(scope).ariaSnapshot(),
      /Review nested boundary/,
    );
    assert.equal(
      await scope
        .getByText("Custom boundary presentation", { exact: true })
        .count(),
      1,
    );
    assert.equal(
      await inspector(scope)
        .getByRole("heading", { name: /^Incoming/ })
        .count(),
      1,
    );
    assert.equal(
      await scope.locator('[data-journey-ref="urn:test:shared"]').count(),
      3,
    );
    assert.equal(
      await extensionsSecond()
        .getByText("Review nested boundary", { exact: true })
        .count(),
      0,
    );
    assert.equal(
      await inspector(extensionsSecond())
        .getByRole("heading", { name: "Source note", exact: true })
        .count(),
      0,
    );
    const state = scope.locator('[data-state-ref="urn:test:compose"]');
    await state
      .getByRole("button", {
        name: "Collapse Several child journeys",
        exact: true,
      })
      .focus();
    await page.keyboard.press("Space");
    assert.equal(
      await scope.locator('[data-journey-ref="urn:test:shared"]').count(),
      0,
    );
    await page
      .getByRole("button", { name: "Toggle example extensions", exact: true })
      .click();
    assert.equal(
      await scope.locator('[data-journey-ref="urn:test:shared"]').count(),
      0,
    );
    await page
      .getByRole("button", { name: "Toggle example extensions", exact: true })
      .click();
    assert.equal(
      await scope.locator('[data-journey-ref="urn:test:shared"]').count(),
      0,
    );
    const custom = state.getByRole("button", {
      name: /^Several child journeys Custom boundary presentation$/,
    });
    await custom.focus();
    await page.keyboard.press("Enter");
    assert.equal(await identity(scope), "urn:test:compose");
    assert.equal(
      await scope.locator('[data-journey-ref="urn:test:shared"]').count(),
      3,
    );
    await scope.getByRole("searchbox").fill("urn:test:first");
    await scope.getByRole("searchbox").press("Enter");
    assert.equal(await identity(scope), "urn:test:first");
    assert.equal(
      await inspector(scope)
        .getByRole("heading", { name: "Source note", exact: true })
        .count(),
      1,
    );
    await contracts(scope, "1 entry · 1 exit").click();
    await scope
      .locator('[data-contract-ref="urn:test:entry"]')
      .getByRole("button")
      .click();
    assert.equal(await identity(scope), "urn:test:entry");
    await scope
      .locator('[data-contract-ref="urn:test:exit"]')
      .getByRole("button")
      .click();
    assert.equal(await identity(scope), "urn:test:exit");
    assert.match(
      await inspector(scope).textContent(),
      /This exit is read directly from/,
    );
    assert.deepEqual(errors, []);
  });

  await test("descriptor replacement/removal preserves repeated occurrence, columns, query, filters and disclosure in one instance", async () => {
    await consumerPage();
    const scope = extensionsFirst();
    await stateButton(
      scope.locator('[data-journey-ref="urn:test:shared"]').nth(1),
      "urn:test:repeat",
      "Recurse here",
    ).click();
    await mode(scope, "Columns").click();
    await scope.getByRole("searchbox").fill("Recurse");
    await scope
      .getByRole("group", { name: "Touchpoint filter" })
      .getByRole("button", { name: "Web", exact: true })
      .click();
    const active = await extensionState();
    assert.equal(active.identity, "urn:test:repeat");
    assert.equal(active.columns, true);
    assert.deepEqual(active.filters, ["true", "false"]);
    assert.match(active.crumb, /reference 2 of 2/);
    await page
      .getByRole("button", { name: "Replace example extensions", exact: true })
      .click();
    assert.deepEqual(await extensionState(), active);
    assert.equal(
      await scope.getByText("Review nested boundary", { exact: true }).count(),
      0,
    );
    await page
      .getByRole("button", { name: "Toggle example extensions", exact: true })
      .click();
    assert.deepEqual(await extensionState(), active);
    assert.equal(
      await inspector(scope)
        .getByRole("heading", { name: "Source note", exact: true })
        .count(),
      0,
    );
    assert.equal(await identity(extensionsSecond()), "urn:test:compose");
    assert.equal(
      await extensionsSecond().getByRole("searchbox").inputValue(),
      "",
    );
    await page
      .getByRole("button", { name: "Toggle example extensions", exact: true })
      .click();
    assert.deepEqual(await extensionState(), active);
    await mode(scope, "Tree").click();
    assert.equal(
      await scope
        .getByText("Custom boundary presentation", { exact: true })
        .count(),
      1,
    );
    await page
      .getByRole("button", { name: "Toggle example extensions", exact: true })
      .click();
    assert.equal(
      await scope
        .getByText("Custom boundary presentation", { exact: true })
        .count(),
      0,
    );
    assert.equal(
      await stateButton(
        scope,
        "urn:test:compose",
        "Several child journeys",
      ).count(),
      1,
    );
    await page
      .getByRole("button", { name: "Toggle example extensions", exact: true })
      .click();
    await page
      .getByRole("button", {
        name: "Replace extension viewer document",
        exact: true,
      })
      .click();
    assert.equal(await identity(scope), "urn:test:compose");
    assert.equal(await scope.getByRole("searchbox").inputValue(), "");
    assert.equal(await lanes(scope).count(), 0);
    assert.equal(
      await inspector(scope)
        .getByRole("heading", { name: "Source note", exact: true })
        .count(),
      1,
    );
    assert.deepEqual(errors, []);
  });
  await test("extension content fits mobile and shared thresholds and restores the default presentation on removal", async () => {
    await page.goto(
      `${url}/iframe.html?id=viewer-journeyviewer--removable-extensions&viewMode=story`,
    );
    await page
      .getByRole("heading", { name: "Source note", exact: true })
      .waitFor();
    for (const width of [320, 859, 860, 861, 1099, 1100, 1101, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > window.innerWidth,
        ),
        false,
        `extensions overflow at ${width}`,
      );
      if (width === 320 || width === 1280) {
        await page
          .getByRole("button", {
            name: "Toggle example extensions",
            exact: true,
          })
          .scrollIntoViewIfNeeded();
        await page.screenshot({
          path: `${evidence}/stage9-extensions-${width}.png`,
        });
        await page
          .getByRole("complementary", { name: "Selection inspector" })
          .screenshot({ path: `${evidence}/stage9-panel-${width}.png` });
      }
    }
    await page
      .getByRole("button", { name: "Toggle example extensions", exact: true })
      .click();
    assert.equal(
      await page
        .getByText("Custom boundary presentation", { exact: true })
        .count(),
      0,
    );
    assert.equal(
      await page.getByText("Review nested boundary", { exact: true }).count(),
      0,
    );
    assert.equal(
      await page
        .getByRole("heading", { name: "Source note", exact: true })
        .count(),
      0,
    );
    assert.equal(
      await page.locator('[data-journey-ref="urn:test:shared"]').count(),
      3,
    );
    assert.deepEqual(errors, []);
  });
} finally {
  await browser?.close();
  await new Promise((done) => server.close(done));
}
