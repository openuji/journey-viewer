import type { CSSProperties, ReactNode } from "react";
import styles from "./JourneyNest.module.css";

export interface JourneyNestProps {
  /** The nested journey's touchpoint color for its guide line. */
  readonly color?: string;
  /** A touchpoint filter matches this journey. */
  readonly matched?: boolean;
  readonly children?: ReactNode;
}

/** Indented nested-journey content beneath a composite row, with a touchpoint guide line. */
export function JourneyNest({ color, matched = false, children }: JourneyNestProps) {
  return (
    <div className={styles.nest} data-matched={matched || undefined}
      style={color === undefined ? undefined : ({ "--jv-touchpoint-color": color } as CSSProperties)}>
      {children}
    </div>
  );
}
