import { readFile } from "node:fs/promises";
import { getNodesByType } from "@journey-viewer/ujg-jsonld";
import {
  collapseAllJourneys,
  createViewerInteraction,
} from "@journey-viewer/viewer";

const freeze = (value) => {
  if (value && typeof value === "object") {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
};
const read = async (path) =>
  freeze(
    JSON.parse(
      await readFile(new URL(`../../../${path}`, import.meta.url), "utf8"),
    ),
  );

/** The flow's test documents: the unchanged Solid-OIDC sample and the fixtures for cases it lacks. */
export const oidcDocument = await read(
  "examples/solid-oidc/solid-oidc.ujg.jsonld",
);
export const hierarchyFixture = await read(
  "packages/viewer/tests/fixtures/hierarchy.ujg.jsonld",
);
export const screensFixture = await read(
  "packages/viewer/tests/fixtures/screens.ujg.jsonld",
);
export const emptyCompositesFixture = await read(
  "packages/viewer/tests/fixtures/empty-composites.ujg.jsonld",
);
export const minimalFixture = await read(
  "packages/ujg-jsonld/tests/fixtures/minimal.ujg.jsonld",
);

/** Solid-OIDC ids carry one prefix. */
export const id = (local) => `urn:ujg:solid-oidc:${local}`;

/**
 * Disclosure scopes for the gates: everything collapsed, each composite open together with the
 * composites that enclose it (a nested composite is only visible inside its open parent, exactly
 * as in the tree), and everything open.
 */
export function scopes(document) {
  const open = createViewerInteraction(document);
  const closed = collapseAllJourneys(open);
  const journeys = getNodesByType(document, "Journey");
  const composites = getNodesByType(document, "CompositeState");
  const parentsOf = (journeyId) =>
    composites.filter((c) => c.subjourneyRefs.includes(journeyId));
  const ownerOf = (stateId) =>
    journeys.filter((j) => j.stateRefs.includes(stateId));
  const lineage = (journeyId, seen = []) =>
    seen.includes(journeyId)
      ? []
      : [
          journeyId,
          ...parentsOf(journeyId).flatMap((c) =>
            ownerOf(c["@id"]).flatMap((j) =>
              lineage(j["@id"], [...seen, journeyId]),
            ),
          ),
        ];
  return [
    ["all collapsed", closed],
    ...composites.map((c) => [
      `${c["@id"].split(":").pop()} open`,
      {
        ...closed,
        expandedJourneys: [
          ...new Set(c.subjourneyRefs.flatMap((ref) => lineage(ref))),
        ],
      },
    ]),
    ["all open", open],
  ];
}

/** Every journey a scene draws, outermost first. */
export function journeysOf(scene) {
  const visit = (frame) =>
    frame.content.kind === "row"
      ? frame.content.frames.flatMap(visit)
      : [
          frame.content,
          ...frame.content.vertices.flatMap((v) =>
            v.kind === "frame" ? visit(v.frame) : [],
          ),
        ];
  return scene.frames.flatMap(visit);
}
