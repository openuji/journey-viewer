import type { ReactNode } from "react";
import { Heading } from "../Heading/Heading.js";
import { Icon } from "../Icon/Icon.js";
import { IconButton } from "../IconButton/IconButton.js";
import { Text } from "../Text/Text.js";
import { TouchpointDot } from "../TouchpointDot/TouchpointDot.js";
import styles from "./ScreenLightbox.module.css";

export interface ScreenLightboxProps {
  readonly title: string;
  readonly context: string;
  readonly position: string;
  readonly touchpoint?: Readonly<{ label: string; color?: string }>;
  readonly canStep: boolean;
  readonly onPrevious: () => void;
  readonly onNext: () => void;
  readonly onClose: () => void;
  /** Usually a `ScreenImage` with `fit="height"`. */
  readonly children?: ReactNode;
}

/** Modal content with an independent level-2 heading. The caller/browser owns dialog lifecycle and focus. */
export function ScreenLightbox({ title, context, position, touchpoint, canStep, onPrevious, onNext, onClose, children }: ScreenLightboxProps) {
  return <figure className={styles.figure}>
    <div className={styles.body}>{children}</div>
    <figcaption className={styles.caption}>
      {touchpoint && <TouchpointDot label={touchpoint.label} decorative {...(touchpoint.color ? { color: touchpoint.color } : {})} />}
      <div className={styles.text}>
        <Heading level={2} size="sm">{title}</Heading>
        <Text variant="caption" tone="muted" className={styles.context}>{context}</Text>
      </div>
      <Text role="status" variant="caption" tone="subtle" className={styles.count}>{position}</Text>
      <IconButton label="Previous screen" icon={<Icon name="previous" />} disabled={!canStep} onClick={onPrevious} />
      <IconButton label="Next screen" icon={<Icon name="next" />} disabled={!canStep} onClick={onNext} />
      <IconButton label="Close screenshot" icon={<Icon name="close" />} onClick={onClose} />
    </figcaption>
  </figure>;
}
