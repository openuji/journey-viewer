// Runs inside a temporary install of the packed packages; see ../external-consumer.mjs.
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { Button } from "@journey-viewer/design-system";
import { lint } from "@journey-viewer/lint";
import {
  documentShape,
  referenceTargets,
  uniqueNodeIds,
} from "@journey-viewer/lint/ujg";
import { getNodesByType } from "@journey-viewer/ujg-jsonld";
import { JourneyViewer } from "@journey-viewer/viewer";

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
assert.match(
  renderToString(createElement(Button, null, "Continue")),
  /<button[^>]*>Continue<\/button>/,
);
for (const specifier of [
  "@journey-viewer/design-system/styles.css",
  "@journey-viewer/design-system/tokens.css",
  "@journey-viewer/design-system/reset.css",
  "@journey-viewer/design-system/tailwind.css",
  "@journey-viewer/viewer/styles.css",
]) {
  assert.ok(
    existsSync(fileURLToPath(import.meta.resolve(specifier))),
    specifier,
  );
}
console.log(
  `Rendered JourneyViewer and resolved 5 CSS exports (${findings.length} findings).`,
);
