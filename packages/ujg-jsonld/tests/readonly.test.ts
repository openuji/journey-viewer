import {
  getChildJourneys,
  getJourneyEntries,
  getNodesByType,
} from "@journey-viewer/ujg-jsonld";
import type {
  JsonObject,
  UjgCompositeState,
  UjgDocument,
  UjgJourney,
} from "@journey-viewer/ujg-jsonld";

// Compiled without emitting or executing these deliberately invalid writes.
export function readonlyContract(
  document: UjgDocument,
  journey: UjgJourney,
  composite: UjgCompositeState,
  opaque: JsonObject,
): void {
  // @ts-expect-error document identity is readonly
  document["@id"] = "urn:changed";
  // @ts-expect-error canonical node collection is readonly
  document.nodes?.push(journey);
  // @ts-expect-error nested reference arrays are readonly
  journey.entryRefs[0] = "urn:changed";
  // @ts-expect-error multiple-child references are readonly
  composite.subjourneyRefs.push(journey["@id"]);
  // @ts-expect-error opaque JSON objects are readonly
  opaque.changed = true;

  const entries = getJourneyEntries(document, journey);
  // @ts-expect-error query results are readonly arrays
  entries.pop();
  if (entries[0]) {
    // @ts-expect-error query results retain readonly node fields
    entries[0].stateRef = "urn:changed";
  }

  const child = getChildJourneys(document, composite)[0];
  if (child) {
    // @ts-expect-error child nodes retain readonly references
    child.stateRefs.push("urn:changed");
  }

  const touchpoint = getNodesByType(document, "Touchpoint")[0];
  if (touchpoint) {
    const label: string = touchpoint.label;
    void label;
    // @ts-expect-error known-type selection returns readonly typed nodes
    touchpoint.label = "Changed";
  }

  const extension = document.extensions?.["org.example.notes"];
  if (extension) {
    // @ts-expect-error extension payloads are readonly JSON
    extension.changed = true;
  }
}
