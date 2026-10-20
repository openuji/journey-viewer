import {
  JourneyCard,
  JourneyHead,
  Text,
} from "@journey-viewer/design-system";
import type { ReactNode } from "react";
import type { JourneyContractsProps } from "@journey-viewer/design-system";
import type { HeadingLevel } from "@journey-viewer/design-system";
import {
  getChildJourneys,
  getJourneyEntries,
  getJourneyExits,
  getJourneyStates,
  getJourneyTouchpoints,
  getJourneyTransitions,
  getNodesByType,
} from "@journey-viewer/ujg-jsonld";
import type { UjgCompositeState, UjgState, UjgDocument, UjgJourney } from "@journey-viewer/ujg-jsonld";
import { getJourneyStarts } from "../../journey-starts.js";
import { childOccurrence, getOccurrenceTrail } from "../../occurrence.js";
import type { ViewerOccurrence } from "../../occurrence.js";
import type { TouchpointPresentation } from "../../presentation.js";
import { touchpointColor, touchpointLabel } from "../../presentation.js";
import styles from "./JourneyHierarchy.module.css";

export interface StateContent {
  readonly occurrence: ViewerOccurrence;
  readonly stateIndex: number;
  readonly journey: UjgJourney;
  readonly state: UjgState | UjgCompositeState;
  readonly childJourneys: readonly UjgJourney[];
  readonly entryCount: number;
  readonly directExitCount: number;
  readonly renderChildren: ((options: { readonly visibleJourneyRefs: readonly string[] }) => ReactNode) | null;
}

export interface HierarchyTreeProps {
  readonly document: UjgDocument;
  readonly level?: HeadingLevel;
  readonly renderState: (content: StateContent) => ReactNode;
  readonly renderContracts: (journey: UjgJourney, contracts: JourneyContractsProps, occurrence: ViewerOccurrence) => ReactNode;
  readonly renderJourneyAction?: (journey: UjgJourney, occurrence: ViewerOccurrence) => ReactNode;
  /** Explicit finite branches for focus columns; omitted by static/overview presentations. */
  readonly occurrences?: readonly ViewerOccurrence[];
  readonly isJourneyFiltered?: (journey: UjgJourney) => boolean;
  readonly touchpointPresentation?: TouchpointPresentation;
}

type JourneyBranchProps = Readonly<Omit<HierarchyTreeProps, "level"> & {
  journey: UjgJourney;
  ancestors: readonly string[];
  level: HeadingLevel;
  occurrence: ViewerOccurrence;
}>;

