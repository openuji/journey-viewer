import type { CSSProperties } from "react";
import { Button } from "@/components/Button/Button";
import { ScreenAction } from "@/components/StateRow/StateRow";
import { Text } from "@/components/Text/Text";
import styles from "@/components/StateNode/StateNode.module.css";

/** Relation to the active step: it leads into it, follows from it, or both. */
export type FlowTone = "incoming" | "outgoing" | "both";

export interface StateNodeProps {
  /** Pre-wrapped lines; the layout sized the node for exactly these. */
  readonly lines: readonly string[];
  readonly label: string;
  readonly selected?: boolean;
  readonly tone?: FlowTone;
  readonly screen?: Readonly<{
    label: string;
    color?: string;
    onOpen: () => void;
  }>;
  readonly onSelect: () => void;
  readonly className?: string | undefined;
  readonly style?: CSSProperties;
}

/** One state on a flow canvas: a paper card with the hierarchy's relation tones. */
export function StateNode({
  lines,
  label,
  selected = false,
  tone,
  screen,
  onSelect,
  className,
  style,
}: StateNodeProps) {
  return (
    <div
      className={[styles.node, className].filter(Boolean).join(" ")}
      style={style}
      data-selected={selected || undefined}
      data-tone={selected ? undefined : tone}
    >
      <Button
        variant="bare"
        className={styles.select}
        aria-label={label}
        aria-current={selected || undefined}
        onClick={onSelect}
      >
        {lines.map((line, i) => (
          <Text key={i} className={styles.line}>
            {line}
            {i < lines.length - 1 ? " " : ""}
          </Text>
        ))}
      </Button>
      {screen && (
        <ScreenAction
          className={styles.screen}
          label={screen.label}
          {...(screen.color ? { color: screen.color } : {})}
          onClick={screen.onOpen}
        />
      )}
    </div>
  );
}
