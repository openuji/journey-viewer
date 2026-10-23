import type { CSSProperties, ReactNode } from "react";
import { Button } from "../Button/Button.js";
import type { ButtonProps } from "../Button/Button.js";
import { Icon } from "../Icon/Icon.js";
import { IconButton } from "../IconButton/IconButton.js";
import { Text } from "../Text/Text.js";
import { TouchpointDot } from "../TouchpointDot/TouchpointDot.js";
import styles from "./StateRow.module.css";

/** Relation to the active (hovered, else selected) state of the same journey. */
export type StateRowTone = "active" | "incoming" | "outgoing" | "both" | "dim";

export interface StateRowMarks {
  /** Transitions from this row to the active state. */
  readonly incoming: number;
  /** Transitions from the active state to this row. */
  readonly outgoing: number;
  readonly title?: string;
}

export interface StateRowProps {
  readonly label: string;
  /** Secondary text after the label, such as a child journey name; hidden on narrow layouts. */
  readonly description?: string;
  /** A composite renders a disclosure button when `onToggle` is supplied, else a decorative caret. */
  readonly composite?: boolean;
  /** Whether the composite's child content is shown (or, without `onToggle`, open elsewhere). */
  readonly expanded?: boolean;
  readonly selected?: boolean;
  readonly filtered?: boolean;
  readonly tone?: StateRowTone;
  readonly marks?: StateRowMarks;
  /** A different touchpoint entered through this composite. */
  readonly crossing?: Readonly<{ label: string; color?: string }>;
  readonly onSelect?: () => void;
  readonly onToggle?: () => void;
  /** Hovering the row reports true; leaving it, or hovering its marks, reports false. */
  readonly onHover?: (hovered: boolean) => void;
  readonly actions?: ReactNode;
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
  tone,
  marks,
  crossing,
  onSelect,
  onToggle,
  onHover,
  actions,
  notice,
  children,
}: StateRowProps) {
  const showMarks = marks !== undefined && (marks.incoming > 0 || marks.outgoing > 0);
  return (
    <div className={styles.container} data-filtered={filtered || undefined}>
      <div
        className={styles.row}
        data-row=""
        data-tone={tone}
        data-selected={selected || undefined}
        data-composite={composite || undefined}
        onPointerOver={() => onHover?.(true)}
        onPointerLeave={() => onHover?.(false)}
      >
        {composite && onToggle ? (
          <IconButton
            size="xs"
            className={styles.caret}
            label={`${expanded ? "Collapse" : "Expand"} ${label}`}
            aria-expanded={expanded}
            data-open={expanded || undefined}
            onClick={onToggle}
            icon={<Icon name="chevron" />}
          />
        ) : composite ? (
          <span className={styles.indicator} data-open={expanded || undefined} aria-hidden="true">
            <Icon name="chevron" />
          </span>
        ) : (
          <span className={styles.spacer} aria-hidden="true" />
        )}
        <Button variant="bare" className={styles.main} aria-pressed={selected} onClick={onSelect}>
          <Text variant="label" weight={composite || selected ? "semibold" : "medium"} className={styles.label}>{label}</Text>
          {crossing && <TouchpointDot label={`Crosses into ${crossing.label}`} {...(crossing.color ? { color: crossing.color } : {})} />}
          {description && (
            <Text className={styles.description} variant="caption" tone="subtle">
              {description}
            </Text>
          )}
        </Button>
        {showMarks && (
          <span className={styles.marks} title={marks.title}
            onPointerOver={(event) => { event.stopPropagation(); onHover?.(false); }}>
            {marks.incoming > 0 && <Text variant="caption" tone="entry" weight="semibold" aria-hidden="true">←{marks.incoming}</Text>}
            {marks.outgoing > 0 && <Text variant="caption" tone="exit" weight="semibold" aria-hidden="true">→{marks.outgoing}</Text>}
            <span className={styles.hidden}>
              {[
                marks.incoming > 0 ? `${marks.incoming} ${marks.incoming === 1 ? "transition" : "transitions"} into the active state` : "",
                marks.outgoing > 0 ? `${marks.outgoing} ${marks.outgoing === 1 ? "transition" : "transitions"} from the active state` : "",
              ].filter(Boolean).join(", ")}
            </span>
          </span>
        )}
        {actions}
      </div>
      {notice && <div className={styles.nested}>{notice}</div>}
      {expanded && children && <div className={styles.children}>{children}</div>}
    </div>
  );
}

export type ScreenActionProps = Readonly<Omit<ButtonProps, "children" | "variant" | "size" | "iconOnly" | "aria-label"> & {
  /** Accessible name, such as "Screen mockup: Login". */
  label: string;
  /** Touchpoint color used on hover, focus and touch devices. */
  color?: string;
}>;

/** The compact phone action that opens a row's screenshot. */
export function ScreenAction({ label, color, className, style, ...props }: ScreenActionProps) {
  return <IconButton {...props} size="xs" label={label} icon={<Icon name="phone" />}
    className={[styles.screen, className].filter(Boolean).join(" ")}
    style={color === undefined ? style : ({ ...style, "--jv-touchpoint-color": color } as CSSProperties)} />;
}
