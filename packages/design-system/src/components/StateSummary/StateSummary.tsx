import type { ReactNode } from "react";
import { Badge } from "@/components/Badge/Badge";
import { Text } from "@/components/Text/Text";
import styles from "@/components/StateSummary/StateSummary.module.css";

export interface StateSummaryProps {
  readonly label: string;
  readonly entryCount?: number;
  readonly directExitCount?: number;
  readonly children?: ReactNode;
}

/** A state label and explicit boundary counts, followed by caller-supplied content. */
export function StateSummary({
  label,
  entryCount = 0,
  directExitCount = 0,
  children,
}: StateSummaryProps) {
  return (
    <div className={styles.summary}>
      <div className={styles.row}>
        <Text variant="label" className={styles.label}>
          {label}
        </Text>
        <span className={styles.marks}>
          {entryCount > 0 && (
            <Badge
              tone="entry"
              label={`${entryCount} ${entryCount === 1 ? "entry names" : "entries name"} this state`}
            >
              ←{entryCount}
            </Badge>
          )}
          {directExitCount > 0 && (
            <Badge
              tone="exit"
              label={`${directExitCount} listed ${directExitCount === 1 ? "exit" : "exits"} reached by a direct transition from this state`}
            >
              →{directExitCount}
            </Badge>
          )}
        </span>
      </div>
      {children && <div className={styles.nested}>{children}</div>}
    </div>
  );
}
