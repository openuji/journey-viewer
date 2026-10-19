import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { readDevelopmentTheme, readTokens } from "../scripts/token-data.mjs";
import { generateTokens, themeCss } from "../scripts/tokens.mjs";
import { checkTokens } from "../scripts/token-checks.mjs";

const freeze = (value) => {
  if (value && typeof value === "object") {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
};
const { foundation, themes } = freeze(await readTokens());

test("generates deterministically from frozen DTCG without editing or checking it", async () => {
  const before = JSON.stringify({ foundation, themes });
  const first = generateTokens(foundation, themes);
  assert.deepEqual(first, generateTokens(foundation, themes));
  assert.equal(JSON.stringify({ foundation, themes }), before);
  assert.match(first.tailwindCss, /--breakpoint-md: 53\.75rem/);
  assert.match(first.tailwindCss, /--breakpoint-lg: 68\.75rem/);
  assert.match(first.tailwindCss, /--\*: initial/);
  assert.match(first.tailwindCss, /--color-accent: var\(--jv-color-accent\)/);
  assert.match(first.tailwindCss, /--spacing-space-sm: var\(--jv-space-sm\)/);
  assert.match(first.tailwindCss, /--spacing-size-control-sm:/);
  assert.match(first.tailwindCss, /--font-sans: var\(--jv-font-sans\)/);
  assert.equal(
    (
      await readFile(new URL("../scripts/tokens.mjs", import.meta.url), "utf8")
    ).includes("token-checks"),
    false,
  );
});

test("one source value drives generated variables referenced by both utilities and modules", () => {
  const changed = structuredClone(foundation);
  changed.foundation.space.sm.$value.value = 1.25;
  const generated = generateTokens(freeze(changed), themes);
  assert.match(generated.tokensCss, /--jv-space-sm: 1\.25rem/);
  assert.match(
    generated.tailwindCss,
    /--spacing-space-sm: var\(--jv-space-sm\)/,
  );
  assert.notEqual(
    generated.tokensCss,
    generateTokens(foundation, themes).tokensCss,
  );
});

test("checks production and additional themes separately, including nested alias values", async () => {
  const alternate = freeze(await readDevelopmentTheme());
  assert.deepEqual(checkTokens(foundation, { ...themes, alternate }), []);
  const css = themeCss(foundation, "alternate", alternate);
  assert.match(css, /data-jv-theme="alternate"/);
  assert.match(css, /--jv-font-sans: "Georgia", serif/);
  assert.match(css, /--jv-space-sm: 0\.75rem/);
  assert.doesNotMatch(
    generateTokens(foundation, themes).tokensCss,
    /alternate/,
  );
});

test("checks missing references, cycles, incompatible aliases, invalid types and missing theme keys", () => {
  const missing = structuredClone(themes);
  missing.dark.color.accent.$value = "{foundation.absent}";
  assert.match(
    checkTokens(foundation, missing)
      .map((f) => f.message)
      .join(),
    /Unknown token/,
  );
  assert.throws(() => generateTokens(foundation, missing), /Unknown token/);
  const cycle = structuredClone(themes);
  cycle.light.color.accent.$value = "{color.accent}";
  assert.match(
    checkTokens(foundation, cycle)
      .map((f) => f.message)
      .join(),
    /cyclic/,
  );
  const incompatible = structuredClone(themes);
  incompatible.light.color.accent.$value = "{foundation.space.sm}";
  assert.match(
    checkTokens(foundation, incompatible)
      .map((f) => f.message)
      .join(),
    /Alias type/,
  );
  const malformed = structuredClone(themes);
  malformed.light.space.sm.$value = { value: "large", unit: "em" };
  malformed.light.color.accent.$value = {
    colorSpace: "srgb",
    components: [2, 0, 0],
  };
  malformed.dark.text.body.$type = "string";
  delete malformed.dark.color.exit;
  const findings = checkTokens(foundation, freeze(malformed));
  assert.ok(findings.some((f) => f.message === "Invalid dimension value."));
  assert.ok(findings.some((f) => f.message === "Invalid color value."));
  assert.ok(findings.some((f) => f.message === "Unsupported type: string."));
  assert.ok(findings.some((f) => f.message === "Missing semantic token."));
  assert.equal(
    findings.some((f) => f.path.join(".") === "light.space.sm"),
    true,
  );
});

test("rejects unsupported DTCG authoring features and theme breakpoint overrides explicitly", () => {
  const unsupported = structuredClone(themes);
  unsupported.light.color.$extends = "another-palette";
  unsupported.dark.breakpoint = {
    md: { $type: "dimension", $value: { value: 1, unit: "rem" } },
  };
  const findings = checkTokens(foundation, freeze(unsupported));
  assert.ok(
    findings.some(
      (finding) => finding.message === "Unsupported authoring property.",
    ),
  );
  assert.ok(
    findings.some(
      (finding) =>
        finding.message ===
        "Themes cannot override foundations or breakpoints.",
    ),
  );
});

test("missing semantic keys are found in the first theme and in a single-theme input", () => {
  const incomplete = structuredClone(themes);
  delete incomplete.light.color.accent;
  const expected = {
    path: ["light", "color", "accent"],
    message: "Missing semantic token.",
  };
  assert.ok(
    checkTokens(foundation, freeze(incomplete)).some(
      (finding) => JSON.stringify(finding) === JSON.stringify(expected),
    ),
  );
  assert.ok(
    checkTokens(foundation, { light: incomplete.light }).some(
      (finding) => JSON.stringify(finding) === JSON.stringify(expected),
    ),
  );
});

test("the Tailwind bridge uses the declared semantic contract regardless of theme order", () => {
  const expected = generateTokens(foundation, themes).tailwindCss;
  const reversed = { dark: themes.dark, light: themes.light };
  assert.equal(generateTokens(foundation, reversed).tailwindCss, expected);
  assert.deepEqual(checkTokens(foundation, reversed), []);
  const incomplete = structuredClone(themes);
  delete incomplete.light.color.accent;
  assert.equal(generateTokens(foundation, incomplete).tailwindCss, expected);
});

test("foundation authoring and value findings are emitted once rather than once per theme", () => {
  const invalid = structuredClone(foundation);
  invalid.foundation.$extends = "unsupported";
  invalid.foundation.unused = { $type: "number", $value: "bad" };
  const findings = checkTokens(freeze(invalid), themes);
  assert.equal(
    findings.filter(
      (finding) => finding.path.join(".") === "foundation.$extends",
    ).length,
    1,
  );
  assert.equal(
    findings.filter((finding) => finding.path.join(".") === "foundation.unused")
      .length,
    1,
  );
});

test("literal font names containing braces and CSS punctuation survive checking and translation", () => {
  const changed = structuredClone(foundation);
  const fonts = [
    "{Foundry} Sans",
    "{Unclosed",
    'Studio "Quoted"',
    "A,B",
    "A;B",
    "system-ui",
  ];
  changed.foundation.font.sans.$value = fonts;
  assert.deepEqual(checkTokens(freeze(changed), themes), []);
  const css = generateTokens(changed, themes).tokensCss;
  const serialized = [
    ...fonts.slice(0, -1).map((font) => JSON.stringify(font)),
    "system-ui",
  ].join(", ");
  assert.ok(css.includes(`--jv-font-sans: ${serialized};`));
});

test("only semantic theme variables are emitted publicly; foundation values stay build-time", () => {
  const generated = generateTokens(foundation, themes);
  assert.doesNotMatch(generated.tokensCss, /--jv-foundation-/);
  assert.match(generated.tokensCss, /--jv-color-accent:/);
});
