import type { CSSProperties } from "react";
import { Icon, IconButton, TouchpointDot } from "@journey-viewer/design-system";
import type { Tone } from "@/model/presentation";
import styles from "@/components/primitives/CompositeCard/CompositeCard.module.css";

export interface CompositeCardProps {
  readonly title: readonly string[];
  readonly caption: readonly string[];
  readonly touchpoint?: Readonly<{ label: string; color?: string }>;
  /** `expand` on a closed composite, `collapse` on one whose frame grows from this card. */
  readonly toggle: "expand" | "collapse" | null;
  readonly selected?: boolean;
  readonly tone?: Tone;
  readonly onSelect: () => void;
  readonly onToggle?: () => void;
  readonly className?: string | undefined;
  readonly style?: CSSProperties;
}

/**
 * The card a composite (or a root journey) is known by. Open, the very same card becomes the
 * top-left corner of the frame, with its toggle in the same place: the tree's chevron, turned down.
 */
export function CompositeCard({
  title,
  caption,
  touchpoint,
  toggle,
  selected = false,
  tone,
  onSelect,
  onToggle,
  className,
  style,
}: CompositeCardProps) {
  const name = title.join(" ");
  return (
    <div
      className={[styles.card, className].filter(Boolean).join(" ")}
      style={
        touchpoint?.color
          ? ({
              ...style,
              "--jv-touchpoint-color": touchpoint.color,
            } as CSSProperties)
          : style
      }
      data-open={toggle === "collapse" || undefined}
      data-selected={selected || undefined}
      data-tone={selected ? undefined : tone}
    >
      <button
        type="button"
        className={styles.select}
        aria-current={selected || undefined}
        onClick={onSelect}
      >
        {title.map((line, i) => (
          <span key={i} className={styles.title}>
            {line}
          </span>
        ))}
        <span className={styles.caption}>
          {touchpoint && (
            <span className={styles.dot}>
              <TouchpointDot
                label={touchpoint.label}
                {...(touchpoint.color ? { color: touchpoint.color } : {})}
                decorative
              />
            </span>
          )}
          <span className={styles.captionText}>
            {caption.map((line, i) => (
              <span key={i}>{line}</span>
            ))}
          </span>
        </span>
      </button>
      {toggle && onToggle && (
        <IconButton
          className={styles.toggle}
          size="sm"
          label={`${toggle === "expand" ? "Expand" : "Collapse"} ${name}`}
          aria-expanded={toggle === "collapse"}
          icon={<Icon name="chevron" />}
          onClick={onToggle}
        />
      )}
    </div>
  );
}
