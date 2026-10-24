import {
  JourneyContracts,
  StateSummary,
  Text,
} from "@journey-viewer/design-system";
import type { HeadingLevel } from "@journey-viewer/design-system";
import type { UjgDocument } from "@journey-viewer/ujg-jsonld";
import { HierarchyTree } from "@/components/JourneyHierarchy/HierarchyTree";
import styles from "@/components/JourneyHierarchy/JourneyHierarchy.module.css";

export interface JourneyHierarchyProps {
  readonly document: UjgDocument;
  readonly level?: HeadingLevel;
}

/** Fully expanded static presentation; its contract has no interaction or mode props. */
export function JourneyHierarchy(props: JourneyHierarchyProps) {
  return (
    <HierarchyTree
      {...props}
      intro={
        <Text as="p" variant="caption" tone="muted" className={styles.notice}>
          Entry marks count entries naming the state. Exit marks count listed
          exits reached by a direct transition from the state.
        </Text>
      }
      renderState={({
        state,
        childJourneys,
        entryCount,
        directExitCount,
        renderChildren,
      }) => (
        <StateSummary
          label={state.label}
          entryCount={entryCount}
          directExitCount={directExitCount}
        >
          {renderChildren?.({
            visibleJourneyRefs: childJourneys.map((child) => child["@id"]),
          })}
        </StateSummary>
      )}
      renderContracts={(_journey, contracts) => (
        <JourneyContracts {...contracts} />
      )}
    />
  );
}
