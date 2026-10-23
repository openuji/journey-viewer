import { JourneyContractControls, JourneyNest, StateRow } from "@journey-viewer/design-system";
import type { HeadingLevel, StateRowProps } from "@journey-viewer/design-system";
import { getJourneyTouchpoints } from "@journey-viewer/ujg-jsonld";
import type { UjgDocument, UjgJourney } from "@journey-viewer/ujg-jsonld";
import type { ViewerInteraction, ViewerSelection } from "../../interaction.js";
import { sameSelection } from "../../interaction.js";
import type { ViewerNavigation, ViewerTarget } from "../../navigation.js";
import { getRouteDescription, getRowHighlight, matchesTouchpoints } from "../../navigation.js";
import { childOccurrence, sameOccurrence } from "../../occurrence.js";
import type { ViewerOccurrence } from "../../occurrence.js";
import { HierarchyTree } from "../JourneyHierarchy/HierarchyTree.js";
import type { JourneyScreenControls } from "../JourneyScreens/JourneyScreens.js";
import type { TouchpointPresentation } from "../../presentation.js";
import { touchpointColor, touchpointLabel } from "../../presentation.js";
import { getNodeScreens } from "../../screens.js";
import type { ViewerExtensions, ViewerStateContext } from "../../extensions.js";
import { JourneyAnnotations } from "../JourneyAnnotations/JourneyAnnotations.js";
import { BrowserColumns } from "../../browser/BrowserColumns.js";
import { BrowserScreenButton } from "../../browser/BrowserScreenButton.js";
import type { PreviewAnchor } from "../../preview-placement.js";
import styles from "./JourneyExplorer.module.css";

/** Screenshot actions for rows; `onPreview` receives the opener's viewport rectangle, then null. */
export interface JourneyExplorerMedia extends JourneyScreenControls {
  readonly onPreview?: (target: ViewerTarget, surfaceRef: string, anchor: PreviewAnchor | null) => void;
}

export interface JourneyExplorerProps {
  readonly document: UjgDocument;
  readonly interaction: ViewerInteraction;
  readonly onSelect: (selection: ViewerSelection, occurrence: ViewerOccurrence) => void;
  readonly onToggleChildren: (journeyRef: string, stateRef: string) => void;
  /** Shows or hides a journey's entry/exit list; the list stays closed without it. */
  readonly onToggleContracts?: (journeyRef: string) => void;
  readonly navigation?: ViewerNavigation;
  readonly onHover?: (selection: ViewerSelection | null, occurrence: ViewerOccurrence | null) => void;
  readonly level?: HeadingLevel;
  readonly media?: JourneyExplorerMedia;
  readonly touchpoints?: TouchpointPresentation;
  readonly extensions?: Pick<ViewerExtensions, "annotations" | "stateOverrides">;
}

const primaryTouchpoint = (document: UjgDocument, journey: UjgJourney, presentation: TouchpointPresentation) => {
  const touchpoint = getJourneyTouchpoints(document, journey["@id"])[0];
  if (!touchpoint) return undefined;
  const color = touchpointColor(touchpoint, presentation);
  return { id: touchpoint["@id"], label: touchpointLabel(touchpoint, presentation), ...(color ? { color } : {}) };
};

