// Runs inside a temporary install of the packed packages; see ../external-consumer.mjs.
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { Application, checkDocument } from "@journey-viewer/app";
import { Button } from "@journey-viewer/design-system";
import { layoutLevel } from "@journey-viewer/flow-layout";
import { lint } from "@journey-viewer/lint";
import {
  documentShape,
  referenceTargets,
  uniqueNodeIds,
} from "@journey-viewer/lint/ujg";
import { getNodesByType } from "@journey-viewer/ujg-jsonld";
import {
  FlowPlacement,
  FlowSettings,
  JourneyViewer,
  Viewer,
  ViewerBar,
  ViewerMain,
  ViewSwitch,
  flowView,
  treeView,
} from "@journey-viewer/viewer";

const document = JSON.parse(await readFile("solid-oidc.ujg.jsonld", "utf8"));
assert.equal(getNodesByType(document, "Journey").length, 10);
const findings = lint(document, [
  documentShape,
  uniqueNodeIds,
  referenceTargets,
]);
assert.ok(Array.isArray(findings));
assert.match(
  renderToString(createElement(JourneyViewer, { document })),
  /App auth journey/,
);
// A composition of the viewer's pieces, opening in Flow with its placement control in the bar.
const composed = renderToString(
  createElement(
    Viewer,
    { document, views: [treeView, flowView()], initialView: "flow" },
    createElement(
      FlowSettings,
      null,
      createElement(
        ViewerBar,
        null,
        createElement(ViewSwitch),
        createElement(FlowPlacement),
      ),
      createElement(ViewerMain),
    ),
  ),
);
assert.match(composed, /aria-label="Placement"/);
assert.match(composed, />Flow</);
assert.equal(checkDocument(document).kind, "ready");
// Without a source the application opens on its empty state; reading happens in the browser.
assert.match(
  renderToString(
    createElement(Application, { alternatives: "or try the example" }),
  ),
  /Choose a journey file.*or try the example/,
);
assert.match(
  renderToString(createElement(Button, null, "Continue")),
  /<button[^>]*>Continue<\/button>/,
);
const level = layoutLevel({
  nodes: [
    { id: "title", kind: "header", width: 120, height: 40 },
    { id: "a", width: 100, height: 30 },
    { id: "b", width: 100, height: 30 },
  ],
  edges: [{ id: "ab", source: "a", target: "b" }],
});
assert.deepEqual(level.layers, [["title"], ["a"], ["b"]]);
assert.equal(level.routes.get("ab").length, 2);
for (const specifier of [
  "@journey-viewer/design-system/styles.css",
  "@journey-viewer/design-system/tokens.css",
  "@journey-viewer/design-system/reset.css",
  "@journey-viewer/design-system/tailwind.css",
  "@journey-viewer/viewer/styles.css",
  "@journey-viewer/app/styles.css",
]) {
  assert.ok(
    existsSync(fileURLToPath(import.meta.resolve(specifier))),
    specifier,
  );
}
console.log(
  `Rendered JourneyViewer, a composition and the application, laid out a level and resolved 6 CSS exports (${findings.length} findings).`,
);
