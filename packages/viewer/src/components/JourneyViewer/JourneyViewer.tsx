import { useState } from "react";
import { Button, Text } from "@journey-viewer/design-system";
import type { HeadingLevel } from "@journey-viewer/design-system";
import type { UjgDocument } from "@journey-viewer/ujg-jsonld";
import {
  collapseAllJourneys, expandAllJourneys, toggleChildJourneys,
} from "../../interaction.js";
import type { ViewerInteraction } from "../../interaction.js";
import { createViewerSnapshot, focusJourney, hoverNode, navigateViewer, pickSearchResult, setSearchQuery, showOverview, toggleTouchpoint } from "../../navigation.js";
import type { ViewerSnapshot, ViewerTarget } from "../../navigation.js";
import { getOccurrenceTrail } from "../../occurrence.js";
import type { ViewerOccurrence } from "../../occurrence.js";
import { JourneyExplorer } from "../JourneyExplorer/JourneyExplorer.js";
import { JourneyInspector } from "../JourneyInspector/JourneyInspector.js";
import { JourneyNavigation } from "../JourneyNavigation/JourneyNavigation.js";
import { closeScreenshot, openScreenshot, stepScreenshot } from "../../screens.js";
import type { ScreenshotMap } from "../../screens.js";
import type { TouchpointPresentation } from "../../presentation.js";
import { JourneyLightbox } from "../JourneyLightbox/JourneyLightbox.js";
import styles from "./JourneyViewer.module.css";

export interface JourneyViewerProps {
  /** Keep this reference stable between actual replacements; every new object resets interaction. */
  readonly document: UjgDocument;
  readonly level?: HeadingLevel;
  /** Independent replaceable map; updates never reset document interaction. */
  readonly screenshots?: ScreenshotMap;
  readonly touchpoints?: TouchpointPresentation;
}

interface DocumentInteraction {
  readonly document: UjgDocument;
  readonly snapshot: ViewerSnapshot;
}

/** The sole graph-interaction state boundary; every update replaces an immutable snapshot. */
export function JourneyViewer({ document, level = 2, screenshots = {}, touchpoints = {} }: JourneyViewerProps) {
  const [session, setSession] = useState<DocumentInteraction>(() => ({ document, snapshot: createViewerSnapshot(document) }));
  if (session.document !== document) {
    // Reset by input object identity, including replacements with the same @id.
    // React retries this component before rendering its children; no stale selection is committed.
    setSession({ document, snapshot: createViewerSnapshot(document) });
    return null;
  }
  const update = (transition: (current: ViewerSnapshot) => ViewerSnapshot) => {
    setSession((current) => {
      if (current.document !== document) return current;
      const snapshot = transition(current.snapshot);
      return snapshot === current.snapshot ? current : { ...current, snapshot };
    });
  };
  const updateInteraction = (transition: (current: ViewerInteraction) => ViewerInteraction) => update((current) => {
    const interaction = transition(current.interaction);
    return interaction === current.interaction ? current : { ...current, interaction };
  });
  const navigate = (target: ViewerTarget) => update((current) => navigateViewer(document, current, target));
  const media = { screenshots, onOpen: (target: ViewerTarget, surfaceRef: string) => update((current) => openScreenshot(document, screenshots, current, target, surfaceRef)) };
  const preview = session.snapshot.navigation.hover && session.snapshot.navigation.hoverOccurrence
    ? { selection: session.snapshot.navigation.hover, occurrence: session.snapshot.navigation.hoverOccurrence }
    : session.snapshot.interaction.selection && session.snapshot.navigation.occurrence
      ? { selection: session.snapshot.interaction.selection, occurrence: session.snapshot.navigation.occurrence } : null;
  const focus = (occurrence: ViewerOccurrence) => update((current) => {
    const journey = getOccurrenceTrail(document, occurrence).at(-1)?.journey;
    if (!journey) return current;
    const selected = navigateViewer(document, current, { selection: { kind: "journey", journeyRef: journey["@id"], nodeRef: journey["@id"] }, occurrence });
    return focusJourney(document, selected, occurrence);
  });
  return (
    <div className={styles.viewer}>
      <JourneyNavigation document={document} snapshot={session.snapshot} screenshots={screenshots} touchpoints={touchpoints} onNavigate={navigate}
        onSearchPick={(target) => update((current) => pickSearchResult(document, current, target))}
        onQuery={(query) => update((current) => setSearchQuery(current, query))}
        onTouchpoint={(ref) => update((current) => toggleTouchpoint(document, current, ref))}
        onOverview={() => update(showOverview)}
        onFocus={() => update((current) => current.navigation.occurrence ? focusJourney(document, current, current.navigation.occurrence) : current)} />
      <div className={styles.controls}>
        <Button variant="outline" onClick={() => updateInteraction((current) => expandAllJourneys(document, current))}>Expand all</Button>
        <Button variant="outline" onClick={() => updateInteraction(collapseAllJourneys)}>Collapse all</Button>
        <Button onClick={() => update(() => createViewerSnapshot(document))}>Reset view</Button>
        <Text variant="caption" tone="muted">Select an item to inspect its explicit graph relationships.</Text>
      </div>
      <div className={styles.layout}>
        <JourneyExplorer
          document={document} interaction={session.snapshot.interaction} navigation={session.snapshot.navigation} level={level}
          media={media} touchpoints={touchpoints}
          onSelect={(selection, occurrence) => navigate({ selection, occurrence })}
          onToggleChildren={(journeyRef, stateRef) => updateInteraction((current) => toggleChildJourneys(document, current, journeyRef, stateRef))}
          onHover={(selection, occurrence) => update((current) => hoverNode(document, current, selection, occurrence))}
          onFocusJourney={focus}
        />
        <JourneyInspector document={document} selection={session.snapshot.interaction.selection} level={level}
          touchpoints={touchpoints} media={{ ...media, target: preview }}
          navigation={{ occurrence: session.snapshot.navigation.occurrence, onNavigate: navigate }} />
      </div>
      {session.snapshot.lightbox && <JourneyLightbox document={document} screenshots={screenshots} lightbox={session.snapshot.lightbox}
        onClose={() => update(closeScreenshot)} onPrevious={() => update((current) => stepScreenshot(document, screenshots, current, -1))}
        onNext={() => update((current) => stepScreenshot(document, screenshots, current, 1))} />}
    </div>
  );
}
