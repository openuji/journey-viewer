import type { ReactNode } from "react";
import { SearchField, SearchResult } from "@journey-viewer/design-system";
import { getJourneyTouchpoints } from "@journey-viewer/ujg-jsonld";
import type { UjgDocument } from "@journey-viewer/ujg-jsonld";
import { sameSelection } from "@/interaction";
import { getOccurrenceTrail, sameOccurrence } from "@/occurrence";
import { searchViewer } from "@/navigation";
import type { ViewerTarget } from "@/navigation";
import { getNodeScreens } from "@/screens";
import type { ScreenshotMap } from "@/screens";
import { touchpointColor, touchpointLabel } from "@/presentation";
import type { TouchpointPresentation } from "@/presentation";
import { useViewer } from "@/components/Viewer/Viewer";
import styles from "@/components/GraphSearch/GraphSearch.module.css";

export interface ControlledGraphSearchProps {
  readonly document: UjgDocument;
  readonly screenshots: ScreenshotMap;
  readonly touchpoints: TouchpointPresentation;
  readonly query: string;
  /** The touchpoint filter; results cover the journeys it shows. */
  readonly touchpointIds: readonly string[];
  /** Whether the result popover may show for a non-blank query. */
  readonly open: boolean;
  readonly onQuery: (query: string) => void;
  /** Search picking clears the query after the target resolves. */
  readonly onPick: (target: ViewerTarget) => void;
  readonly onFocus?: (() => void) | undefined;
  /** Tools after the field, such as reset. */
  readonly children?: ReactNode;
}

/** The search field and its results; Enter picks the first. */
export function ControlledGraphSearch({
  document,
  screenshots,
  touchpoints: presentation,
  query,
  touchpointIds,
  open,
  onQuery,
  onPick,
  onFocus,
  children,
}: ControlledGraphSearchProps) {
  const results = searchViewer(document, query, touchpointIds);
  return (
    <div className={styles.search}>
      <SearchField
        label="Search the graph"
        value={query}
        placeholder="Find a state or journey  /"
        open={open && query.trim() !== ""}
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
          if (results[0]) onPick(results[0]);
        }}
        {...(onFocus ? { onFocus } : {})}
      >
        {results.length > 0 &&
          results.map((result, index) => {
            const journey = getOccurrenceTrail(document, result.occurrence).at(
              -1,
            )?.journey;
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
                onPick={() => onPick(result)}
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
      {children}
    </div>
  );
}

/** Search over the viewer's graph; a pick selects its result and brings it into view. */
export function GraphSearch({ children }: Readonly<{ children?: ReactNode }>) {
  const { document, screenshots, touchpoints, state, dispatch } = useViewer();
  const { navigation } = state.disclosure.snapshot;
  return (
    <ControlledGraphSearch
      document={document}
      screenshots={screenshots}
      touchpoints={touchpoints}
      query={navigation.query}
      touchpointIds={navigation.touchpointRefs}
      open={state.searchOpen}
      onQuery={(query) => dispatch({ type: "query", query })}
      onPick={(target) => dispatch({ type: "pick", target })}
      onFocus={() => dispatch({ type: "searchFocus" })}
    >
      {children}
    </ControlledGraphSearch>
  );
}
