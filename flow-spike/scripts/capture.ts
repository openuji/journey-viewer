import { createServer } from "node:http";
import { readdirSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { chromium } from "playwright";
import type { Page } from "playwright";
import { format } from "prettier";

/**
 * Browser evidence against the built Storybook (`pnpm build` first): screenshots, the artifact
 * readout of the layout actually rendered, disclosure displacement, the journey path, shared
 * Tree/Flow state, detail and placement switching, every mapped screen and axe results. Writes
 * `evidence/`.
 */
const root = new URL("../storybook-static/", import.meta.url).pathname;
const evidence = new URL("../evidence/", import.meta.url).pathname;
const types: Record<string, string> = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".json": "application/json",
  ".woff2": "font/woff2",
};
const server = createServer(async (request, response) => {
  const path = normalize(
    decodeURIComponent(new URL(request.url ?? "/", "http://local").pathname),
  ).replace(/^\/+/, "");
  try {
    const body = await readFile(join(root, path || "index.html"));
    response.writeHead(200, {
      "content-type": types[extname(path)] ?? "application/octet-stream",
    });
    response.end(body);
  } catch {
    response.writeHead(404);
    response.end();
  }
}).listen(0, "127.0.0.1");
await new Promise((resolve) => server.once("listening", resolve));
const port = (server.address() as { port: number }).port;
const pnpmStore = new URL("../node_modules/.pnpm/", import.meta.url).pathname;
const axeDirectory = readdirSync(pnpmStore).find((name) =>
  name.startsWith("axe-core@"),
);
const axePath = axeDirectory
  ? join(pnpmStore, axeDirectory, "node_modules/axe-core/axe.min.js")
  : undefined;

const browser = await chromium.launch(
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
    : {},
);
const results: Record<string, unknown> = {};
const errors: string[] = [];

const open = async (
  id: string,
  width: number,
  height: number,
  theme = "light",
): Promise<Page> => {
  const page = await browser.newPage({ viewport: { width, height } });
  page.on("pageerror", (error) => errors.push(`${id}: ${error.message}`));
  await page.goto(
    `http://127.0.0.1:${port}/iframe.html?id=${id}&viewMode=story&globals=theme:${theme}`,
  );
  await page.waitForSelector("#storybook-root > *");
  await page.waitForTimeout(500);
  return page;
};
const artifacts = async (page: Page) =>
  JSON.parse(
    (await page
      .locator("[data-artifacts]")
      .first()
      .getAttribute("data-artifacts")) ?? "null",
  );
const shoot = async (
  id: string,
  file: string,
  width: number,
  height: number,
  theme = "light",
) => {
  const page = await open(id, width, height, theme);
  await page.screenshot({ path: join(evidence, file) });
  const readout =
    (await page.locator("[data-artifacts]").count()) > 0
      ? await artifacts(page)
      : null;
  await page.close();
  return readout;
};
const card = (key: string) =>
  `[data-flow-key="card:${key.replaceAll('"', '\\"')}"]`;
const ROOT = "urn:ujg:solid-oidc:app-auth-journey";
const IDP =
  "urn:ujg:solid-oidc:app-auth-journey|1:urn:ujg:solid-oidc:idp-auth-flow";
const MFA =
  "urn:ujg:solid-oidc:app-auth-journey 1.0|6:urn:ujg:solid-oidc:idp-mfa-challenge";

