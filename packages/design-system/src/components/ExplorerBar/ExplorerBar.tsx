import type { ReactNode, Ref } from "react";
import { Text } from "@/components/Text/Text";
import styles from "@/components/ExplorerBar/ExplorerBar.module.css";

export interface ExplorerBarProps {
  readonly ref?: Ref<HTMLElement>;
  readonly children?: ReactNode;
}

export interface ExplorerBarTitleProps {
  readonly title: string;
  readonly subtitle?: string;
}

/** The explorer's toolbar; sticky from the `md` breakpoint. Callers arrange its groups. */
export function ExplorerBar({ ref, children }: ExplorerBarProps) {
  return (
    <header ref={ref} className={styles.bar} data-explorer-bar="">
      {children}
    </header>
  );
}

export function ExplorerBarTitle({ title, subtitle }: ExplorerBarTitleProps) {
  return (
    <div className={styles.title}>
      <Text
        as="strong"
        variant="label"
        weight="semibold"
        className={styles.block}
      >
        {title}
      </Text>
      {subtitle && (
        <Text variant="caption" tone="subtle" className={styles.block}>
          {subtitle}
        </Text>
      )}
    </div>
  );
}

/** Pushes the following bar groups to the end of the row. */
export function ExplorerBarSpacer() {
  return <span aria-hidden="true" className={styles.spacer} />;
}
