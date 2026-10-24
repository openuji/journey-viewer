import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

test("the public build keeps package boundaries and excludes development data and tools", async () => {
  const directory = new URL("../dist/", import.meta.url);
  const files = await readdir(directory, { recursive: true });
  for (const required of ["index.js", "index.d.ts", "styles.css"])
    assert.ok(files.includes(required));
  assert.equal(
    files.some((file) => /fixture|test|consumer|storybook/.test(file)),
    false,
  );
  const js = await readFile(new URL("index.js", directory), "utf8");
  assert.match(js, /@journey-viewer\/design-system/);
  assert.match(js, /@journey-viewer\/ujg-jsonld/);
  assert.doesNotMatch(
    js,
    /@journey-viewer\/lint|solid-oidc|JSON\.parse|fetch\(|useContext|createContext|window\.|document\.|new Image\(|<button/,
  );
  const css = await readFile(new URL("styles.css", directory), "utf8");
  assert.match(css, /var\(--jv-space-/);
  assert.doesNotMatch(
    css,
    /font-(?:size|family|weight):|@apply|@variant|@reference|body\s*\{/,
  );

  // Only CSS-module classes, which Vite names "_<local>_<hash>_<line>", leave the package.
  const classes = css
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .match(/[^{};]+(?=\{)/g)
    .filter((prelude) => !prelude.trim().startsWith("@"))
    .flatMap((selector) => selector.match(/\.-?[_a-zA-Z][\w-]*/g) ?? []);
  assert.deepEqual(
    classes.filter((name) => !name.startsWith("._")),
    [],
  );
});

test("graph state stays at the viewer boundary; browser-only effects/loading stay in named adapters", async () => {
  const root = new URL("../src/", import.meta.url);
  for (const file of await readdir(root, { recursive: true })) {
    if (!/\.tsx?$/.test(file) || /stories/.test(file)) continue;
    const source = await readFile(new URL(file, root), "utf8");
    // Named browser adapters own DOM effects, measurement and listeners, reaching the page only
    // through their own elements' ownerDocument/defaultView, never through globals.
    const browser = file.startsWith("browser/");
    assert.doesNotMatch(
      source,
      /useContext|createContext|window\.|document\./,
      file,
    );
    if (!browser)
      assert.doesNotMatch(
        source,
        /useEffect|useLayoutEffect|useRef|showModal|\.focus\(|getBoundingClientRect|addEventListener/,
        file,
      );
    if (!file.endsWith("JourneyViewer.tsx") && !browser)
      assert.doesNotMatch(source, /useState|useReducer/, file);
    if (browser)
      assert.doesNotMatch(
        source,
        /UjgDocument|ViewerSnapshot|ViewerInteraction|ViewerSelection|ujg-jsonld|new Image|fetch\(/,
        file,
      );
    const module = ts.createSourceFile(
      file,
      source,
      ts.ScriptTarget.Latest,
      true,
    );
    const checkModuleScope = (node) => {
      // Per-call local collections do not retain state between calls.
      if (ts.isFunctionLike(node)) return;
      if (ts.isVariableDeclarationList(node)) {
        assert.ok(
          node.flags & ts.NodeFlags.Const,
          `${file}: mutable module binding`,
        );
      }
      if (ts.isNewExpression(node)) {
        assert.doesNotMatch(
          node.expression.getText(module),
          /^(?:Set|Map|WeakSet|WeakMap)$/,
          `${file}: retained module collection`,
        );
      }
      ts.forEachChild(node, checkModuleScope);
    };
    checkModuleScope(module);
  }
});
