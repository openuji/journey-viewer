import { Heading, Text, TouchpointDot } from "@journey-viewer/design-system";
import {
  getJourneyTouchpoints,
  getJourneyTransitions,
  getNode,
} from "@journey-viewer/ujg-jsonld";
import type { UjgDocument, UjgJourneyEntry } from "@journey-viewer/ujg-jsonld";
import { JourneyScreens } from "@journey-viewer/viewer";
import type {
  ScreenshotMap,
  TouchpointPresentation,
  ViewerTarget,
} from "@journey-viewer/viewer";
import styles from "@/components/study/StepDetails/StepDetails.module.css";

export interface StepDetailsProps {
  readonly document: UjgDocument;
  readonly target: ViewerTarget | null;
  readonly screenshots: ScreenshotMap;
  readonly touchpoints: TouchpointPresentation;
  readonly onNavigate: (target: ViewerTarget) => void;
  readonly onOpenScreen: (target: ViewerTarget, surfaceRef: string) => void;
}

const label = (ref: string, document: UjgDocument) => {
  const node = getNode(document, ref);
  return typeof node?.label === "string" ? node.label : ref;
};

/**
 * Stakeholder detail: what the step is called, where it happens, what it looks like and where it
 * leads. No identifiers, tags or boundary mappings; the spec detail shows those in the inspector.
 */
export function StepDetails({
  document,
  target,
  screenshots,
  touchpoints,
  onNavigate,
  onOpenScreen,
}: StepDetailsProps) {
  if (!target)
    return (
      <aside className={styles.details} aria-label="Step details">
        <Text tone="muted">
          Select a step to see its screen and where it leads.
        </Text>
      </aside>
    );
  const { selection, occurrence } = target;
  const journey = getNode(document, selection.journeyRef);
  const touchpoint = getJourneyTouchpoints(document, selection.journeyRef)[0];
  const presentation = touchpoint ? touchpoints[touchpoint["@id"]] : undefined;
  const transitions =
    journey && "transitionRefs" in journey
      ? getJourneyTransitions(document, journey as never)
      : [];
  // One entry per destination; several transitions to the same place list their names beneath.
  const steps =
    selection.kind === "entry"
      ? [
          {
            ref: (
              getNode(document, selection.nodeRef) as
                UjgJourneyEntry | undefined
            )?.stateRef,
            via: ["Starts here"],
          },
        ]
      : selection.kind === "state"
        ? transitions
            .filter((t) => t.from === selection.nodeRef)
            .reduce<{ ref: string; via: string[] }[]>((groups, t) => {
              const via = typeof t.label === "string" ? t.label : "Continue";
              const group = groups.find((g) => g.ref === t.to);
              if (group) group.via.push(via);
              else groups.push({ ref: t.to, via: [via] });
              return groups;
            }, [])
        : [];
  const next = steps.flatMap((step) =>
    step.ref
      ? [{ key: step.ref, ref: step.ref, text: step.via.join(" · ") }]
      : [],
  );
  const kind = (ref: string) =>
    journey &&
    "exitRefs" in journey &&
    (journey as { exitRefs?: readonly string[] }).exitRefs?.includes(ref)
      ? "exit"
      : "state";
  return (
    <aside className={styles.details} aria-label="Step details">
      <Heading level={2} size="md">
        {label(selection.nodeRef, document)}
      </Heading>
      {touchpoint && (
        <Text variant="caption" tone="muted" className={styles.where}>
          <TouchpointDot
            label={
              presentation?.shortLabel ?? label(touchpoint["@id"], document)
            }
            {...(presentation?.color ? { color: presentation.color } : {})}
            decorative
          />
          {label(touchpoint["@id"], document)}
        </Text>
      )}
      {(selection.kind === "state" || selection.kind === "journey") && (
        <JourneyScreens
          document={document}
          screenshots={screenshots}
          target={target}
          onOpen={onOpenScreen}
        />
      )}
      {next.length > 0 && (
        <section className={styles.next} aria-label="Leads to">
          <Heading level={3} size="sm">
            Leads to
          </Heading>
          <ul className={styles.list}>
            {next.map((item) =>
              item.ref ? (
                <li key={item.key}>
                  <button
                    type="button"
                    className={styles.step}
                    onClick={() =>
                      onNavigate({
                        selection: {
                          kind: kind(item.ref!),
                          journeyRef: selection.journeyRef,
                          nodeRef: item.ref!,
                        },
                        occurrence,
                      })
                    }
                  >
                    <span className={styles.stepTarget}>
                      {label(item.ref, document)}
                    </span>
                    <span className={styles.stepVia}>{item.text}</span>
                  </button>
                </li>
              ) : null,
            )}
          </ul>
        </section>
      )}
    </aside>
  );
}
