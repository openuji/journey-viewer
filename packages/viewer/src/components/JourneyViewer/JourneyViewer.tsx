import { useState } from "react";
import { Button, Text } from "@journey-viewer/design-system";
import type { HeadingLevel } from "@journey-viewer/design-system";
import type { UjgDocument } from "@journey-viewer/ujg-jsonld";
import {
  collapseAllJourneys, createViewerInteraction, expandAllJourneys, selectNode, toggleChildJourneys,
} from "../../interaction.js";
import type { ViewerInteraction } from "../../interaction.js";
import { JourneyExplorer } from "../JourneyExplorer/JourneyExplorer.js";
import { JourneyInspector } from "../JourneyInspector/JourneyInspector.js";
import styles from "./JourneyViewer.module.css";

export interface JourneyViewerProps {
  /** Keep this reference stable between actual replacements; every new object resets interaction. */
  readonly document: UjgDocument;
  readonly level?: HeadingLevel;
}

interface DocumentInteraction {
  readonly document: UjgDocument;
  readonly interaction: ViewerInteraction;
}

/** The sole production React state boundary; every update replaces an immutable snapshot. */
export function JourneyViewer({ document, level = 2 }: JourneyViewerProps) {
  const [session, setSession] = useState<DocumentInteraction>(() => ({ document, interaction: createViewerInteraction(document) }));
  if (session.document !== document) {
    // Reset by input object identity, including replacements with the same @id.
    // React retries this component before rendering its children; no stale selection is committed.
    setSession({ document, interaction: createViewerInteraction(document) });
    return null;
  }
  const update = (transition: (current: ViewerInteraction) => ViewerInteraction) => {
    setSession((current) => {
      if (current.document !== document) return current;
      const interaction = transition(current.interaction);
      return interaction === current.interaction ? current : { ...current, interaction };
    });
  };
  return (
    <div className={styles.viewer}>
      <div className={styles.controls}>
        <Button variant="outline" onClick={() => update((current) => expandAllJourneys(document, current))}>Expand all</Button>
        <Button variant="outline" onClick={() => update(collapseAllJourneys)}>Collapse all</Button>
        <Button onClick={() => update(() => createViewerInteraction(document))}>Reset selection and expansion</Button>
        <Text variant="caption" tone="muted">Select an item to inspect its explicit graph relationships.</Text>
      </div>
      <div className={styles.layout}>
        <JourneyExplorer
          document={document} interaction={session.interaction} level={level}
          onSelect={(selection) => update((current) => selectNode(document, current, selection))}
          onToggleChildren={(journeyRef, stateRef) => update((current) => toggleChildJourneys(document, current, journeyRef, stateRef))}
        />
        <JourneyInspector document={document} selection={session.interaction.selection} level={level} />
      </div>
    </div>
  );
}
