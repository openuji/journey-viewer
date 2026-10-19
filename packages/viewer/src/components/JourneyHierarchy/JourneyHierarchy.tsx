import {
  JourneyCard,
  JourneyContracts,
  JourneyHead,
  StateSummary,
  Text,
} from "@journey-viewer/design-system";
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
import type { UjgDocument, UjgJourney } from "@journey-viewer/ujg-jsonld";
import { getJourneyStarts } from "../../journey-starts.js";
import styles from "./JourneyHierarchy.module.css";

export interface JourneyHierarchyProps {
  readonly document: UjgDocument;
  /** Semantic level for top-level journey headings; deeper levels stop at h6. */
  readonly level?: HeadingLevel;
}

interface JourneyBranchProps {
  readonly document: UjgDocument;
  readonly journey: UjgJourney;
  readonly ancestors: readonly string[];
  readonly level: HeadingLevel;
}

function JourneyBranch({
  document,
  journey,
  ancestors,
  level,
}: JourneyBranchProps) {
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
  const head = {
    title,
    count: `${states.length} ${states.length === 1 ? "state" : "states"}`,
    level,
    ...(touchpoints.length
      ? { touchpoint: { label: touchpoints.map((node) => node.label).join(", ") } }
      : {}),
  };
  const path = [...ancestors, ref];
  const nextLevel = Math.min(level + 1, 6) as HeadingLevel;
  const content = (
    <>
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
            <StateSummary
              label={state.label}
              entryCount={
                entries.filter((entry) => entry.stateRef === state["@id"]).length
              }
              directExitCount={
                exits.filter((exit) => transitions.some((transition) => (
                  transition.from === state["@id"] && transition.to === exit["@id"]
                ))).length
              }
            >
              {composite && (
                <div className={styles.children}>
                  {children.map((child, childIndex) => (
                    <JourneyBranch
                      key={`${childIndex}:${child["@id"]}`}
                      document={document}
                      journey={child}
                      ancestors={path}
                      level={nextLevel}
                    />
                  ))}
                  {children.length === 0 && (
                    <Text as="p" variant="caption" tone="subtle" className={styles.notice}>
                      No child journeys.
                    </Text>
                  )}
                </div>
              )}
            </StateSummary>
          </div>
        );
      })}
      <JourneyContracts
        entries={entries.map((entry) => ({
          id: entry["@id"],
          label: entry.label ?? entry["@id"],
          default: entry["@id"] === journey.defaultEntryRef,
        }))}
        exits={exits.map((exit) => ({
          id: exit["@id"],
          label: exit.label ?? exit["@id"],
        }))}
      />
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

/** Fully expanded static hierarchy over canonical UJG nodes and explicit child references. */
export function JourneyHierarchy({ document, level = 2 }: JourneyHierarchyProps) {
  const { roots, rootless } = getJourneyStarts(document);
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
          document={document}
          journey={journey}
          ancestors={[]}
          level={level}
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
              document={document}
              journey={journey}
              ancestors={[]}
              level={level}
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
