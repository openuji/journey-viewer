import type { CSSProperties } from "react";
import { Icon, IconButton, TouchpointDot } from "@journey-viewer/design-system";
import styles from "@/components/flow/ContextStrip/ContextStrip.module.css";

export interface ContextStripItem {
  readonly key: string;
  readonly title: string;
  readonly touchpoint?: Readonly<{ label: string; color?: string }>;
  readonly onReveal: () => void;
  readonly onCollapse: () => void;
}

export interface ContextStripProps {
  readonly items: readonly ContextStripItem[];
}

/**
 * Names the open containers the reader is scrolled inside of, outermost first, each with the same
 * collapse action its card carries. Empty when every enclosing card is in view.
 */
export function ContextStrip({ items }: ContextStripProps) {
  if (items.length === 0) return null;
  return (
    <nav className={styles.strip} aria-label="Open containers in view">
      <ol className={styles.list}>
        {items.map((item) => (
          <li
            key={item.key}
            className={styles.item}
            style={
              item.touchpoint?.color
                ? ({
                    "--jv-touchpoint-color": item.touchpoint.color,
                  } as CSSProperties)
                : undefined
            }
          >
            <button
              type="button"
              className={styles.reveal}
              onClick={item.onReveal}
            >
              {item.touchpoint && (
                <span className={styles.dot}>
                  <TouchpointDot
                    label={item.touchpoint.label}
                    {...(item.touchpoint.color
                      ? { color: item.touchpoint.color }
                      : {})}
                    decorative
                  />
                </span>
              )}
              {item.title}
            </button>
            <IconButton
              size="xs"
              label={`Collapse ${item.title}`}
              icon={<Icon name="collapse-all" />}
              onClick={item.onCollapse}
            />
          </li>
        ))}
      </ol>
    </nav>
  );
}
