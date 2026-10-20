import type { ReactNode } from "react";
import { Button } from "../Button/Button.js";
import { Surface } from "../Surface/Surface.js";
import { Text } from "../Text/Text.js";
import styles from "./ScreenPreview.module.css";

export interface ScreenPreviewProps {
  readonly title: string;
  readonly identity: string;
  readonly available: boolean;
  readonly onOpen: () => void;
  readonly children?: ReactNode;
}

export function ScreenPreview({ title, identity, available, onOpen, children }: ScreenPreviewProps) {
  return <Surface className={styles.preview}>
    <Text variant="label">{title}</Text>
    <Text variant="code" as="code" tone="muted">{identity}</Text>
    {children}
    <Button variant="outline" disabled={!available} onClick={onOpen} aria-label={`Open screenshot: ${title} (${identity})`}>Open screenshot</Button>
  </Surface>;
}
