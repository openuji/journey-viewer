import type { ReactNode } from "react";
import { Button } from "../Button/Button.js";
import { Heading } from "../Heading/Heading.js";
import { Surface } from "../Surface/Surface.js";
import { Text } from "../Text/Text.js";
import styles from "./ScreenLightbox.module.css";

export interface ScreenLightboxProps {
  readonly title: string;
  readonly identity: string;
  readonly context: string;
  readonly position: string;
  readonly canStep: boolean;
  readonly onPrevious: () => void;
  readonly onNext: () => void;
  readonly onClose: () => void;
  readonly children?: ReactNode;
}

/** Modal content with an independent level-2 heading. The caller/browser owns dialog lifecycle and focus. */
export function ScreenLightbox({ title, identity, context, position, canStep, onPrevious, onNext, onClose, children }: ScreenLightboxProps) {
  return <Surface className={styles.panel}>
    <header className={styles.header}>
      <div className={styles.caption}>
        <Heading level={2} size="sm">{title}</Heading>
        <Text as="span" variant="caption" tone="muted">{context}</Text>
        <Text as="code" variant="code" tone="muted">{identity}</Text>
      </div>
      <Button variant="outline" onClick={onClose}>Close screenshot</Button>
    </header>
    <div className={styles.body}>{children}</div>
    <footer className={styles.controls}>
      <Button variant="outline" disabled={!canStep} onClick={onPrevious}>Previous screen</Button>
      <Text role="status" variant="caption">{position}</Text>
      <Button variant="outline" disabled={!canStep} onClick={onNext}>Next screen</Button>
      <Text variant="caption" tone="muted">← / → to browse · Escape to close</Text>
    </footer>
  </Surface>;
}
