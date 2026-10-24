import {
  Heading,
  InspectorPanel,
  Surface,
  Text,
} from "@journey-viewer/design-system";
import type {
  HeadingLevel,
  InspectorSection,
} from "@journey-viewer/design-system";
import type { UjgDocument } from "@journey-viewer/ujg-jsonld";
import { getInspectorModel } from "@/inspection";
import type { ViewerSelection } from "@/interaction";
import { resolveSelection } from "@/interaction";
import type { ViewerTarget } from "@/navigation";
import type { ViewerOccurrence } from "@/occurrence";
import styles from "@/components/JourneyInspector/JourneyInspector.module.css";
import { JourneyScreens } from "@/components/JourneyScreens/JourneyScreens";
import type { JourneyScreenControls } from "@/components/JourneyScreens/JourneyScreens";
import type { TouchpointPresentation } from "@/presentation";
import type { ViewerExtensions, ViewerNodeContext } from "@/extensions";
import { JourneyAnnotations } from "@/components/JourneyAnnotations/JourneyAnnotations";

export interface JourneyInspectorProps {
  readonly document: UjgDocument;
  readonly selection: ViewerSelection | null;
  readonly level?: HeadingLevel;
  /** Complete controlled navigation contract; omitted by informational inspectors. */
  readonly navigation?: Readonly<{
    occurrence: ViewerOccurrence | null;
    onNavigate: (target: ViewerTarget) => void;
  }>;
  /** Screenshots for the selected item; `target` names the selection and its call site. */
  readonly media?: Readonly<
    JourneyScreenControls & { target: ViewerTarget | null }
  >;
  readonly touchpoints?: TouchpointPresentation;
  readonly extensions?: Pick<
    ViewerExtensions,
    "inspectorPanels" | "annotations"
  >;
}

export function JourneyInspector({
  document,
  selection,
  level = 2,
  navigation,
  media,
  touchpoints = {},
  extensions,
}: JourneyInspectorProps) {
  const model = getInspectorModel(
    document,
    selection,
    navigation?.occurrence ?? null,
    touchpoints,
  );
  const resolved =
    selection && extensions ? resolveSelection(document, selection) : undefined;
  const context: ViewerNodeContext | null =
    selection && resolved
      ? {
          document,
          selection,
          ...resolved,
          occurrence: navigation?.occurrence ?? null,
        }
      : null;
  const panelLevel = Math.min(level + 1, 6) as HeadingLevel;
  const navigate = (target: ViewerTarget | null) =>
    navigation && target
      ? { onSelect: () => navigation.onNavigate(target) }
      : {};
  const sections: readonly InspectorSection[] | undefined = model?.sections.map(
    ({ details, groups, ...section }) => ({
      ...section,
      ...(details
        ? {
            details: details.map(({ target, ...detail }) => ({
              ...detail,
              ...navigate(target),
            })),
          }
        : {}),
      ...(groups
        ? {
            groups: groups.map(({ target, ...group }) => ({
              ...group,
              ...navigate(target),
            })),
          }
        : {}),
    }),
  );
  return model && sections ? (
    <InspectorPanel
      {...model}
      sections={sections}
      level={level}
      media={
        media?.target && (
          <JourneyScreens
            document={document}
            screenshots={media.screenshots}
            target={media.target}
            onOpen={media.onOpen}
          />
        )
      }
    >
      {context && extensions?.annotations && (
        <JourneyAnnotations
          context={context}
          annotations={extensions.annotations}
        />
      )}
      {context &&
        extensions?.inspectorPanels
          ?.filter((panel) => panel.matches(context))
          .map(({ id, title, Component }) => (
            <section key={id} aria-label={title} className={styles.extension}>
              <Heading level={panelLevel} size="sm">
                {title}
              </Heading>
              <Component
                {...context}
                level={Math.min(panelLevel + 1, 6) as HeadingLevel}
                {...(navigation ? { onNavigate: navigation.onNavigate } : {})}
              />
            </section>
          ))}
    </InspectorPanel>
  ) : (
    <Surface
      as="aside"
      aria-label="Selection inspector"
      className={styles.empty}
    >
      <Heading level={level}>Selection inspector</Heading>
      <Text as="p" tone="muted">
        Select a journey, state, entry or exit to inspect it.
      </Text>
    </Surface>
  );
}
