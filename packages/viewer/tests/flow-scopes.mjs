import { readFile } from "node:fs/promises";
import { freeze, graphOf } from "~/tests/graphs.mjs";
import {
  collapseAllJourneys,
  createViewerInteraction,
  expandAllJourneys,
} from "@journey-viewer/viewer";

/** The parsed source, frozen. */
export const readDocument = async (path) =>
  freeze(
    JSON.parse(
      await readFile(new URL(`../../../${path}`, import.meta.url), "utf8"),
    ),
  );
/** The source's graph, frozen too, so a mutation anywhere in the viewer throws. */
const read = async (path) => graphOf(await readDocument(path));

/** The flow's test graphs: the unchanged Solid-OIDC sample and the fixtures for cases it lacks. */
export const oidcGraph = await read(
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
export function scopes(graph) {
  const closed = collapseAllJourneys(createViewerInteraction(graph));
  const open = expandAllJourneys(graph, closed);
  const composites = graph.states.filter((state) => state.kind === "composite");
  const parentsOf = (journeyId) =>
    composites.filter((c) =>
      c.children.some((child) => child.id === journeyId),
    );
  const ownerOf = (stateId) =>
    graph.journeys.filter((j) =>
      j.states.some((state) => state.id === stateId),
    );
  const lineage = (journeyId, seen = []) =>
    seen.includes(journeyId)
      ? []
      : [
          journeyId,
          ...parentsOf(journeyId).flatMap((c) =>
            ownerOf(c.id).flatMap((j) => lineage(j.id, [...seen, journeyId])),
          ),
        ];
  return [
    ["all collapsed", closed],
    ...composites.map((c) => [
      `${c.id.split(":").pop()} open`,
      {
        ...closed,
        expandedJourneys: [
          ...new Set(c.children.flatMap((child) => lineage(child.id))),
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
