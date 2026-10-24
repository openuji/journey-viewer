import {
  Button,
  ExplorerBar,
  ExplorerBarTitle,
  Icon,
  IconButton,
  SearchField,
  SearchResult,
  SegmentedControl,
  TouchpointDot,
} from "@journey-viewer/design-system";
import {
  getJourneyTouchpoints,
  getNodesByType,
} from "@journey-viewer/ujg-jsonld";
import type { UjgDocument } from "@journey-viewer/ujg-jsonld";
import type { ReactNode } from "react";
import { sameSelection } from "@/interaction";
import { referenceLabel } from "@/occurrence-presentation";
import { getOccurrenceTrail, sameOccurrence } from "@/occurrence";
import { getViewerSummary, searchViewer } from "@/navigation";
import type { ViewerMode, ViewerSnapshot, ViewerTarget } from "@/navigation";
import styles from "@/components/JourneyNavigation/JourneyNavigation.module.css";
import type { ScreenshotMap } from "@/screens";
import { countMappedScreens, getNodeScreens } from "@/screens";
import type { TouchpointPresentation } from "@/presentation";
import { touchpointColor, touchpointLabel } from "@/presentation";

export interface JourneyNavigationProps {
  readonly document: UjgDocument;
  readonly snapshot: ViewerSnapshot;
  readonly onMode: (mode: ViewerMode) => void;
  readonly onExpandAll: () => void;
  readonly onCollapseAll: () => void;
  /** Null shows every journey. */
  readonly onTouchpoint: (ref: string | null) => void;
  readonly onQuery: (query: string) => void;
  /** Search picking clears the query after the target resolves. */
  readonly onSearchPick: (target: ViewerTarget) => void;
  readonly onReset: () => void;
  /** Whether the result popover may show for a non-blank query. */
  readonly searchOpen?: boolean;
  readonly onSearchFocus?: () => void;
  readonly screenshots?: ScreenshotMap;
  readonly touchpoints?: TouchpointPresentation;
  /** Leading bar content; defaults to a document summary. */
  readonly start?: ReactNode;
  /** Trailing bar content, such as source links. */
  readonly end?: ReactNode;
}

const modes = [
  { value: "tree", label: "Tree" },
  { value: "columns", label: "Columns" },
] as const;

/** Controlled explorer bar; every result and summary is derived from source on each render. */
export function JourneyNavigation({
  document,
  snapshot,
  onMode,
  onExpandAll,
  onCollapseAll,
  onTouchpoint,
  onQuery,
  onSearchPick,
  onReset,
  searchOpen = true,
  onSearchFocus,
  screenshots = {},
  touchpoints: presentation = {},
  start,
  end,
}: JourneyNavigationProps) {
  const { navigation } = snapshot;
  const results = searchViewer(
    document,
    navigation.query,
    navigation.touchpointRefs,
  );
  const summary = getViewerSummary(document, navigation.touchpointRefs);
  const screens = countMappedScreens(document, screenshots);
  const touchpoints = getNodesByType(document, "Touchpoint");
  const query = navigation.query.trim();
  const { label: documentLabel } = document;
  return (
    <ExplorerBar>
      {start ?? (
        <ExplorerBarTitle
          title={typeof documentLabel === "string" ? documentLabel : "Journeys"}
          subtitle={[
            `${summary.journeys} journeys`,
            `${summary.states} states`,
            `${summary.transitions} transitions`,
            ...(screens ? [`${screens} screens`] : []),
          ].join(" · ")}
        />
      )}
      <SegmentedControl
        label="View"
        options={modes}
        value={navigation.mode}
        onChange={onMode}
      />
      {navigation.mode === "tree" && (
        <div className={styles.tools}>
          <IconButton
            label="Expand all"
            title="Expand all"
            icon={<Icon name="expand-all" />}
            onClick={onExpandAll}
          />
          <IconButton
            label="Collapse all"
            title="Collapse all"
            icon={<Icon name="collapse-all" />}
            onClick={onCollapseAll}
          />
        </div>
      )}
      <div
        role="group"
        aria-label="Touchpoint filter"
        className={styles.touchpoints}
      >
        <Button
          variant="pill"
          size="xs"
          selected={navigation.touchpointRefs.length === 0}
          aria-pressed={navigation.touchpointRefs.length === 0}
          onClick={() => onTouchpoint(null)}
        >
          All
        </Button>
        {touchpoints.map((touchpoint, index) => {
          const color = touchpointColor(touchpoint, presentation);
          const selected = navigation.touchpointRefs.includes(
            touchpoint["@id"],
          );
          return (
            <Button
              key={`${index}:${touchpoint["@id"]}`}
              variant="pill"
              size="xs"
              title={
                typeof touchpoint.label === "string"
                  ? touchpoint.label
                  : touchpoint["@id"]
              }
              data-touchpoint-ref={touchpoint["@id"]}
              selected={selected}
              aria-pressed={selected}
              onClick={() => onTouchpoint(touchpoint["@id"])}
            >
              <TouchpointDot
                label={touchpointLabel(touchpoint, presentation)}
                decorative
                {...(color ? { color } : {})}
              />
              {referenceLabel(touchpoints, index, (node) =>
                touchpointLabel(node, presentation),
              )}
            </Button>
          );
        })}
      </div>
      <div className={styles.search}>
        <SearchField
          label="Search the graph"
          value={navigation.query}
          placeholder="Find a state or journey  /"
          open={searchOpen && query !== ""}
          {...(results.length === 0
            ? { status: "No matches" }
            : results.length === 18
              ? {
                  status:
                    "Showing first 18 matches. Refine your search to narrow the results.",
                }
              : {})}
          onChange={onQuery}
          onClear={() => onQuery("")}
          onSubmit={() => {
            if (results[0]) onSearchPick(results[0]);
          }}
          {...(onSearchFocus ? { onFocus: onSearchFocus } : {})}
        >
          {results.length > 0 &&
            results.map((result, index) => {
              const journey = getOccurrenceTrail(
                document,
                result.occurrence,
              ).at(-1)?.journey;
              const repeated = results.some(
                (other) =>
                  other !== result &&
                  sameSelection(other.selection, result.selection) &&
                  !sameOccurrence(other.occurrence, result.occurrence),
              );
              const touchpoint = getJourneyTouchpoints(
                document,
                result.selection.journeyRef,
              )[0];
              const color = touchpoint
                ? touchpointColor(touchpoint, presentation)
                : undefined;
              const kind =
                result.selection.kind === "entry"
                  ? " · Entry"
                  : result.selection.kind === "exit"
                    ? " · Exit"
                    : "";
              const context = repeated
                ? result.context
                : result.selection.kind === "journey"
                  ? "Journey"
                  : `${journey?.label ?? result.selection.journeyRef}${kind}`;
              return (
                <SearchResult
                  key={index}
                  label={result.label}
                  context={context}
                  onPick={() => onSearchPick(result)}
                  {...(touchpoint
                    ? {
                        touchpoint: {
                          label: touchpointLabel(touchpoint, presentation),
                          ...(color ? { color } : {}),
                        },
                      }
                    : {})}
                  screen={getNodeScreens(
                    document,
                    screenshots,
                    result.selection.nodeRef,
                  ).some((screen) => screen.source)}
                />
              );
            })}
        </SearchField>
        <IconButton
          label="Reset view"
          title="Reset view"
          icon={<Icon name="reset" />}
          onClick={onReset}
        />
      </div>
      {end}
    </ExplorerBar>
  );
}
