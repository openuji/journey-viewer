import { useId } from "react";
import type { CSSProperties } from "react";
import { Button } from "@/components/Button/Button";
import { Icon } from "@/components/Icon/Icon";
import { IconButton } from "@/components/IconButton/IconButton";
import type { FlowTone } from "@/components/StateNode/StateNode";
import { Text } from "@/components/Text/Text";
import { TouchpointDot } from "@/components/TouchpointDot/TouchpointDot";
import styles from "@/components/CompositeCard/CompositeCard.module.css";

export interface CompositeCardProps {
  /** Pre-wrapped title lines. */
  readonly title: readonly string[];
  /** Pre-wrapped caption lines, such as the child journeys or a state count. */
  readonly caption: readonly string[];
  readonly touchpoint?: Readonly<{ label: string; color?: string }>;
  /** `expand` on a closed composite, `collapse` on one whose frame grows from this card. */
  readonly toggle: "expand" | "collapse" | null;
  /** Heads an open frame: printed on the frame, whose border is the composite's own. */
  readonly heading?: boolean;
  /** Heads the active journey; assistive technology hears it as the current journey. */
  readonly current?: boolean;
  readonly selected?: boolean;
  readonly tone?: FlowTone;
  readonly onSelect: () => void;
  readonly onToggle?: () => void;
  readonly className?: string | undefined;
  readonly style?: CSSProperties;
}

/**
 * The card a composite (or a root journey) is known by on a flow canvas. Open, the same content
 * becomes the heading in its frame's top-left corner, without a box of its own, with its toggle in
 * the same place: the tree's chevron, turned down.
 */
export function CompositeCard({
  title,
  caption,
  touchpoint,
  toggle,
  heading = false,
  current = false,
  selected = false,
  tone,
  onSelect,
  onToggle,
  className,
  style,
}: CompositeCardProps) {
  const described = useId();
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
      data-heading={heading || undefined}
      data-selected={selected || undefined}
      data-tone={selected ? undefined : tone}
    >
      <Button
        variant="bare"
        className={styles.select}
        aria-current={selected || undefined}
        aria-describedby={current ? described : undefined}
        onClick={onSelect}
      >
        {title.map((line, i) => (
          <Text
            key={i}
            variant="label"
            weight="semibold"
            className={styles.title}
          >
            {line}
          </Text>
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
              <Text
                key={i}
                variant="caption"
                tone="muted"
                className={styles.captionLine}
              >
                {line}
              </Text>
            ))}
          </span>
        </span>
        {current && (
          <span id={described} className={styles.hidden}>
            Current journey
          </span>
        )}
      </Button>
      {toggle && onToggle && (
        <IconButton
          className={styles.toggle}
          size="sm"
          label={`${toggle === "expand" ? "Expand" : "Collapse"} ${title.join(" ")}`}
          aria-expanded={toggle === "collapse"}
          icon={<Icon name="chevron" />}
          onClick={onToggle}
        />
      )}
    </div>
  );
}
