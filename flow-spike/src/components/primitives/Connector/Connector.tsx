import type { Point } from "@/layout/geometry";
import type { Tone } from "@/model/presentation";
import { arrowPath, roundedPath } from "@/components/flow/FlowScene/paths";
import styles from "@/components/primitives/Connector/Connector.module.css";

export interface ConnectorProps {
  readonly points: readonly Point[];
  readonly kind: "bundle" | "association";
  readonly arrowStart: boolean;
  readonly arrowEnd: boolean;
  readonly tone?: Tone;
  /** Something else is selected: draw at rest weight (same colour, so contrast holds). */
  readonly rest?: boolean;
  /** Transitions bundled into this one line; shown as `×N` when above one. */
  readonly count?: number;
  /** Arrival resolved through a child's default entry: hollow arrowhead. */
  readonly viaDefault?: boolean;
  /** Full text for the native tooltip. */
  readonly title?: string;
  readonly onSelect?: () => void;
}

/** One connector between two blocks, rendered inside an SVG. Never two lines for one pair. */
export function Connector({
  points,
  kind,
  arrowStart,
  arrowEnd,
  tone,
  rest = false,
  count = 1,
  viaDefault = false,
  title,
  onSelect,
}: ConnectorProps) {
  if (points.length < 2) return null;
  const d = roundedPath(points);
  const n = points.length;
  const end = points[n - 1]!;
  const before = points[n - 2]!;
  // The count sits beside the longest straight run, clear of the blocks at either end.
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
    count > 1
      ? vertical
        ? { x: middle.x + 4, y: middle.y - 9 }
        : { x: middle.x - chipWidth / 2, y: middle.y - 22 }
      : undefined;
  return (
    <g
      className={styles.connector}
      data-kind={kind}
      data-tone={tone}
      data-rest={rest || undefined}
      onClick={onSelect}
    >
      {title && <title>{title}</title>}
      <path className={styles.hit} d={d} />
      <path className={styles.line} d={d} />
      {arrowEnd && (
        <path
          className={styles.tip}
          data-hollow={viaDefault || undefined}
          d={arrowPath(before, end)}
        />
      )}
      {arrowStart && (
        <path className={styles.tip} d={arrowPath(points[1]!, points[0]!)} />
      )}
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
