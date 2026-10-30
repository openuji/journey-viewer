import type { HTMLAttributes } from "react";
import styles from "@/components/FlowFrame/FlowFrame.module.css";

export type FlowFrameProps = Readonly<
  HTMLAttributes<HTMLDivElement> & {
    /**
     * `current` for the active journey's frame and every frame inside it (paper); `outside` for
     * the frames around it, which recede onto the ground.
     */
    context: "current" | "outside";
  }
>;

/**
 * One open journey on a flow canvas: a single hairline, with tone rather than colour telling the
 * active journey from its context.
 */
export function FlowFrame({ context, className, ...props }: FlowFrameProps) {
  return (
    <div
      {...props}
      className={[styles.frame, className].filter(Boolean).join(" ")}
      data-context={context}
    />
  );
}
