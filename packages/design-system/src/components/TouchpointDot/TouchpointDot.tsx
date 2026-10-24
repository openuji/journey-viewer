import type { CSSProperties } from "react";
import styles from "@/components/TouchpointDot/TouchpointDot.module.css";

export interface TouchpointDotProps {
  readonly label: string;
  readonly color?: string;
  readonly className?: string;
  readonly decorative?: boolean;
}

export function TouchpointDot({
  label,
  color,
  className,
  decorative = false,
}: TouchpointDotProps) {
  return (
    <span
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : label}
      aria-hidden={decorative || undefined}
      title={decorative ? undefined : label}
      className={[styles.dot, className].filter(Boolean).join(" ")}
      style={
        color === undefined
          ? undefined
          : ({ "--jv-touchpoint-color": color } as CSSProperties)
      }
    />
  );
}
