import type { Point } from "@/layout/geometry";
import { roundedPath } from "@/components/flow/FlowScene/paths";
import styles from "@/components/primitives/Connector/Connector.module.css";

export interface ConnectorProps {
  readonly points: readonly Point[];
  readonly kind: "bundle" | "association";
  /** Carries one of the active step's routes; the route itself is drawn by the route overlay. */
  readonly active?: boolean;
  /** Another step is active: draw at rest weight (same colour, so contrast holds). */
  readonly rest?: boolean;
  /** Transitions bundled into this one line; shown as `×N` while active when above one. */
  readonly count?: number;
  /** Full text for the native tooltip. */
  readonly title?: string;
  readonly onSelect?: () => void;
}

/**
 * One connector of the resting network, metro style: a plain line without arrowheads that may share
 * its corridor with others. Direction and colour belong to the active route overlay.
 */
export function Connector({
  points,
  kind,
  active = false,
  rest = false,
  count = 1,
  title,
  onSelect,
}: ConnectorProps) {
  if (points.length < 2) return null;
  const d = roundedPath(points);
  // The count sits beside the longest straight run.
  const longest = points
    .slice(1)
    .map((point, i) => [points[i]!, point] as const)
    .reduce((best, segment) =>
      Math.hypot(segment[1].x - segment[0].x, segment[1].y - segment[0].y) >
      Math.hypot(best[1].x - best[0].x, best[1].y - best[0].y)
        ? segment
        : best,
    );
  const middle = {
    x: (longest[0].x + longest[1].x) / 2,
    y: (longest[0].y + longest[1].y) / 2,
  };
  const vertical = Math.abs(longest[0].x - longest[1].x) < 0.5;
  const chipWidth = String(count).length * 8 + 16;
  const chip =
    active && count > 1
      ? vertical
        ? { x: middle.x + 5, y: middle.y - 9 }
        : { x: middle.x - chipWidth / 2, y: middle.y - 23 }
      : undefined;
  return (
    <g
      className={styles.connector}
      data-kind={kind}
      data-rest={rest || undefined}
      onClick={onSelect}
    >
      {title && <title>{title}</title>}
      <path className={styles.hit} d={d} />
      <path className={styles.line} d={d} />
      {chip && (
        <g className={styles.chip} transform={`translate(${chip.x},${chip.y})`}>
          <rect width={chipWidth} height="18" rx="9" />
          <text x="6" y="13">
            ×{count}
          </text>
        </g>
      )}
    </g>
  );
}
