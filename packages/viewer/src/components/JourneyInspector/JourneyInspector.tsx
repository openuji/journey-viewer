import { Heading, InspectorPanel, Surface, Text } from "@journey-viewer/design-system";
import type { HeadingLevel } from "@journey-viewer/design-system";
import type { UjgDocument } from "@journey-viewer/ujg-jsonld";
import { getInspectorProps } from "../../inspection.js";
import type { ViewerSelection } from "../../interaction.js";
import styles from "./JourneyInspector.module.css";

export interface JourneyInspectorProps {
  readonly document: UjgDocument;
  readonly selection: ViewerSelection | null;
  readonly level?: HeadingLevel;
}

export function JourneyInspector({ document, selection, level = 2 }: JourneyInspectorProps) {
  const props = getInspectorProps(document, selection);
  return props ? <InspectorPanel {...props} level={level} /> : (
    <Surface as="aside" aria-label="Selection inspector" className={styles.empty}>
      <Heading level={level}>Selection inspector</Heading>
      <Text as="p" tone="muted">Select a journey, state, entry or exit to inspect it.</Text>
    </Surface>
  );
}
