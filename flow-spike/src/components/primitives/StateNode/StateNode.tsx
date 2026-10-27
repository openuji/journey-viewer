import type { CSSProperties } from "react";
import { ScreenAction } from "@journey-viewer/design-system";
import type { Tone } from "@/model/presentation";
import styles from "@/components/primitives/StateNode/StateNode.module.css";

export interface StateNodeProps {
  /** Pre-wrapped lines; the layout sized the node for exactly these. */
  readonly lines: readonly string[];
  readonly label: string;
  readonly selected?: boolean;
  readonly tone?: Tone;
  readonly screen?: Readonly<{
    label: string;
    color?: string;
    onOpen: () => void;
  }>;
  /** Outgoing navigation affordances (spec detail); never drawn as edges. */
  readonly outgoing?: number;
  readonly onSelect: () => void;
  readonly className?: string | undefined;
  readonly style?: CSSProperties;
}

/** One state on the flow canvas: a paper card with the hierarchy's relation tones. */
export function StateNode({
  lines,
  label,
  selected = false,
  tone,
  screen,
  outgoing = 0,
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
      <button
        type="button"
        className={styles.select}
        aria-label={label}
        aria-current={selected || undefined}
        onClick={onSelect}
      >
        {lines.map((line, i) => (
          <span key={i} className={styles.line}>
            {line}
            {i < lines.length - 1 ? " " : ""}
          </span>
        ))}
      </button>
      {screen && (
        <ScreenAction
          className={styles.screen}
          label={screen.label}
          {...(screen.color ? { color: screen.color } : {})}
          onClick={screen.onOpen}
        />
      )}
      {outgoing > 0 && (
        <span
          className={styles.outgoing}
          title={`${outgoing} outgoing navigation ${outgoing === 1 ? "affordance" : "affordances"}`}
        >
          <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true">
            <path
              d="M4 3h5v5M9 3L3 9"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {outgoing}
        </span>
      )}
    </div>
  );
}
