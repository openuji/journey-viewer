import { getChildJourneys, getJourneyStates, getNodesByType } from "@journey-viewer/ujg-jsonld";
import type { UjgDocument, UjgNode } from "@journey-viewer/ujg-jsonld";
import { getOccurrenceTrail } from "./occurrence.js";
import type { OccurrenceCrumb, ViewerOccurrence } from "./occurrence.js";
import { getJourneyStarts } from "./journey-starts.js";

type LabeledCrumb = OccurrenceCrumb & Readonly<{ label: string; viaLabel?: string }>;

const label = (node: UjgNode) => typeof node.label === "string" ? node.label : node["@id"];

/** Internal presentation only: positions are ordinal counts of the same reference. */
export function referenceLabel(nodes: readonly UjgNode[], index: number): string {
  const node = nodes[index];
  if (!node) return "";
  const title = label(node);
  const distinguishIdentity = nodes.some((other) => other["@id"] !== node["@id"] && label(other) === title);
  const name = distinguishIdentity ? `${title} (${node["@id"]})` : title;
  const repeated = nodes.filter((other) => other["@id"] === node["@id"]).length;
  const ordinal = nodes.slice(0, index + 1).filter((other) => other["@id"] === node["@id"]).length;
  return repeated > 1 ? `${name} (reference ${ordinal} of ${repeated})` : name;
}

/** Ephemeral wording for a finite path; query-result indices remain internal identities. */
export function getOccurrenceLabels(document: UjgDocument, occurrence: ViewerOccurrence): readonly LabeledCrumb[] {
  const trail = getOccurrenceTrail(document, occurrence);
  const { roots, rootless } = getJourneyStarts(document);
  const starts = [...roots, ...rootless];
  const composites = getNodesByType(document, "CompositeState");
  return trail.map<LabeledCrumb>((crumb, index) => {
    const parent = trail[index - 1];
    const step = occurrence.steps[index - 1];
    if (!parent || !step) return { ...crumb, label: referenceLabel(starts, starts.indexOf(crumb.journey)) };
    const states = getJourneyStates(document, parent.journey);
    const composite = composites.find((node) => node === states[step.stateIndex])!;
    return {
      ...crumb,
      label: referenceLabel(getChildJourneys(document, composite), step.childIndex),
      viaLabel: referenceLabel(states, step.stateIndex),
    };
  });
}
