import { JourneyContracts, StateSummary } from "@journey-viewer/design-system";
import type { HeadingLevel } from "@journey-viewer/design-system";
import type { UjgDocument } from "@journey-viewer/ujg-jsonld";
import { HierarchyTree } from "./HierarchyTree.js";

export interface JourneyHierarchyProps {
  readonly document: UjgDocument;
  readonly level?: HeadingLevel;
}

/** Fully expanded static presentation; its contract has no interaction or mode props. */
export function JourneyHierarchy(props: JourneyHierarchyProps) {
  return (
    <HierarchyTree
      {...props}
      renderState={({ state, childJourneys, entryCount, directExitCount, renderChildren }) => (
        <StateSummary label={state.label} entryCount={entryCount} directExitCount={directExitCount}>
          {renderChildren?.({ visibleJourneyRefs: childJourneys.map((child) => child["@id"]) })}
        </StateSummary>
      )}
      renderContracts={(_journey, contracts) => <JourneyContracts {...contracts} />}
    />
  );
}
