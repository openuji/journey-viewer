import { useId } from "react";
import type { CSSProperties, ReactNode } from "react";
import { Text } from "@/components/Text/Text";
import styles from "@/components/Tooltip/Tooltip.module.css";

export interface TooltipProps {
  /** The tip's text: the name the trigger already carries, so the tip is hidden from assistive technology. */
  readonly label: string;
  /** One control, such as an icon-only button. */
  readonly children: ReactNode;
}

/**
 * The name of an icon-only control, shown below it on hover (after a short delay) and on keyboard
 * focus. Where anchor positioning exists, the tip escapes clipping containers and keeps clear of the
 * window's edges.
 */
export function Tooltip({ label, children }: TooltipProps) {
  const id = useId();
  const anchor = `--tooltip-${id.replace(/[^\w-]/g, "")}`;
  return (
    <span
      className={styles.tooltip}
      style={{ anchorName: anchor } as CSSProperties}
    >
      {children}
      <span
        className={styles.tip}
        style={{ positionAnchor: anchor } as CSSProperties}
        aria-hidden="true"
      >
        <Text variant="caption" weight="medium">
          {label}
        </Text>
      </span>
    </span>
  );
}
