import { createServer } from "node:http";
import { readdirSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { chromium } from "playwright";
import type { Page } from "playwright";
import { format } from "prettier";

/**
 * Browser evidence against the built Storybook (`pnpm build` first): screenshots, the artifact
 * readout of the layout actually rendered, disclosure displacement, the context strip, shared
 * Tree/Flow state, detail switching, every mapped screen and axe results. Writes `evidence/`.
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

// 4. Context strip: scrolled inside open frames whose cards are out of view.
{
  const page = await open("study-flowstudy--everything-open-spec", 1440, 900);
  await page
    .locator('[role="region"][aria-label="Journey flow"]')
    .evaluate((element) => {
      element.scrollTop += 900;
      element.scrollLeft += 400;
    });
  await page.waitForTimeout(400);
  const strip = page.getByRole("navigation", {
    name: "Open containers in view",
  });
  results.contextStrip = {
    visible: await strip.isVisible(),
    items: await strip.locator("li").allInnerTexts(),
  };
  await page.screenshot({
    path: join(evidence, "flow-context-strip-1440.png"),
  });
  await page.close();
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
    ["flow-contextstrip--inside-two-open-frames", "light"],
    ["flow-flowkey--spec", "light"],
    ["flow-flowkey--spec", "dark"],
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
