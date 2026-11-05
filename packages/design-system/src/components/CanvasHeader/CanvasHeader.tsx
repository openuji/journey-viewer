import type { ReactNode } from "react";
import styles from "@/components/CanvasHeader/CanvasHeader.module.css";

export interface CanvasHeaderProps {
  /** Where the canvas is, such as a `JourneyPath`; it gives up width before the commands do. */
  readonly path?: ReactNode;
  /** What the canvas shows and how: compact icon controls, kept on one row from `md`. */
  readonly commands?: ReactNode;
  /** Accessible name of the command plane. */
  readonly commandsLabel?: string;
}

/**
 * The slim paper row above a canvas: the path on the left and the command plane on the right, on
 * one row from the `md` breakpoint. Below it, the commands take a row of their own.
 */
export function CanvasHeader({
  path,
  commands,
  commandsLabel = "Canvas commands",
}: CanvasHeaderProps) {
  if (path == null && commands == null) return null;
  return (
    <div className={styles.header} data-canvas-header="">
      {path != null && <div className={styles.path}>{path}</div>}
      {commands != null && (
        <div
          role="group"
          aria-label={commandsLabel}
          className={styles.commands}
        >
          {commands}
        </div>
      )}
    </div>
  );
}