// 1. Screenshots with the rendered layout's artifact readout.
const shots: [string, string, number, number, string?][] = [
  ["study-flowstudy--collapsed", "flow-collapsed-1440.png", 1440, 900],
  ["study-flowstudy--collapsed", "flow-collapsed-375.png", 375, 812],
  ["study-flowstudy--app-with-idp-open", "flow-idp-open-1440.png", 1440, 900],
  [
    "study-flowstudy--app-with-idp-open",
    "flow-idp-open-1440-dark.png",
    1440,
    900,
    "dark",
  ],
  ["study-flowstudy--app-with-idp-open", "flow-idp-open-1099.png", 1099, 900],
  ["study-flowstudy--app-with-idp-open", "flow-idp-open-375.png", 375, 812],
  [
    "study-flowstudy--everything-open-spec",
    "flow-everything-open-spec-1440.png",
    1440,
    900,
  ],
  [
    "study-flowstudy--scope-recursion-and-reuse",
    "scope-recursion-reuse-1440.png",
    1440,
    900,
  ],
  [
    "study-flowstudy--scope-sibling-child-journeys",
    "scope-sibling-children-1440.png",
    1440,
    900,
  ],
  [
    "study-flowstudy--scope-childless-composites",
    "scope-childless-1440.png",
    1440,
    900,
  ],
  [
    "study-flowstudy--scope-outgoing-navigation",
    "scope-outgoing-1440.png",
    1440,
    900,
  ],
  [
    "primitives-compositecard--same-card-both-states",
    "card-both-states.png",
    900,
    320,
  ],
  [
    "primitives-contractglyph--entries-on-the-top-border",
    "contracts-entries.png",
    640,
    200,
  ],
  [
    "primitives-contractglyph--exits-on-the-bottom-border",
    "contracts-exits.png",
    640,
    200,
  ],
  ["primitives-connector--gallery", "connectors.png", 1440, 220],
  ["flow-routeoverlay--gallery", "route-overlay.png", 900, 420],
  [
    "study-enginecomparison--app-with-idp-open",
    "engines-idp-open-1440.png",
    1440,
    900,
  ],
  ["flow-flowkey--spec", "key-spec.png", 640, 380],
];
const rendered: Record<string, unknown> = {};
for (const [id, file, width, height, theme] of shots) {
  const readout = await shoot(id, file, width, height, theme);
  if (readout) rendered[`${file}`] = readout;
}
results.renderedArtifacts = rendered;

// 2. Fit overview of the stress case.
{
  const page = await open("study-flowstudy--everything-open-spec", 1440, 900);
  await page
    .getByRole("radio", { name: "Fit" })
    .or(page.getByRole("button", { name: "Fit" }))
    .first()
    .click();
  await page.waitForTimeout(400);
  await page.screenshot({
    path: join(evidence, "flow-everything-open-fit-1440.png"),
  });
  results.fitScale = await page
    .locator("[data-scale]")
    .first()
    .getAttribute("data-scale");
  await page.close();
}

// 3. Disclosure keeps the toggled card where it was on screen.
{
  const page = await open("study-flowstudy--app-with-idp-open", 1440, 900);
  const measure = async (key: string) =>
    (await page.locator(card(key)).boundingBox())!;
  const toggle = async (key: string) => {
    const before = await measure(key);
    await page.locator(`${card(key)} button[aria-expanded]`).click();
    await page.waitForTimeout(450);
    const after = await measure(key);
    return {
      dx: Math.round((after.x - before.x) * 10) / 10,
      dy: Math.round((after.y - before.y) * 10) / 10,
    };
  };
  results.disclosureDisplacement = {
    collapseIdp: await toggle(IDP),
    expandIdp: await toggle(IDP),
    expandMfaInsideIdp: await toggle(MFA),
  };
  await page.screenshot({
    path: join(evidence, "flow-mfa-open-anchored-1440.png"),
  });
  await page.close();
}

// 3b. Activation: pointing at a block draws its own routes over the shared corridors.
{
  const page = await open("study-flowstudy--app-with-idp-open", 1440, 900);
  await page
    .locator('[data-flow-key*="0:urn:ujg:solid-oidc:idp-account-selection"]')
    .first()
    .hover();
  await page.waitForTimeout(200);
  await page.screenshot({
    path: join(evidence, "flow-idp-open-hover-1440.png"),
  });
  results.activation = {
    routeMarks: await page.locator("svg path[data-tone]").count(),
    restingConnectors: await page.locator("svg g[data-rest]").count(),
  };
  await page.close();
}

