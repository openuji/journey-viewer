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
import { childOccurrence, occurrenceKey } from "../../occurrence.js";
import type { ViewerOccurrence } from "../../occurrence.js";
import { getOccurrenceLabels } from "../../occurrence-presentation.js";
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
  /** Presents a child journey's content at its call site; defaults to a heading followed by the content. */
  readonly renderNested?: (journey: UjgJourney, occurrence: ViewerOccurrence, content: ReactNode) => ReactNode;
  /** Explicit finite branches shown as columns; omitted by tree presentations. */
  readonly occurrences?: readonly ViewerOccurrence[];
  /** Wraps the columns; defaults to a horizontally scrolling group. */
  readonly renderColumns?: (columns: ReactNode) => ReactNode;
  readonly isJourneyFiltered?: (journey: UjgJourney) => boolean;
  readonly isJourneyMatched?: (journey: UjgJourney) => boolean;
  readonly touchpointPresentation?: TouchpointPresentation;
  /** Explanatory content above the roots. */
  readonly intro?: ReactNode;
}

type JourneyBranchProps = Readonly<Omit<HierarchyTreeProps, "level"> & {
  journey: UjgJourney;
  ancestors: readonly string[];
  level: HeadingLevel;
  occurrence: ViewerOccurrence;
  /** Column heading context; present only for columns. */
  crumb?: string;
}>;

function JourneyBranch(props: JourneyBranchProps) {
  const { document, journey, ancestors, level, crumb, ...inherited } = props;
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
  const filtered = props.isJourneyFiltered?.(journey) ?? false;
  const head = {
    filtered,
    matched: !filtered && (props.isJourneyMatched?.(journey) ?? false),
    title,
    count: crumb !== undefined ? String(states.length) : `${states.length} ${states.length === 1 ? "state" : "states"}`,
    level,
    ...(crumb !== undefined ? { crumb } : {}),
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
                      {...inherited}
                      document={document}
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
    <div className={styles.journey} data-journey-ref={ref} data-occurrence={occurrenceKey(props.occurrence)}>
      {ancestors.length === 0 ? (
        <JourneyCard {...head}>{content}</JourneyCard>
      ) : props.renderNested ? props.renderNested(journey, props.occurrence, content) : (
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
  if (props.occurrences) {
    const columns = props.occurrences.map((occurrence) => {
      const trail = getOccurrenceLabels(document, occurrence);
      const journey = trail.at(-1)?.journey;
      const ancestors = trail.slice(0, -1).map((crumb) => crumb.label);
      return journey ? <JourneyBranch {...props} key={occurrenceKey(occurrence)} journey={journey} ancestors={[]}
        crumb={ancestors.length ? ancestors.join(" / ") : "Root journey"} occurrence={occurrence} level={level} /> : null;
    });
    return <>{props.renderColumns ? props.renderColumns(columns) : (
      <div className={styles.columns} role="group" aria-label="Journey columns">{columns}</div>
    )}</>;
  }
  return (
    <div className={styles.hierarchy}>
      {(roots.length > 0 || rootless.length > 0) && props.intro}
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
