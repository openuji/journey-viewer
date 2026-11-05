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
    /@journey-viewer\/lint|solid-oidc|JSON\.parse|fetch\(|window\.|document\.|new Image\(|<button/,
  );
  // Layout quality metrics are a development tool for tests and stories.
  assert.doesNotMatch(js, /measureArtifacts|shortArrivals/);
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

// The viewer root owns the graph state and shares it through context; the flow's settings and
// its canvas's own hover/anchor and the open lightbox's sizing mode are local UI state.
const contextOwners = [
  "components/Viewer/Viewer.tsx",
  "components/FlowSettings/FlowSettings.tsx",
];
const stateOwners = [
  ...contextOwners,
  "components/FlowView/FlowView.tsx",
  "components/JourneyLightbox/JourneyLightbox.tsx",
];

test("graph state stays at the viewer boundary; browser-only effects/loading stay in named adapters", async () => {
  const root = new URL("../src/", import.meta.url);
  for (const file of await readdir(root, { recursive: true })) {
    if (!/\.tsx?$/.test(file) || /stories/.test(file)) continue;
    const source = await readFile(new URL(file, root), "utf8");
    // Named browser adapters own DOM effects, measurement and listeners, reaching the page only
    // through their own elements' ownerDocument/defaultView, never through globals. They live in
    // `browser/`, or in a folder of their own beside the other components when they bring styles.
    const browser =
      file.startsWith("browser/") ||
      /^components\/Browser[A-Z]\w*\//.test(file);
    assert.doesNotMatch(source, /window\.|document\./, file);
    if (!contextOwners.includes(file))
      assert.doesNotMatch(source, /useContext|createContext/, file);
    if (!browser)
      assert.doesNotMatch(
        source,
        /useEffect|useLayoutEffect|useRef|showModal|\.focus\(|getBoundingClientRect|addEventListener/,
        file,
      );
    if (!stateOwners.includes(file) && !browser)
      assert.doesNotMatch(source, /useState|useReducer/, file);
    if (browser)
      assert.doesNotMatch(
        source,
        /JourneyGraph|ViewerSnapshot|ViewerInteraction|ViewerSelection|ujg-jsonld|new Image|fetch\(/,
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

// ujg-jsonld reads UJG documents into a JourneyGraph; the viewer renders that graph and never sees
// the version-specific source: no raw ED import, JSON-LD keyword or UJG source type.
test("the viewer reads only the journey graph, in its source and in its published declarations", async () => {
  const sources = new URL("../src/", import.meta.url);
  for (const file of await readdir(sources, { recursive: true })) {
    if (!/\.tsx?$/.test(file)) continue;
    assert.doesNotMatch(
      await readFile(new URL(file, sources), "utf8"),
      /@journey-viewer\/ujg-jsonld\/ed|"@id"|"@type"|\bUjg[A-Z]/,
      file,
    );
  }
  const dist = new URL("../dist/", import.meta.url);
  for (const file of await readdir(dist, { recursive: true })) {
    if (!/\.(d\.ts|js)$/.test(file)) continue;
    assert.doesNotMatch(
      await readFile(new URL(file, dist), "utf8"),
      /@journey-viewer\/ujg-jsonld\/ed|"@id"|"@type"|\bUjg[A-Z]/,
      file,
    );
  }
});

// String ids are named *Id; Ref means only a React ref (or a data-*-ref attribute read
// through dataset, which keeps the markup's names).
test("viewer and app sources name ids *Id, keeping Ref for React refs", async () => {
  for (const root of [
    new URL("../src/", import.meta.url),
    new URL("../../app/src/", import.meta.url),
  ]) {
    for (const file of await readdir(root, { recursive: true })) {
      if (!/\.tsx?$/.test(file)) continue;
      const source = await readFile(new URL(file, root), "utf8");
      const reactRefs = new Set(
        [...source.matchAll(/const (\w+) = useRef\b/g)].map(
          (match) => match[1],
        ),
      );
      const names = [
        ...source.matchAll(/(?<!dataset\.)\b([a-zA-Z]\w*Refs?)\b/g),
      ].map((match) => match[1]);
      assert.deepEqual(
        names.filter((name) => name !== "useRef" && !reactRefs.has(name)),
        [],
        file,
      );
    }
  }
});
