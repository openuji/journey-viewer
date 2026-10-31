import type { JourneyGraph } from "@journey-viewer/ujg-jsonld";
import { getOccurrenceTrail } from "@/occurrence";
import type { OccurrenceCrumb, ViewerOccurrence } from "@/occurrence";

type LabeledCrumb = OccurrenceCrumb &
  Readonly<{ label: string; viaLabel?: string }>;
type Named = Readonly<{ id: string; label: string }>;

/** Internal presentation only: positions are ordinal counts of the same reference. */
export function referenceLabel<Node extends Named>(
  nodes: readonly Node[],
  index: number,
  labelFor: (node: Node) => string = (node) => node.label,
): string {
  const node = nodes[index];
  if (!node) return "";
  const title = labelFor(node);
  const distinguishIdentity = nodes.some(
    (other) => other.id !== node.id && labelFor(other) === title,
  );
  const name = distinguishIdentity ? `${title} (${node.id})` : title;
  const repeated = nodes.filter((other) => other.id === node.id).length;
  const ordinal = nodes
    .slice(0, index + 1)
    .filter((other) => other.id === node.id).length;
  return repeated > 1 ? `${name} (reference ${ordinal} of ${repeated})` : name;
}

/** Ephemeral wording for a finite path; list indices remain internal identities. */
export function getOccurrenceLabels(
  graph: JourneyGraph,
  occurrence: ViewerOccurrence,
): readonly LabeledCrumb[] {
  const trail = getOccurrenceTrail(graph, occurrence);
  const starts = [...graph.roots, ...graph.rootless];
  return trail.map<LabeledCrumb>((crumb, index) => {
    const parent = trail[index - 1];
    const step = occurrence.steps[index - 1];
    if (!parent || !step)
      return {
        ...crumb,
        label: referenceLabel(starts, starts.indexOf(crumb.journey)),
      };
    const states = parent.journey.states;
    const state = states[step.stateIndex];
    return {
      ...crumb,
      label: referenceLabel(
        state?.kind === "composite" ? state.children : [],
        step.childIndex,
      ),
      viaLabel: referenceLabel(states, step.stateIndex),
    };
  });
}
