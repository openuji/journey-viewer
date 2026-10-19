import { mkdir, writeFile } from "node:fs/promises";
import { generateTokens, themeCss } from "./tokens.mjs";
import { readDevelopmentTheme, readTokens } from "./token-data.mjs";

const { foundation, themes } = await readTokens();
const { tokensCss, tailwindCss } = generateTokens(foundation, themes);
const alternate = themeCss(
  foundation,
  "alternate",
  await readDevelopmentTheme(),
);
const directory = new URL("../src/styles/generated/", import.meta.url);
await mkdir(directory, { recursive: true });
await mkdir(new URL("../.storybook/generated/", import.meta.url), {
  recursive: true,
});
await writeFile(new URL("tokens.css", directory), tokensCss);
await writeFile(new URL("tailwind.css", directory), tailwindCss);
await writeFile(
  new URL("../.storybook/generated/alternate.css", import.meta.url),
  alternate,
);
