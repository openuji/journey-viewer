import { Button, JourneyContractControls, StateRow, Text } from "@journey-viewer/design-system";
import type { HeadingLevel } from "@journey-viewer/design-system";
import type { UjgDocument } from "@journey-viewer/ujg-jsonld";
import type { ViewerInteraction, ViewerSelection } from "../../interaction.js";
import { sameSelection } from "../../interaction.js";
import { HierarchyTree } from "../JourneyHierarchy/HierarchyTree.js";

export interface JourneyExplorerProps {
  readonly document: UjgDocument;
  readonly interaction: ViewerInteraction;
  readonly onSelect: (selection: ViewerSelection) => void;
  readonly onToggleChildren: (journeyRef: string, stateRef: string) => void;
  readonly level?: HeadingLevel;
}

/** Controlled UJG composition; callers own the immutable snapshot and its transitions. */
export function JourneyExplorer({ interaction, onSelect, onToggleChildren, ...props }: JourneyExplorerProps) {
  return (
    <HierarchyTree
      {...props}
      renderJourneyAction={(journey) => {
        const target: ViewerSelection = { kind: "journey", journeyRef: journey["@id"], nodeRef: journey["@id"] };
        return (
          <Button
            variant="row" selected={sameSelection(interaction.selection, target)}
            aria-pressed={sameSelection(interaction.selection, target)}
            onClick={() => onSelect(target)}
          ><Text variant="caption">Inspect {journey.label ?? journey["@id"]}</Text></Button>
        );
      }}
      renderState={({ journey, state, childJourneys, entryCount, directExitCount, renderChildren }) => {
        const target: ViewerSelection = { kind: "state", journeyRef: journey["@id"], nodeRef: state["@id"] };
        const expanded = childJourneys.some((child) => interaction.expandedJourneys.includes(child["@id"]));
        return (
          <StateRow
            label={state.label}
            composite={childJourneys.length > 0}
            expanded={expanded}
            selected={sameSelection(interaction.selection, target)}
            entryCount={entryCount}
            exitCount={directExitCount}
            onSelect={() => onSelect(target)}
            notice={childJourneys.length === 0 && renderChildren?.({ visibleJourneyRefs: [] })}
            {...(childJourneys.length > 0 ? {
              onToggle: () => onToggleChildren(journey["@id"], state["@id"]),
            } : {})}
          >
            {expanded && renderChildren?.({ visibleJourneyRefs: interaction.expandedJourneys })}
          </StateRow>
        );
      }}
      renderContracts={(journey, contracts) => (
        <JourneyContractControls
          {...contracts}
          selection={interaction.selection?.journeyRef === journey["@id"]
            && (interaction.selection.kind === "entry" || interaction.selection.kind === "exit")
            ? { kind: interaction.selection.kind, id: interaction.selection.nodeRef } : null}
          onSelect={(kind, nodeRef) => onSelect({ kind, nodeRef, journeyRef: journey["@id"] })}
        />
      )}
    />
  );
}
