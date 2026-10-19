import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";

test("the public build keeps package boundaries and excludes development data and tools", async () => {
  const directory = new URL("../dist/", import.meta.url);
  const files = await readdir(directory, { recursive: true });
  for (const required of ["index.js", "index.d.ts", "styles.css"]) assert.ok(files.includes(required));
  assert.equal(files.some((file) => /fixture|test|consumer|storybook/.test(file)), false);
  const js = await readFile(new URL("index.js", directory), "utf8");
  assert.match(js, /@journey-viewer\/design-system/);
  assert.match(js, /@journey-viewer\/ujg-jsonld/);
  assert.doesNotMatch(js, /\.add\(|\.push\(|\.pop\(|new Set\(/);
  assert.doesNotMatch(js, /@journey-viewer\/lint|solid-oidc|JSON\.parse|fetch\(|useState|useEffect|useRef|useContext|createContext|window\.|document\.|<button/);
  const css = await readFile(new URL("styles.css", directory), "utf8");
  assert.match(css, /var\(--jv-space-/);
  assert.doesNotMatch(css, /font-(?:size|family|weight):|@apply|@variant|@reference|body\s*\{/);
});
