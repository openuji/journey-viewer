import type { CSSProperties } from "react";
import { Button } from "@/components/Button/Button";
import { Text } from "@/components/Text/Text";
import styles from "@/components/ContractGlyph/ContractGlyph.module.css";

export interface ContractGlyphProps {
  readonly kind: "entry" | "exit";
  /** The journey's default entry: a filled circle. */
  readonly isDefault?: boolean;
  /** Pre-wrapped caption lines. */
  readonly lines: readonly string[];
  readonly label: string;
  readonly selected?: boolean;
  readonly onSelect: () => void;
  readonly className?: string | undefined;
  readonly style?: CSSProperties;
}

/**
 * Entry and exit contracts in statechart grammar: a circle on the frame's top border (filled when it
 * is the default entry) or a ring with a centre on its bottom border, an ending rather than a
 * failure. A plain caption, never a box.
 */
export function ContractGlyph({
  kind,
  isDefault = false,
  lines,
  label,
  selected = false,
  onSelect,
  className,
  style,
}: ContractGlyphProps) {
  return (
    <Button
      variant="bare"
      className={[styles.contract, className].filter(Boolean).join(" ")}
      style={style}
      data-kind={kind}
      data-current={selected || undefined}
      aria-label={`${kind === "entry" ? (isDefault ? "Default entry" : "Entry") : "Exit"}: ${label}`}
      aria-current={selected || undefined}
      onClick={onSelect}
    >
      <svg
        className={styles.glyph}
        viewBox="0 0 14 14"
        width="14"
        height="14"
        aria-hidden="true"
      >
        {kind === "entry" ? (
          <circle
            cx="7"
            cy="7"
            r="4.75"
            data-default={isDefault || undefined}
          />
        ) : (
          <>
            <circle cx="7" cy="7" r="4.75" />
            <circle cx="7" cy="7" r="2" data-core />
          </>
        )}
      </svg>
      <span className={styles.text}>
        {lines.map((line, i) => (
          <Text key={i} variant="caption" tone="muted" className={styles.line}>
            {line}
            {i < lines.length - 1 ? " " : ""}
          </Text>
        ))}
      </span>
    </Button>
  );
}
