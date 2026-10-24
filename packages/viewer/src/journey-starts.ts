import {
  getChildJourneys,
  getJourneyStates,
  getNodesByType,
} from "@journey-viewer/ujg-jsonld";
import type { UjgDocument, UjgJourney } from "@journey-viewer/ujg-jsonld";

/** Selections of original nodes, recomputed per render; no parent or hierarchy model. */
export function getJourneyStarts(document: UjgDocument): Readonly<{
  roots: readonly UjgJourney[];
  rootless: readonly UjgJourney[];
}> {
  const journeys = getNodesByType(document, "Journey");
  const composites = getNodesByType(document, "CompositeState");
  const children = (journey: UjgJourney) =>
    getJourneyStates(document, journey).flatMap((state) => {
      const composite = composites.find((node) => node === state);
      return composite ? getChildJourneys(document, composite) : [];
    });
  const referenced = journeys
    .flatMap(children)
    .map((journey) => journey["@id"]);
  const roots = journeys.filter(
    (journey) => !referenced.includes(journey["@id"]),
  );
  const visit = (
    reached: readonly string[],
    journey: UjgJourney,
  ): readonly string[] =>
    reached.includes(journey["@id"])
      ? reached
      : children(journey).reduce(visit, [...reached, journey["@id"]]);
  const reached = roots.reduce(visit, [] as readonly string[]);
  return {
    roots,
    rootless: journeys.filter((journey) => !reached.includes(journey["@id"])),
  };
}