// 3c. Activation of the cases raised in review: two-way lines with a return, single contact points,
// exits with and without a parent continuation, and a choice inside MFA.
{
  const routes: Record<string, unknown> = {};
  const hover = async (
    page: Awaited<ReturnType<typeof open>>,
    fragment: string,
    file: string,
  ) => {
    // Fragments name a block key, so entries, exits and states with similar ids are not confused.
    const block = page.locator(`[data-flow-key*="${fragment}"]`).first();
    await block.scrollIntoViewIfNeeded();
    await block.hover();
    await page.waitForTimeout(200);
    await page.screenshot({ path: join(evidence, file) });
    routes[file] = {
      marks: await page.locator("svg path[data-tone]").count(),
      sharedHalves: await page.locator("svg path[data-shared]").count(),
      halfArrowheads: await page.locator("svg path[data-half]").count(),
    };
  };
  const collapsedPage = await open("study-flowstudy--collapsed", 1440, 900);
  await hover(
    collapsedPage,
    "|4:urn:ujg:solid-oidc:app-access-denied",
    "flow-hover-access-denied-collapsed-1440.png",
  );
  await collapsedPage.close();

  const page = await open("study-flowstudy--app-with-idp-open", 1440, 900);
  await hover(
    page,
    "|4:urn:ujg:solid-oidc:app-access-denied",
    "flow-hover-access-denied-open-1440.png",
  );
  await hover(
    page,
    "|3:urn:ujg:solid-oidc:idp-account-recovery",
    "flow-hover-account-recovery-1440.png",
  );
  await hover(
    page,
    "|1:urn:ujg:solid-oidc:idp-login",
    "flow-hover-login-1440.png",
  );
  await hover(
    page,
    "exit:urn:ujg:solid-oidc:idp-auth-denied",
    "flow-hover-exit-denied-1440.png",
  );
  await hover(
    page,
    "exit:urn:ujg:solid-oidc:idp-auth-success",
    "flow-hover-exit-1440.png",
  );
  await page.locator(`${card(MFA)} button[aria-expanded]`).click();
  await page.waitForTimeout(450);
  await hover(
    page,
    "|0:urn:ujg:solid-oidc:mfa-method-choice",
    "flow-hover-mfa-choice-1440.png",
  );
  await page.close();
  results.reviewHovers = routes;
}

// 4. Context strip: the active journey path. Opening a composite extends it; returning to a step
// closes what is open inside that journey and brings it to the top-left corner.
{
  const paths: Record<string, unknown> = {};
  for (const theme of ["light", "dark"]) {
    const page = await open("study-flowstudy--collapsed", 1440, 900, theme);
    const strip = page.getByRole("navigation", { name: "Journey path" });
    const steps = () => strip.locator("li").allInnerTexts();
    const context = async (...keys: string[]) =>
      Object.fromEntries(
        await Promise.all(
          keys.map(async (key) => [
            key.split(":").pop(),
            await page
              .locator(`[data-flow-key="frame:${key}"]`)
              .getAttribute("data-context"),
          ]),
        ),
      );
    const opened = async (key: string) => {
      await page.locator(`${card(key)} button[aria-expanded]`).click();
      await page.waitForTimeout(450);
    };
    const atRoot = await steps();
    await opened(IDP);
    const idpOpened = { steps: await steps(), ...(await context(ROOT, IDP)) };
    await opened(MFA);
    const mfaOpened = {
      steps: await steps(),
      ...(await context(ROOT, IDP, MFA)),
    };
    await page.mouse.move(5, 890);
    await page.screenshot({
      path: join(
        evidence,
        `flow-context-path-1440${theme === "dark" ? "-dark" : ""}.png`,
      ),
    });
    const region = page.locator('[role="region"][aria-label="Journey flow"]');
    await region.evaluate((element) => {
      element.scrollTop += 600;
      element.scrollLeft += 300;
    });
    await page.waitForTimeout(200);
    await strip
      .getByRole("button", { name: "App auth journey", exact: true })
      .click();
    await page.waitForTimeout(1200);
    const viewport = (await region.boundingBox())!;
    const heading = (await page.locator(card(ROOT)).boundingBox())!;
    paths[theme] = {
      atRoot,
      idpOpened,
      mfaOpened,
      returnedToRoot: {
        steps: await steps(),
        openToggles: await page.locator('button[aria-expanded="true"]').count(),
        headingOffset: {
          x: Math.round((heading.x - viewport.x) * 10) / 10,
          y: Math.round((heading.y - viewport.y) * 10) / 10,
        },
      },
    };
    if (theme === "light")
      await page.screenshot({
        path: join(evidence, "flow-context-returned-1440.png"),
      });
    await page.close();
  }
  results.contextPath = paths;
}

