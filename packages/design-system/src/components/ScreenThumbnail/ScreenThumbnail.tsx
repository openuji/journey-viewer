import type { ReactNode } from "react";
import { Button } from "@/components/Button/Button";
import { Text } from "@/components/Text/Text";
import styles from "@/components/ScreenThumbnail/ScreenThumbnail.module.css";

export interface ScreenThumbnailProps {
  readonly label: string;
  /** Omitted when no larger view is available; the thumbnail is then not interactive. */
  readonly onOpen?: () => void;
  readonly hint?: string;
  /** Usually a `ScreenImage`. */
  readonly children?: ReactNode;
}

/** A compact screenshot that opens the larger view. */
export function ScreenThumbnail({
  label,
  onOpen,
  hint = "Enlarge",
  children,
}: ScreenThumbnailProps) {
  if (!onOpen)
    return (
      <span className={styles.static}>
        <span className={styles.image}>{children}</span>
      </span>
    );
  return (
    <Button
      variant="panel"
      className={styles.thumbnail}
      aria-label={`Enlarge screenshot: ${label}`}
      onClick={onOpen}
    >
      <span className={styles.image}>{children}</span>
      <Text
        variant="caption"
        tone="muted"
        className={styles.hint}
        aria-hidden="true"
      >
        {hint}
      </Text>
    </Button>
  );
}