function JourneyBranch(props: JourneyBranchProps) {
  const { document, journey, ancestors, level } = props;
  const ref = journey["@id"];
  const title = journey.label ?? ref;
  // Only the current ancestry cuts recursion. Reused journeys still render at every call site.
  if (ancestors.includes(ref)) {
    return (
      <Text
        as="p"
        variant="caption"
        tone="muted"
        className={styles.notice}
        data-recursive-ref={ref}
      >
        Recursive journey reference: {title}
      </Text>
    );
  }

  const states = getJourneyStates(document, journey);
  const composites = getNodesByType(document, "CompositeState");
  const entries = getJourneyEntries(document, journey);
  const exits = getJourneyExits(document, journey);
  const transitions = getJourneyTransitions(document, journey);
  const touchpoints = getJourneyTouchpoints(document, ref);
  const presentation = props.touchpointPresentation;
  const head = {
    filtered: props.isJourneyFiltered?.(journey) ?? false,
    title,
    count: `${states.length} ${states.length === 1 ? "state" : "states"}`,
    level,
    ...(presentation ? {
      touchpoints: touchpoints.map((node) => {
        const color = touchpointColor(node, presentation);
        return { id: node["@id"], label: touchpointLabel(node, presentation), ...(color ? { color } : {}) };
      }),
    } : touchpoints.length
      ? { touchpoint: { label: touchpoints.map((node) => node.label).join(", ") } }
      : {}),
  };
  const path = [...ancestors, ref];
  const nextLevel = Math.min(level + 1, 6) as HeadingLevel;
  const content = (
    <>
      {props.renderJourneyAction?.(journey, props.occurrence)}
      {states.length === 0 && (
        <Text as="p" variant="caption" tone="subtle" className={styles.notice}>
          No states.
        </Text>
      )}
      {states.map((state, index) => {
        const composite = composites.find((node) => node === state);
        const children = composite ? getChildJourneys(document, composite) : [];
        return (
          <div
            key={`${index}:${state["@id"]}`}
            className={styles.state}
            data-state-ref={state["@id"]}
          >
            {props.renderState({
              occurrence: props.occurrence,
              stateIndex: index,
              journey,
              state,
              childJourneys: children,
              entryCount: entries.filter((entry) => entry.stateRef === state["@id"]).length,
              directExitCount: exits.filter((exit) => transitions.some((transition) => (
                transition.from === state["@id"] && transition.to === exit["@id"]
              ))).length,
              renderChildren: composite ? ({ visibleJourneyRefs }) => (
                <div className={styles.children}>
                  {children.map((child, childIndex) => !visibleJourneyRefs.includes(child["@id"]) ? null : (
                    <JourneyBranch
                      {...props}
                      key={`${childIndex}:${child["@id"]}`}
                      journey={child}
                      ancestors={path}
                      level={nextLevel}
                      occurrence={childOccurrence(props.occurrence, index, childIndex)}
                    />
                  ))}
                  {children.length === 0 && (
                    <Text as="p" variant="caption" tone="subtle" className={styles.notice}>
                      No child journeys.
                    </Text>
                  )}
                </div>
              ) : null,
            })}
          </div>
        );
      })}
      {props.renderContracts(journey, {
        entries: entries.map((entry) => ({
          id: entry["@id"],
          label: entry.label ?? entry["@id"],
          default: entry["@id"] === journey.defaultEntryRef,
        })),
        exits: exits.map((exit) => ({
          id: exit["@id"],
          label: exit.label ?? exit["@id"],
        })),
      }, props.occurrence)}
    </>
  );
  return (
    <div className={styles.journey} data-journey-ref={ref}>
      {ancestors.length === 0 ? (
        <JourneyCard {...head}>{content}</JourneyCard>
      ) : (
        <>
          <JourneyHead {...head} />
          {content}
        </>
      )}
    </div>
  );
}

/** Shared traversal with explicit presentation callbacks; no interaction state. */
export function HierarchyTree(props: HierarchyTreeProps) {
  const { document, level = 2 } = props;
  const { roots, rootless } = getJourneyStarts(document);
  if (props.occurrences) return (
    <div className={styles.focus} role="group" aria-label="Focused journey path">
      {props.occurrences.map((occurrence, index) => {
        const trail = getOccurrenceTrail(document, occurrence);
        const journey = trail.at(-1)?.journey;
        return journey ? <JourneyBranch {...props} key={index} journey={journey} ancestors={[]}
          occurrence={occurrence} level={level} /> : null;
      })}
    </div>
  );
  return (
    <div className={styles.hierarchy}>
      {(roots.length > 0 || rootless.length > 0) && (
        <Text as="p" variant="caption" tone="muted" className={styles.notice}>
          Entry marks count entries naming the state. Exit marks count listed
          exits reached by a direct transition from the state.
        </Text>
      )}
      {roots.map((journey, index) => (
        <JourneyBranch
          key={`${index}:${journey["@id"]}`}
          {...props}
          journey={journey}
          ancestors={[]}
          level={level}
          occurrence={{ startJourneyRef: journey["@id"], steps: [] }}
        />
      ))}
      {rootless.length > 0 && (
        <div
          className={styles.hierarchy}
          role="group"
          aria-label="Journeys without a root"
        >
          <Text as="p" variant="caption" tone="muted" className={styles.notice}>
            Journeys without a root. Each journey is shown as a separate starting point.
          </Text>
          {rootless.map((journey, index) => (
            <JourneyBranch
              key={`${index}:${journey["@id"]}`}
              {...props}
              journey={journey}
              ancestors={[]}
              level={level}
              occurrence={{ startJourneyRef: journey["@id"], steps: [] }}
            />
          ))}
        </div>
      )}
      {roots.length === 0 && rootless.length === 0 && (
        <Text as="p" tone="muted">No journeys.</Text>
      )}
    </div>
  );
}
