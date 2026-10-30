import { roundedPath } from "@/components/Connector/geometry";
import type { FlowPoint } from "@/components/Connector/geometry";
import styles from "@/components/Connector/Connector.module.css";

export interface ConnectorProps {
  /** An orthogonal polyline; corners are drawn round. */
  readonly points: readonly FlowPoint[];
  /** `association` is the dashed line from an entry to the state it starts at. */
  readonly kind: "bundle" | "association";
  /** Another step is active: draw at rest weight (same colour, so contrast holds). */
  readonly rest?: boolean;
  /** Full text for the native tooltip. */
  readonly title?: string;
  readonly onSelect?: () => void;
}

/**
 * One connector of a flow's resting network, metro style: a plain line without arrowheads that may
 * share its corridor with others. Direction and colour belong to the route overlay.
 */
export function Connector({
  points,
  kind,
  rest = false,
  title,
  onSelect,
}: ConnectorProps) {
  if (points.length < 2) return null;
  const d = roundedPath(points);
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
    </g>
  );
}
