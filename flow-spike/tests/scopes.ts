import {
  collapseAllJourneys,
  createViewerInteraction,
} from "@journey-viewer/viewer";
import type { ViewerInteraction } from "@journey-viewer/viewer";
import { getNodesByType } from "@journey-viewer/ujg-jsonld";
import type { UjgDocument } from "@journey-viewer/ujg-jsonld";

/**
 * Disclosure scopes for the gates: everything collapsed, each composite open together with the
 * composites that enclose it (a nested composite is only visible inside its open parent, exactly
 * as in the tree), and everything open.
 */
export function scopes(
  document: UjgDocument,
): readonly [string, ViewerInteraction][] {
  const open = createViewerInteraction(document);
  const closed = collapseAllJourneys(open);
  const journeys = getNodesByType(document, "Journey");
  const composites = getNodesByType(document, "CompositeState");
  const parentsOf = (journeyRef: string) =>
    composites.filter((c) => c.subjourneyRefs.includes(journeyRef));
  const ownerOf = (stateRef: string) =>
    journeys.filter((j) => j.stateRefs.includes(stateRef));
  const lineage = (
    journeyRef: string,
    seen: readonly string[] = [],
  ): string[] =>
    seen.includes(journeyRef)
      ? []
      : [
          journeyRef,
          ...parentsOf(journeyRef).flatMap((c) =>
            ownerOf(c["@id"]).flatMap((j) =>
              lineage(j["@id"], [...seen, journeyRef]),
            ),
          ),
        ];
  return [
    ["all collapsed", closed],
    ...composites.map((c): [string, ViewerInteraction] => [
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
