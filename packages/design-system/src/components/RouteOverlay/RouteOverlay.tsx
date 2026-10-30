import {
  arrowPath,
  halfArrowPath,
  halfOffset,
  roundedPath,
} from "@/components/Connector/geometry";
import type { FlowPoint } from "@/components/Connector/geometry";
import styles from "@/components/RouteOverlay/RouteOverlay.module.css";

/** Arrivals at the active step, or departures from it. */
export type RouteTone = "incoming" | "outgoing";
/** A side relative to the direction of travel. */
export type RouteSide = "left" | "right";

/**
 * A run of one active route, in its direction of travel. Alone on its stretch it is drawn at full
 * width on the corridor's centre line; where an arrival and a departure share a stretch, each keeps
 * to one half of the same width.
 */
export interface RouteStroke {
  readonly tone: RouteTone;
  readonly points: readonly FlowPoint[];
  /** Set on a shared stretch: the half this route keeps to. */
  readonly half?: RouteSide;
}

/** An arrowhead where a route arrives; half of one, on its route's half, on a shared stretch. */
export interface RouteTip {
  readonly tone: RouteTone;
  readonly from: FlowPoint;
  readonly to: FlowPoint;
  readonly half?: RouteSide;
}

export interface RouteInk {
  readonly strokes: readonly RouteStroke[];
  readonly tips: readonly RouteTip[];
}

export interface RouteOverlayProps {
  readonly ink: RouteInk;
}

/**
 * The active step's routes over the resting network: arrivals in the entry colour, departures in
 * the exit colour. Each route keeps to its half through every corner and ends in half an
 * arrowhead on that half where the stretch is shared.
 */
export function RouteOverlay({ ink }: RouteOverlayProps) {
  return (
    <g className={styles.overlay} aria-hidden="true">
      {ink.strokes.map((stroke, i) => (
        <path
          key={i}
          className={styles.stroke}
          data-tone={stroke.tone}
          data-shared={stroke.half ? true : undefined}
          d={roundedPath(
            stroke.points,
            stroke.half === "right"
              ? halfOffset
              : stroke.half === "left"
                ? -halfOffset
                : 0,
          )}
        />
      ))}
      {ink.tips.map((tip, i) => (
        <path
          key={`tip${i}`}
          className={styles.tip}
          data-tone={tip.tone}
          data-half={tip.half}
          d={
            tip.half
              ? halfArrowPath(tip.from, tip.to, tip.half)
              : arrowPath(tip.from, tip.to)
          }
        />
      ))}
    </g>
  );
}
