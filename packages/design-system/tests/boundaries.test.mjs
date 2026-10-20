import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const owners = [
  "Button",
  "SearchField",
  "IconButton",
  "Heading",
  "Text",
  "Badge",
  "Surface",
  "TouchpointDot",
  "JourneyHead",
  "JourneyCard",
  "StateRow",
  "JourneyContractControls",
  "InspectorPanel",
  "StateSummary",
  "JourneyContracts",
];

test("shared primitives have single owners and colocated public contracts, fixtures, checks, and stories", async () => {
  for (const name of owners) {
    const component = await read(`src/components/${name}/${name}.tsx`);
    const css = await read(`src/components/${name}/${name}.module.css`);
    for (const suffix of ["stories.tsx", "fixtures.ts", "checks.ts"])
      await read(`src/components/${name}/${name}.${suffix}`);
    assert.equal(
      component.includes("<button"),
      name === "Button",
      `${name}: native button ownership`,
    );
    assert.doesNotMatch(
      component,
      /ujg-jsonld|viewer\/|useContext|useState|useEffect|window\.|document\./,
    );
    assert.doesNotMatch(component, /\.checks/);
    if (!["Button", "Heading", "Text"].includes(name))
      assert.doesNotMatch(
        css,
        /font-(?:size|family|weight)\s*:|@apply[^;]*(?:text-|font-)/,
      );
    assert.doesNotMatch(
      await read(`src/components/${name}/${name}.fixtures.ts`),
      /\.checks|checkFixture/,
    );
  }
  assert.match(
    await read("src/components/IconButton/IconButton.tsx"),
    /<Button/,
  );
  assert.match(
    await read("src/components/JourneyHead/JourneyHead.tsx"),
    /<Heading/,
  );
  assert.match(
    await read("src/components/JourneyCard/JourneyCard.tsx"),
    /<Surface/,
  );
  assert.match(await read("src/components/Badge/Badge.tsx"), /<Surface/);
});

test("compiled output is independently consumable and excludes development modules and resets", async () => {
  const files = await readdir(new URL("../dist", import.meta.url), {
    recursive: true,
  });
  assert.ok(
    files.includes("index.js") &&
      files.includes("index.d.ts") &&
      files.includes("styles.css"),
  );
  assert.equal(
    files.some((name) =>
      /stories|fixtures|checks|storybook|alternate/.test(name),
    ),
    false,
  );
  const js = await read("dist/index.js");
  assert.doesNotMatch(
    js,
    /ujg-jsonld|@journey-viewer\/viewer|storybook|from ["'][^"']+\.css/,
  );
  const css = await read("dist/styles.css");
  assert.doesNotMatch(
    css,
    /@apply|@reference|@variant|@theme|data-jv-theme=alternate|body\s*\{/,
  );
  assert.match(css, /53\.75rem/);
  assert.doesNotMatch(await read("dist/index.d.ts"), /\.css/);
});
