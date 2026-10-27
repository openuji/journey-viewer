import { readFileSync } from "node:fs";
import type { UjgDocument } from "@journey-viewer/ujg-jsonld";

/** Node-side loading for tests and scripts; Storybook reads the same files through Vite. */
const repository = new URL("../../../", import.meta.url);

function freeze<Value>(value: Value): Value {
  if (value && typeof value === "object") {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

const read = (path: string): UjgDocument =>
  freeze(JSON.parse(readFileSync(new URL(path, repository), "utf8")));

export const oidcDocument = read("examples/solid-oidc/solid-oidc.ujg.jsonld");
export const hierarchyFixture = read(
  "packages/viewer/tests/fixtures/hierarchy.ujg.jsonld",
);
export const screensFixture = read(
  "packages/viewer/tests/fixtures/screens.ujg.jsonld",
);
export const emptyCompositesFixture = read(
  "packages/viewer/tests/fixtures/empty-composites.ujg.jsonld",
);
export const minimalFixture = read(
  "packages/ujg-jsonld/tests/fixtures/minimal.ujg.jsonld",
);
