import { Button, Heading, InspectorPanel, Surface, Text } from "@journey-viewer/design-system";
import type { HeadingLevel } from "@journey-viewer/design-system";
import type { UjgDocument } from "@journey-viewer/ujg-jsonld";
import { getInspectorProps } from "../../inspection.js";
import type { ViewerSelection } from "../../interaction.js";
import { getNavigationItems } from "../../navigation.js";
import type { ViewerTarget } from "../../navigation.js";
import type { ViewerOccurrence } from "../../occurrence.js";
import styles from "./JourneyInspector.module.css";
import { JourneyScreens } from "../JourneyScreens/JourneyScreens.js";
import type { JourneyScreenControls } from "../JourneyScreens/JourneyScreens.js";
import type { TouchpointPresentation } from "../../presentation.js";
import { touchpointLabel } from "../../presentation.js";
import { getJourneyTouchpoints } from "@journey-viewer/ujg-jsonld";
import type { ViewerExtensions, ViewerNodeContext } from "../../extensions.js";
import { resolveSelection } from "../../interaction.js";
import { JourneyAnnotations } from "../JourneyAnnotations/JourneyAnnotations.js";

export interface JourneyInspectorProps {
  readonly document: UjgDocument;
  readonly selection: ViewerSelection | null;
  readonly level?: HeadingLevel;
  /** Complete controlled navigation contract; omitted by informational inspectors. */
  readonly navigation?: Readonly<{ occurrence: ViewerOccurrence | null; onNavigate: (target: ViewerTarget) => void }>;
  readonly media?: Readonly<JourneyScreenControls & { target: ViewerTarget | null }>;
  readonly touchpoints?: TouchpointPresentation;
  readonly extensions?: Pick<ViewerExtensions, "inspectorPanels" | "annotations">;
}

export function JourneyInspector({ document, selection, level = 2, navigation, media, touchpoints = {}, extensions }: JourneyInspectorProps) {
  const props = getInspectorProps(document, selection);
  const resolved = selection && extensions ? resolveSelection(document, selection) : undefined;
  const context: ViewerNodeContext | null = selection && resolved ? {
    document, selection, ...resolved, occurrence: navigation?.occurrence ?? null,
  } : null;
  const panelLevel = Math.min(level + 1, 6) as HeadingLevel;
  const targets = navigation ? getNavigationItems(document, selection, navigation.occurrence) : [];
  return props ? <InspectorPanel {...props} level={level}
    touchpoints={selection ? getJourneyTouchpoints(document, selection.journeyRef).map((node) => touchpointLabel(node, touchpoints)) : []}
    media={media?.target && <JourneyScreens document={document} screenshots={media.screenshots} target={media.target} onOpen={media.onOpen} />}>
    {context && extensions?.annotations && <JourneyAnnotations context={context} annotations={extensions.annotations} />}
    {navigation && <nav aria-label="Related items" className={styles.navigation}>
      <Heading level={Math.min(level + 1, 6) as HeadingLevel} size="sm">Navigate graph</Heading>
      <ul className={styles.targets}>{targets.map((target, index) => <li key={index}>
        <Button variant="row" onClick={() => navigation.onNavigate(target)}>
          <span><Text variant="label">{target.label}</Text><Text className={styles.detail} variant="caption" tone="muted">{target.context}</Text></span>
        </Button>
      </li>)}</ul>
      {targets.length === 0 && <Text as="p" variant="caption" tone="muted">No explicit navigation targets.</Text>}
    </nav>}
    {context && extensions?.inspectorPanels?.filter((panel) => panel.matches(context)).map(({ id, title, Component }) => (
      <section key={id} aria-label={title} className={styles.extension}>
        <Heading level={panelLevel} size="sm">{title}</Heading>
        <Component {...context} level={Math.min(panelLevel + 1, 6) as HeadingLevel}
          {...(navigation ? { onNavigate: navigation.onNavigate } : {})} />
      </section>
    ))}
  </InspectorPanel> : (
    <Surface as="aside" aria-label="Selection inspector" className={styles.empty}>
      <Heading level={level}>Selection inspector</Heading>
      <Text as="p" tone="muted">Select a journey, state, entry or exit to inspect it.</Text>
    </Surface>
  );
}
