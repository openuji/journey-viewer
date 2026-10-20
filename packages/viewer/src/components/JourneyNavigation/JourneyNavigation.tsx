import { Badge, Button, SearchField, Text, TouchpointDot } from "@journey-viewer/design-system";
import { getNodesByType } from "@journey-viewer/ujg-jsonld";
import type { UjgDocument } from "@journey-viewer/ujg-jsonld";
import { getOccurrenceLabels, referenceLabel } from "../../occurrence-presentation.js";
import { getViewerSummary, searchViewer } from "../../navigation.js";
import type { ViewerSnapshot, ViewerTarget } from "../../navigation.js";
import styles from "./JourneyNavigation.module.css";
import type { ScreenshotMap } from "../../screens.js";
import { getNodeScreens } from "../../screens.js";
import type { TouchpointPresentation } from "../../presentation.js";
import { touchpointColor, touchpointLabel } from "../../presentation.js";

export interface JourneyNavigationProps {
  readonly document: UjgDocument;
  readonly snapshot: ViewerSnapshot;
  /** Ordinary navigation preserves the query. */
  readonly onNavigate: (target: ViewerTarget) => void;
  /** Search picking clears the query after the target resolves. */
  readonly onSearchPick: (target: ViewerTarget) => void;
  readonly onQuery: (query: string) => void;
  readonly onTouchpoint: (ref: string) => void;
  readonly onOverview: () => void;
  readonly onFocus: () => void;
  readonly screenshots?: ScreenshotMap;
  readonly touchpoints?: TouchpointPresentation;
}

/** Controlled navigation; every result, breadcrumb and summary is derived from source. */
export function JourneyNavigation({ document, snapshot, onNavigate, onSearchPick, onQuery, onTouchpoint, onOverview, onFocus, screenshots = {}, touchpoints: presentation = {} }: JourneyNavigationProps) {
  const { navigation } = snapshot;
  const results = searchViewer(document, navigation.query, navigation.touchpointRefs);
  const summary = getViewerSummary(document, navigation.touchpointRefs);
  const trail = navigation.occurrence ? getOccurrenceLabels(document, navigation.occurrence) : [];
  const touchpoints = getNodesByType(document, "Touchpoint");
  return (
    <div className={styles.navigation}>
      <nav aria-label="Viewer navigation" className={styles.controls}>
        <Button variant="outline" selected={navigation.focus === null} aria-pressed={navigation.focus === null} onClick={onOverview}>Overview</Button>
        <Button variant="outline" selected={navigation.focus !== null} aria-pressed={navigation.focus !== null} disabled={trail.length === 0} onClick={onFocus}>Focus selected scope</Button>
      </nav>
      <Text as="p" variant="caption" tone="muted" className={styles.summary}>
        {summary.journeys} journeys · {summary.states} states · {summary.entries} entries · {summary.exits} exits
      </Text>
      <SearchField label="Search the graph" value={navigation.query} placeholder="Find a journey, state, entry or exit"
        onChange={onQuery} onSubmit={() => { if (results[0]) onSearchPick(results[0]); }} onClear={() => onQuery("")} />
      {navigation.query.trim() && (
        <div>
          <Text as="p" variant="caption" role="status">{results.length === 18
            ? "Showing first 18 matches. Refine your search to narrow the results."
            : results.length ? `${results.length} ${results.length === 1 ? "result" : "results"}.` : "No matches."}</Text>
          <ul className={styles.list} aria-label="Search results">
            {results.map((result, index) => <li key={index}>
              <Button variant="row" onClick={() => onSearchPick(result)}>
                <span><Text variant="label">{result.label}</Text>{" "}<Text variant="caption">({result.selection.kind})</Text>
                  <Text className={styles.detail} variant="caption" tone="muted">{result.context}</Text></span>
                {getNodeScreens(document, screenshots, result.selection.nodeRef).some((screen) => screen.source) && <Badge>Screenshot</Badge>}
              </Button>
            </li>)}
          </ul>
        </div>
      )}
      <fieldset className={styles.filters}>
        <legend><Text variant="label">Touchpoint filter</Text></legend>
        <div className={styles.controls}>
          {touchpoints.map((touchpoint, index) => (
            <Button key={`${index}:${touchpoint["@id"]}`} variant="outline" title={touchpoint["@id"]}
              data-touchpoint-ref={touchpoint["@id"]} selected={navigation.touchpointRefs.includes(touchpoint["@id"])}
              aria-pressed={navigation.touchpointRefs.includes(touchpoint["@id"])} onClick={() => onTouchpoint(touchpoint["@id"])}>
              <TouchpointDot label={touchpointLabel(touchpoint, presentation)} decorative
                {...(touchpointColor(touchpoint, presentation) ? { color: touchpointColor(touchpoint, presentation)! } : {})} />
              {referenceLabel(touchpoints, index, (node) => touchpointLabel(node, presentation))}</Button>
          ))}
        </div>
        <Text as="p" variant="caption" tone="muted" role="status">{summary.matchingJourneys} of {summary.journeys} journeys match. Select any matching touchpoint; nested scopes remain visible.</Text>
      </fieldset>
      <nav aria-label="Selection breadcrumbs">
        <ol className={styles.crumbs}>
          {trail.map((crumb, index) => {
            return <li key={index}>
              <Button variant="outline" aria-current={index === trail.length - 1 ? "location" : undefined}
                onClick={() => onNavigate({ selection: { kind: "journey", journeyRef: crumb.journey["@id"], nodeRef: crumb.journey["@id"] }, occurrence: crumb.occurrence })}>
                <span><Text variant="label">{crumb.label}</Text>
                  {crumb.viaLabel && <Text className={styles.detail} variant="caption" tone="muted">via {crumb.viaLabel}</Text>}</span>
              </Button>
            </li>;
          })}
          {trail.length === 0 && <li><Text variant="caption" tone="muted">No selected scope.</Text></li>}
        </ol>
      </nav>
    </div>
  );
}