// 4b. A card click that opens a composite moves the path and the paper frame, as its chevron does:
// the story's own play function, then the same clicks by mouse on a story without one.
{
  const SMS =
    "urn:ujg:solid-oidc:app-auth-journey 1.0 6.0|3:urn:ujg:solid-oidc:mfa-sms-message";
  const PUSH =
    "urn:ujg:solid-oidc:app-auth-journey 1.0 6.0|7:urn:ujg:solid-oidc:mfa-push-approval";
  const state = async (page: Page) => ({
    steps: await page
      .getByRole("navigation", { name: "Journey path" })
      .locator("li")
      .allInnerTexts(),
    current: await page
      .locator('[data-flow-key^="frame:"][data-context="current"]')
      .evaluateAll((frames) =>
        frames.map((f) => f.getAttribute("data-flow-key")!.split(":").pop()),
      ),
  });
  const story = await open("study-flowstudy--opened-by-card-click", 1440, 900);
  await story.waitForTimeout(1500);
  const played = await state(story);
  await story.close();

  const page = await open("study-flowstudy--app-with-idp-open", 1440, 900);
  const clicked: Record<string, unknown> = {};
  for (const key of [MFA, SMS, PUSH]) {
    const select = page.locator(`${card(key)} button:not([aria-expanded])`);
    await select.scrollIntoViewIfNeeded();
    await select.click();
    await page.waitForTimeout(450);
    clicked[key.split(":").pop()!] = await state(page);
  }
  await page.mouse.move(5, 890);
  await page.screenshot({
    path: join(evidence, "flow-context-card-click-1440.png"),
  });
  // A plain state marks its journey: the path ends there and its frame is paper.
  const login = page
    .locator(
      '[data-flow-key="state:urn:ujg:solid-oidc:app-auth-journey 1.0|1:urn:ujg:solid-oidc:idp-login"] button',
    )
    .first();
  await login.click();
  await page.waitForTimeout(300);
  clicked["idp-login (plain state)"] = {
    selected: await login.getAttribute("aria-current"),
    ...(await state(page)),
  };
  await page.close();
  results.cardClickPath = { played, clicked };
}

// 5. One snapshot behind Tree and Flow; detail changes presentation only.
{
  const page = await open("study-flowstudy--shared-with-tree", 1440, 900);
  await page
    .locator("button", { hasText: /^Login$/ })
    .first()
    .click();
  await page.getByText("Flow", { exact: true }).click();
  await page.waitForTimeout(300);
  const flowSelected = await page
    .locator('[data-flow-key^="state:"] button[aria-current="true"]')
    .allInnerTexts();
  const idpOpen =
    (await page.locator(`[data-flow-key="frame:${IDP}"]`).count()) === 1;
  await page.getByText("Tree", { exact: true }).click();
  await page.waitForTimeout(300);
  const treeSelected = await page
    .locator('button[aria-pressed="true"]')
    .allInnerTexts();
  await page.getByText("Flow", { exact: true }).click();
  await page.waitForTimeout(300);
  const node = page.locator('[data-flow-key*="idp-login"]').first();
  const stakeholderBox = await node.boundingBox();
  const stakeholderIds = (
    await page.locator("main + div").innerText()
  ).includes("urn:");
  const stakeholderChips = await page
    .locator("svg text", { hasText: /^×\d+$/ })
    .count();
  await page.getByText("Spec", { exact: true }).click();
  await page.waitForTimeout(300);
  const specBox = await node.boundingBox();
  results.sharedState = {
    flowSelectedAfterTreeClick: flowSelected,
    idpOpenInFlow: idpOpen,
    treeSelectedAfterReturn: treeSelected
      .map((text) => text.trim())
      .filter(Boolean),
  };
  results.detail = {
    sameGeometryAcrossDetail:
      JSON.stringify(stakeholderBox) === JSON.stringify(specBox),
    stakeholderShowsIdentifiers: stakeholderIds,
    specShowsIdentifiers: (
      await page.locator("main + div").innerText()
    ).includes("urn:"),
    stakeholderCountChips: stakeholderChips,
    specCountChips: await page
      .locator("svg text", { hasText: /^×\d+$/ })
      .count(),
  };
  await page.close();
}

