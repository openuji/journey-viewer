import type { CSSProperties, ReactNode, Ref } from "react";
import { Text } from "../Text/Text.js";
import { TouchpointDot } from "../TouchpointDot/TouchpointDot.js";
import styles from "./ScreenPreview.module.css";

export interface ScreenPreviewProps {
  readonly title: string;
  /** Journey and touchpoint context, or an unavailable-image explanation. */
  readonly context: string;
  readonly touchpoint?: Readonly<{ label: string; color?: string }>;
  readonly visible: boolean;
  /** Placement supplied by the caller's browser boundary. */
  readonly style?: CSSProperties;
  readonly ref?: Ref<HTMLDivElement>;
  readonly children?: ReactNode;
}

/** A floating, non-interactive screenshot card; its opener remains the accessible control. */
export function ScreenPreview({ title, context, touchpoint, visible, style, ref, children }: ScreenPreviewProps) {
  return <div ref={ref} className={styles.preview} data-visible={visible || undefined} aria-hidden="true" style={style}>
    {children}
    <div className={styles.caption}>
      {touchpoint && <TouchpointDot label={touchpoint.label} decorative className={styles.dot ?? ""}
        {...(touchpoint.color ? { color: touchpoint.color } : {})} />}
      <div className={styles.text}>
        <Text as="strong" variant="label" weight="semibold" className={styles.block}>{title}</Text>
        <Text variant="caption" tone="muted" className={styles.block}>{context}</Text>
      </div>
    </div>
  </div>;
}