/** Controlled UJG composition; callers own the immutable snapshot and its transitions. */
export function JourneyExplorer({
  interaction, navigation, onSelect, onToggleChildren, onToggleContracts, onHover, media, touchpoints = {}, extensions, ...props
}: JourneyExplorerProps) {
  const { document } = props;
  const columns = navigation?.mode === "columns";
  const refs = navigation?.touchpointRefs ?? [];
  const filtered = (journey: UjgJourney) => !matchesTouchpoints(document, journey["@id"], refs);
  return (
    <HierarchyTree
      {...props}
      touchpointPresentation={touchpoints}
      isJourneyFiltered={filtered}
      isJourneyMatched={(journey) => refs.length > 0 && !filtered(journey)}
      {...(columns ? {
        occurrences: navigation.lanes,
        renderColumns: (lanes) => <BrowserColumns count={navigation.lanes.length} className={styles.columns}>{lanes}</BrowserColumns>,
      } : {})}
      renderNested={(journey, _occurrence, content) => {
        const touchpoint = primaryTouchpoint(document, journey, touchpoints);
        return <JourneyNest matched={refs.length > 0 && !filtered(journey)} {...(touchpoint?.color ? { color: touchpoint.color } : {})}>
          {content}
        </JourneyNest>;
      }}
      {...(extensions?.annotations ? {
        renderJourneyAction: (journey: UjgJourney, occurrence: ViewerOccurrence) => {
          const target: ViewerSelection = { kind: "journey", journeyRef: journey["@id"], nodeRef: journey["@id"] };
          return <JourneyAnnotations annotations={extensions.annotations!}
            context={{ document, journey, node: journey, selection: target, occurrence }} />;
        },
      } : {})}
      renderState={({ journey, state, stateIndex, occurrence, childJourneys, renderChildren }) => {
        const target: ViewerSelection = { kind: "state", journeyRef: journey["@id"], nodeRef: state["@id"] };
        const childPaths = childJourneys.map((_, childIndex) => childOccurrence(occurrence, stateIndex, childIndex));
        const expanded = columns
          ? childPaths.some((path) => navigation.lanes.some((lane) => sameOccurrence(lane, path)))
          : childJourneys.some((child) => interaction.expandedJourneys.includes(child["@id"]));
        const highlight = getRowHighlight(document, interaction, navigation, journey["@id"], state["@id"]);
        const parentTouchpoints = getJourneyTouchpoints(document, journey["@id"]).map((node) => node["@id"]);
        const crossingJourney = childJourneys.find((child) => {
          const first = getJourneyTouchpoints(document, child["@id"])[0];
          return first !== undefined && !parentTouchpoints.includes(first["@id"]);
        });
        const crossing = crossingJourney ? primaryTouchpoint(document, crossingJourney, touchpoints) : undefined;
        const color = primaryTouchpoint(document, journey, touchpoints)?.color;
        const screens = media ? getNodeScreens(document, media.screenshots, state["@id"]).filter((screen) => screen.source) : [];
        const context: ViewerStateContext = { document, journey, node: state, selection: target, occurrence };
        const row: StateRowProps = {
          label: state.label,
          ...(!columns && childJourneys.length ? { description: childJourneys.map((child) => child.label ?? child["@id"]).join(" · ") } : {}),
          composite: childJourneys.length > 0,
          expanded,
          selected: sameSelection(interaction.selection, target),
          filtered: filtered(journey),
          ...(highlight ? {
            tone: highlight.tone,
            marks: { incoming: highlight.incoming, outgoing: highlight.outgoing,
              title: getRouteDescription(document, navigation, interaction, journey["@id"], state["@id"]) },
          } : {}),
          ...(crossing ? { crossing: { label: crossing.label, ...(crossing.color ? { color: crossing.color } : {}) } } : {}),
          onSelect: () => onSelect(target, occurrence),
          onHover: (hovered) => onHover?.(hovered ? target : null, hovered ? occurrence : null),
          actions: media && screens.map((screen) => (
            <BrowserScreenButton key={screen.surface["@id"]}
              label={screens.length > 1 ? `Screen mockup: ${state.label} (${screen.surface["@id"]})` : `Screen mockup: ${state.label}`}
              {...(color ? { color } : {})}
              onOpen={() => media.onOpen({ selection: target, occurrence }, screen.surface["@id"])}
              onPreview={(anchor) => media.onPreview?.({ selection: target, occurrence }, screen.surface["@id"], anchor)} />
          )),
          ...(childJourneys.length === 0 && renderChildren ? { notice: renderChildren({ visibleJourneyRefs: [] }) } : {}),
          ...(childJourneys.length > 0 && !columns ? {
            onToggle: () => onToggleChildren(journey["@id"], state["@id"]),
            children: expanded && renderChildren?.({ visibleJourneyRefs: interaction.expandedJourneys }),
          } : {}),
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
          open={interaction.openContracts.includes(journey["@id"])}
          onToggle={() => onToggleContracts?.(journey["@id"])}
          filtered={filtered(journey)}
          selection={interaction.selection?.journeyRef === journey["@id"]
            && (interaction.selection.kind === "entry" || interaction.selection.kind === "exit")
            ? { kind: interaction.selection.kind, id: interaction.selection.nodeRef } : null}
          onSelect={(kind, nodeRef) => onSelect({ kind, nodeRef, journeyRef: journey["@id"] }, occurrence)}
        />
      )}
    />
  );
}
