import type { ReactNode } from "react";
import { Button } from "../Button/Button.js";
import { IconButton } from "../IconButton/IconButton.js";
import { Text } from "../Text/Text.js";
import { Badge } from "../Badge/Badge.js";
import styles from "./StateRow.module.css";

export interface StateRowProps {
  readonly label: string;
  readonly description?: string;
  readonly composite?: boolean;
  readonly expanded?: boolean;
  readonly selected?: boolean;
  readonly filtered?: boolean;
  readonly relation?: "incoming" | "outgoing" | "both";
  readonly entryCount?: number;
  readonly exitCount?: number;
  readonly onSelect?: () => void;
  readonly onToggle?: () => void;
  readonly onHover?: (hovered: boolean) => void;
  /** Persistent nested information, independent of child disclosure. */
  readonly notice?: ReactNode;
  readonly children?: ReactNode;
}

export function StateRow({
  label,
  description,
  composite = false,
  expanded = false,
  selected = false,
  filtered = false,
  relation,
  entryCount = 0,
  exitCount = 0,
  onSelect,
  onToggle,
  onHover,
  notice,
  children,
}: StateRowProps) {
  return (
    <div className={styles.container} data-filtered={filtered || undefined}>
      <div
        className={styles.row}
        data-relation={relation}
        onPointerEnter={() => onHover?.(true)}
        onPointerLeave={() => onHover?.(false)}
        data-boundary={
          entryCount && exitCount
            ? "both"
            : entryCount
              ? "entry"
              : exitCount
                ? "exit"
                : undefined
        }
      >
        {composite ? (
          <IconButton
            label={`${expanded ? "Collapse" : "Expand"} ${label}`}
            aria-expanded={expanded}
            onClick={onToggle}
            icon={
              <svg
                viewBox="0 0 16 16"
                fill="none"
                className={expanded ? styles.expanded : undefined}
              >
                <path
                  d="m6 3 5 5-5 5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
              </svg>
            }
          />
        ) : (
          <span className={styles.spacer} aria-hidden="true" />
        )}
        <Button
          variant="row"
          className={styles.main}
          selected={selected}
          aria-pressed={selected}
          onClick={onSelect}
        >
          <Text variant="label">{label}</Text>
          {description && (
            <Text
              className={styles.description}
              variant="caption"
              tone="subtle"
            >
              {description}
            </Text>
          )}
        </Button>
        {(entryCount > 0 || exitCount > 0) && (
          <span className={styles.marks}>
            {entryCount > 0 && (
              <Badge
                tone="entry"
                label={`${entryCount} ${entryCount === 1 ? "entry" : "entries"}`}
              >
                ←{entryCount}
              </Badge>
            )}
            {exitCount > 0 && (
              <Badge
                tone="exit"
                label={`${exitCount} ${exitCount === 1 ? "exit" : "exits"}`}
              >
                →{exitCount}
              </Badge>
            )}
          </span>
        )}
        {relation && <Badge tone={relation === "incoming" ? "entry" : "exit"}>
          {relation === "both" ? "Incoming and outgoing" : relation === "incoming" ? "Incoming" : "Outgoing"}
        </Badge>}
      </div>
      {notice && <div className={styles.nested}>{notice}</div>}
      {expanded && children && <div className={styles.nested}>{children}</div>}
    </div>
  );
}
