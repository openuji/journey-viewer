import { HALF_OFFSET } from "@/layout/strokes";
import type { ActiveInk } from "@/layout/strokes";
import { CORNER_RADIUS } from "@/layout/geometry";
import {
  arrowPath,
  halfArrowPath,
  roundedPath,
} from "@/components/flow/FlowScene/paths";
import styles from "@/components/flow/RouteOverlay/RouteOverlay.module.css";

export interface RouteOverlayProps {
  readonly ink: ActiveInk;
  /** Spec detail: arrivals through a default entry get a hollow arrowhead. */
  readonly boundaryMarks?: boolean;
}

/**
 * The active step's routes over the resting network: arrivals in Way In Teal, departures in Way Out
 * Violet. A route alone on its stretch is full width on the centre line. Where an arrival and a
 * departure share a stretch, each keeps to its half through every corner and ends in half an
 * arrowhead on that half.
 */
export function RouteOverlay({
  ink,
  boundaryMarks = false,
}: RouteOverlayProps) {
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
            CORNER_RADIUS,
            stroke.half === "right"
              ? HALF_OFFSET
              : stroke.half === "left"
                ? -HALF_OFFSET
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
          data-hollow={(boundaryMarks && tip.viaDefault) || undefined}
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