// 5b. Placement re-lays out the canvas: the IdP main path's left edges and centres, and the artifact
// readout with browser text metrics, for each placement.
{
  const page = await open("study-flowstudy--app-with-idp-open", 1440, 900);
  const path = [
    "idp-account-selection",
    "idp-login",
    "idp-mfa-challenge",
    "idp-after-mfa",
    "idp-identity-consent-flow",
    "idp-resource-consent-flow",
  ];
  const placements: Record<string, unknown> = {};
  for (const [label, file] of [
    ["Aligned centre", "flow-placement-aligned-center-1440.png"],
    ["Aligned left", "flow-placement-aligned-left-1440.png"],
    ["Median", "flow-placement-median-1440.png"],
  ] as const) {
    await page.getByRole("button", { name: label, exact: true }).click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: join(evidence, file) });
    const boxes = await Promise.all(
      path.map(
        async (id) =>
          (await page
            .locator(`[data-flow-key$="urn:ujg:solid-oidc:${id}"]`)
            .first()
            .boundingBox())!,
      ),
    );
    const spread = (values: number[]) =>
      Math.round((Math.max(...values) - Math.min(...values)) * 10) / 10;
    placements[label] = {
      leftEdgeSpread: spread(boxes.map((b) => b.x)),
      centreSpread: spread(boxes.map((b) => b.x + b.width / 2)),
      artifacts: await artifacts(page),
    };
  }
  results.placement = placements;
  await page.close();
}

// 6. Every mapped screen opens in the lightbox.
{
  const page = await open("study-flowstudy--collapsed", 1440, 900);
  await page
    .locator('button[aria-label^="Screen: Sign-in required"]')
    .first()
    .click();
  const sources = new Set<string>();
  const broken: string[] = [];
  for (let step = 0; step < 40; step++) {
    const image = page.getByRole("dialog").locator("img").first();
    await image.waitFor();
    await image.evaluate(
      (element) =>
        new Promise((resolve) => {
          const img = element as HTMLImageElement;
          if (img.complete) resolve(null);
          else img.addEventListener("load", resolve, { once: true });
          img.addEventListener("error", resolve, { once: true });
        }),
    );
    const source = (await image.getAttribute("src")) ?? "";
    if (sources.has(source)) break;
    sources.add(source);
    if (
      !(await image.evaluate(
        (element) => (element as HTMLImageElement).naturalWidth > 0,
      ))
    )
      broken.push(source);
    await page.getByRole("button", { name: "Next screen" }).click();
  }
  results.screens = { distinct: sources.size, broken };
  await page.close();
}

// 7. Accessibility (axe) on the flow surfaces in both themes.
if (axePath) {
  const axe = await readFile(axePath, "utf8");
  const audits: Record<string, unknown> = {};
  for (const [id, theme] of [
    ["study-flowstudy--app-with-idp-open", "light"],
    ["study-flowstudy--app-with-idp-open", "dark"],
    ["study-flowstudy--everything-open-spec", "light"],
    ["primitives-contractglyph--entries-on-the-top-border", "light"],
    ["flow-contextstrip--two-journeys-opened", "light"],
    ["flow-flowkey--spec", "light"],
    ["flow-flowkey--spec", "dark"],
    ["flow-routeoverlay--gallery", "light"],
  ] as const) {
    const page = await open(id, 1440, 900, theme);
    await page.addScriptTag({ content: axe });
    const result = await page.evaluate(async () => {
      const run = await (
        window as unknown as {
          axe: {
            run: (context: string) => Promise<{
              violations: { id: string; impact: string; nodes: unknown[] }[];
            }>;
          };
        }
      ).axe.run("#storybook-root");
      return run.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        nodes: v.nodes.length,
      }));
    });
    audits[`${id} (${theme})`] = result;
    await page.close();
  }
  results.axe = audits;
}

results.pageErrors = errors;
await browser.close();
server.close();
await writeFile(
  join(evidence, "browser.json"),
  await format(JSON.stringify(results), { parser: "json" }),
);
console.log(JSON.stringify(results, null, 2));
