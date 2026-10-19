import { readFile } from "node:fs/promises";

const read = async (path) =>
  JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));

export async function readTokens() {
  return {
    foundation: await read("../tokens/foundation.tokens.json"),
    themes: {
      light: await read("../tokens/themes/light.tokens.json"),
      dark: await read("../tokens/themes/dark.tokens.json"),
    },
  };
}

export const readDevelopmentTheme = () =>
  read("../.storybook/alternate.tokens.json");
