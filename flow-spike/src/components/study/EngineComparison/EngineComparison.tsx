import { useEffect, useMemo, useState } from "react";
import { Text } from "@journey-viewer/design-system";
import { getJourneyTouchpoints } from "@journey-viewer/ujg-jsonld";
import type { UjgDocument } from "@journey-viewer/ujg-jsonld";
import type {
  TouchpointPresentation,
  ViewerInteraction,
} from "@journey-viewer/viewer";
import { measureArtifacts } from "@/layout/artifacts";
import type { ArtifactReport } from "@/layout/artifacts";
import { composeFlow, composeFlowAsync } from "@/layout/compose";
import type { FlowLayout } from "@/layout/compose";
import { elkLevel } from "@/layout/elk-level";
import { ARRIVAL, MIN_STEP } from "@/layout/geometry";
import { ownLevel } from "@/layout/own-level";
import { buildFlowScene } from "@/model/flow-scene";
import { flowHighlight, specDetail } from "@/model/presentation";
import { canvasMeasure } from "@/browser/measure";
import { FlowViewport } from "@/browser/FlowViewport/FlowViewport";
import { FlowScene } from "@/components/flow/FlowScene/FlowScene";
import styles from "@/components/study/EngineComparison/EngineComparison.module.css";

export interface EngineComparisonProps {
  readonly document: UjgDocument;
  readonly interaction: Pick<ViewerInteraction, "expandedJourneys">;
  readonly touchpoints?: TouchpointPresentation;
}

const rows: readonly [keyof ArtifactReport, string][] = [
  ["ink", "Drawn line length (shared counted once)"],
  ["runs", "Distinct straight runs"],
  ["crossings", "Crossings"],
  ["overlaps", "Connector pairs sharing a corridor"],
  ["diagonals", "Diagonal segments"],
  ["jogs", `Kinks under ${MIN_STEP}px`],
  ["shortArrivals", `Arrowheads under ${ARRIVAL}px after a corner`],
  ["throughBoxes", "Lines through blocks"],
  ["borderCrossings", "Frame borders crossed off-port"],
];

/**
 * Measure-only comparison: the same projection, composer and level input laid out by the spike's
 * own engine and by ELK layered. ELK is never used by the flow canvas itself.
 */
export function EngineComparison({
  document,
  interaction,
  touchpoints = {},
}: EngineComparisonProps) {
  const scene = useMemo(
    () => buildFlowScene(document, interaction),
    [document, interaction],
  );
  const own = useMemo(
    () => composeFlow(scene, ownLevel(), canvasMeasure),
    [scene],
  );
  const [elk, setElk] = useState<FlowLayout | null>(null);
  useEffect(() => {
    let current = true;
    void composeFlowAsync(scene, elkLevel, canvasMeasure).then(
      (layout) => current && setElk(layout),
    );
    return () => {
      current = false;
    };
  }, [scene]);
  const reports = {
    own: measureArtifacts(own),
    elk: elk ? measureArtifacts(elk) : null,
  };
  const touchpointOf = (journeyRef: string) => {
    const touchpoint = getJourneyTouchpoints(document, journeyRef)[0];
    const presentation = touchpoint
      ? touchpoints[touchpoint["@id"]]
      : undefined;
    return touchpoint
      ? {
          label: presentation?.shortLabel ?? touchpoint["@id"],
          ...(presentation?.color ? { color: presentation.color } : {}),
        }
      : undefined;
  };
  const panel = (name: string, layout: FlowLayout | null) => (
    <section className={styles.panel} aria-label={name}>
      <Text variant="label" weight="semibold">
        {name}
      </Text>
      {layout ? (
        <FlowViewport
          layout={layout}
          zoom="fit"
          anchor={null}
          label={`${name} layout`}
        >
          <FlowScene
            layout={layout}
            detail={specDetail}
            highlight={flowHighlight(layout, null)}
            current={new Set(layout.frames.map((f) => f.key))}
            location={null}
            touchpointOf={touchpointOf}
            onSelect={() => {}}
            onToggle={() => {}}
          />
        </FlowViewport>
      ) : (
        <Text tone="muted">Laying out…</Text>
      )}
    </section>
  );
  return (
    <div className={styles.comparison}>
      <table className={styles.table}>
        <caption className={styles.caption}>
          Identical bundled, port-based input per level
        </caption>
        <thead>
          <tr>
            <th scope="col">Measure</th>
            <th scope="col">Own engine</th>
            <th scope="col">ELK layered</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([key, name]) => (
            <tr key={key}>
              <th scope="row">{name}</th>
              <td>{String(reports.own[key])}</td>
              <td>{reports.elk ? String(reports.elk[key]) : "…"}</td>
            </tr>
          ))}
          <tr>
            <th scope="row">Size</th>
            <td>{`${reports.own.width} × ${reports.own.height}`}</td>
            <td>
              {reports.elk
                ? `${reports.elk.width} × ${reports.elk.height}`
                : "…"}
            </td>
          </tr>
        </tbody>
      </table>
      <div className={styles.panels}>
        {panel("Own engine", own)}
        {panel("ELK layered", elk)}
      </div>
    </div>
  );
}
