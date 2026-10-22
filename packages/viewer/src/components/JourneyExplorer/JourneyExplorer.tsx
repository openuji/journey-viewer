import { Button, JourneyContractControls, StateRow, Text } from "@journey-viewer/design-system";
import type { HeadingLevel, StateRowProps } from "@journey-viewer/design-system";
import type { UjgDocument } from "@journey-viewer/ujg-jsonld";
import type { ViewerInteraction, ViewerSelection } from "../../interaction.js";
import { sameSelection } from "../../interaction.js";
import type { ViewerNavigation } from "../../navigation.js";
import { getRowRelation, matchesTouchpoints, occurrenceLabel } from "../../navigation.js";
import { childOccurrence, getOccurrenceTrail } from "../../occurrence.js";
import type { ViewerOccurrence } from "../../occurrence.js";
import { referenceLabel } from "../../occurrence-presentation.js";
import { HierarchyTree } from "../JourneyHierarchy/HierarchyTree.js";
import type { JourneyScreenControls } from "../JourneyScreens/JourneyScreens.js";
import type { TouchpointPresentation } from "../../presentation.js";
import { getNodeScreens } from "../../screens.js";
import type { ViewerExtensions, ViewerStateContext } from "../../extensions.js";
import { JourneyAnnotations } from "../JourneyAnnotations/JourneyAnnotations.js";

export interface JourneyExplorerProps {
  readonly document: UjgDocument;
  readonly interaction: ViewerInteraction;
  readonly onSelect: (selection: ViewerSelection, occurrence: ViewerOccurrence) => void;
  readonly onToggleChildren: (journeyRef: string, stateRef: string) => void;
  readonly navigation?: ViewerNavigation;
  readonly onHover?: (selection: ViewerSelection | null, occurrence: ViewerOccurrence | null) => void;
  readonly onFocusJourney?: (occurrence: ViewerOccurrence) => void;
  readonly level?: HeadingLevel;
  readonly media?: JourneyScreenControls;
  readonly touchpoints?: TouchpointPresentation;
  readonly extensions?: Pick<ViewerExtensions, "annotations" | "stateOverrides">;
}

/** Controlled UJG composition; callers own the immutable snapshot and its transitions. */
export function JourneyExplorer({ interaction, navigation, onSelect, onToggleChildren, onHover, onFocusJourney, media, touchpoints, extensions, ...props }: JourneyExplorerProps) {
  const focus = navigation?.focus;
  return (
    <HierarchyTree
      {...props}
      {...(touchpoints ? { touchpointPresentation: touchpoints } : {})}
      isJourneyFiltered={(journey) => !matchesTouchpoints(props.document, journey["@id"], navigation?.touchpointRefs ?? [])}
      {...(focus ? { occurrences: getOccurrenceTrail(props.document, focus).map((crumb) => crumb.occurrence) } : {})}
      renderJourneyAction={(journey, occurrence) => {
        const target: ViewerSelection = { kind: "journey", journeyRef: journey["@id"], nodeRef: journey["@id"] };
        return (
          <div>
          {focus && <Text as="p" variant="caption" tone="muted">{occurrenceLabel(props.document, occurrence)}</Text>}
          {!matchesTouchpoints(props.document, journey["@id"], navigation?.touchpointRefs ?? []) && (
            <Text as="p" variant="caption" tone="muted">Does not match touchpoint filter.</Text>
          )}
          <Button
            variant="row" selected={sameSelection(interaction.selection, target)}
            aria-pressed={sameSelection(interaction.selection, target)}
            onClick={() => onSelect(target, occurrence)}
          ><Text variant="caption">Inspect {journey.label ?? journey["@id"]}</Text></Button>
          {onFocusJourney && <Button variant="outline" onClick={() => onFocusJourney(occurrence)}>Focus {journey.label ?? journey["@id"]}</Button>}
          {extensions?.annotations && <JourneyAnnotations annotations={extensions.annotations}
            context={{ document: props.document, journey, node: journey, selection: target, occurrence }} />}
          </div>
        );
      }}
      renderState={({ journey, state, stateIndex, occurrence, childJourneys, entryCount, directExitCount, renderChildren }) => {
        const target: ViewerSelection = { kind: "state", journeyRef: journey["@id"], nodeRef: state["@id"] };
        const expanded = childJourneys.some((child) => interaction.expandedJourneys.includes(child["@id"]));
        const relation = getRowRelation(props.document, interaction, navigation, journey["@id"], state["@id"]);
        const context: ViewerStateContext = { document: props.document, journey, node: state, selection: target, occurrence };
        const row: StateRowProps = {
          label: state.label,
          composite: childJourneys.length > 0 && !focus,
          expanded: expanded && !focus,
          selected: sameSelection(interaction.selection, target),
          filtered: !matchesTouchpoints(props.document, journey["@id"], navigation?.touchpointRefs ?? []),
          ...(relation ? { relation } : {}),
          entryCount,
          exitCount: directExitCount,
          onSelect: () => onSelect(target, occurrence),
          onHover: (hovered) => onHover?.(hovered ? target : null, hovered ? occurrence : null),
          actions: media && getNodeScreens(props.document, media.screenshots, state["@id"]).filter((screen) => screen.source).map((screen) => (
            <Button key={screen.surface["@id"]} variant="outline" aria-label={`Open screenshot: ${state.label} (${screen.surface["@id"]})`}
              onClick={() => media.onOpen({ selection: target, occurrence }, screen.surface["@id"])}><Text variant="caption">Screen</Text></Button>
          )),
          notice: childJourneys.length === 0 ? renderChildren?.({ visibleJourneyRefs: [] }) : focus && onFocusJourney ? (
            <div>{childJourneys.map((child, childIndex) => {
              const path = childOccurrence(occurrence, stateIndex, childIndex);
              return getOccurrenceTrail(props.document, path).length ? <Button key={childIndex} variant="outline"
                onClick={() => onFocusJourney(path)}>Open {referenceLabel(childJourneys, childIndex)}</Button>
                : <Text as="p" variant="caption" tone="muted" key={childIndex}>Recursive journey reference: {child.label ?? child["@id"]}</Text>;
            })}</div>
          ) : null,
          ...(childJourneys.length > 0 && !focus ? {
            onToggle: () => onToggleChildren(journey["@id"], state["@id"]),
          } : {}),
          children: !focus && expanded && renderChildren?.({ visibleJourneyRefs: interaction.expandedJourneys }),
        };
        const override = extensions?.stateOverrides?.find((candidate) => candidate.matches(context));
        const Component = override?.Component;
        return <>
          {extensions?.annotations && <JourneyAnnotations context={context} annotations={extensions.annotations} />}
          {Component ? <Component key={override.id} context={context} row={row} /> : <StateRow {...row} />}
        </>;
      }}
      renderContracts={(journey, contracts, occurrence) => (
        <JourneyContractControls
          {...contracts}
          filtered={!matchesTouchpoints(props.document, journey["@id"], navigation?.touchpointRefs ?? [])}
          selection={interaction.selection?.journeyRef === journey["@id"]
            && (interaction.selection.kind === "entry" || interaction.selection.kind === "exit")
            ? { kind: interaction.selection.kind, id: interaction.selection.nodeRef } : null}
          onSelect={(kind, nodeRef) => onSelect({ kind, nodeRef, journeyRef: journey["@id"] }, occurrence)}
        />
      )}
    />
  );
}
