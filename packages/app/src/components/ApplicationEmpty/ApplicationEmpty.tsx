import type { ReactNode } from "react";
import { Button, Heading, Icon, Text } from "@journey-viewer/design-system";
import styles from "@/components/ApplicationEmpty/ApplicationEmpty.module.css";

export interface ApplicationEmptyProps {
  /** Opens the page's shared file chooser. */
  readonly onOpenFile: () => void;
  /** Other ways to start, below the file button, such as a link to an example. */
  readonly children?: ReactNode;
}

/** Shown below the header while no journey is open. */
export function ApplicationEmpty({
  onOpenFile,
  children,
}: ApplicationEmptyProps) {
  return (
    <section className={styles.empty} aria-labelledby="app-empty-title">
      <Heading level={2} size="md" id="app-empty-title">
        Choose a journey file
      </Heading>
      <Text as="p" tone="muted">
        A self-contained User Journey Graph JSON-LD document (.jsonld or .json).
      </Text>
      <Button
        variant="solid"
        size="md"
        className={styles.open}
        onClick={onOpenFile}
      >
        <Icon name="file" />
        Open file…
      </Button>
      {children && (
        <Text as="p" variant="caption" tone="muted">
          {children}
        </Text>
      )}
      <Text as="p" variant="caption" tone="muted" className={styles.note}>
        The file stays in this browser tab and is kept in memory until you
        reload or leave the page. Imports and remote contexts are not fetched.
      </Text>
    </section>
  );
}
