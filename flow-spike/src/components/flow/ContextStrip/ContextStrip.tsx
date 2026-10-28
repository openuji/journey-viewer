import type { CSSProperties } from "react";
import { TouchpointDot } from "@journey-viewer/design-system";
import styles from "@/components/flow/ContextStrip/ContextStrip.module.css";

export interface ContextStripItem {
  readonly key: string;
  readonly title: string;
  readonly touchpoint?: Readonly<{ label: string; color?: string }>;
  /** Returns to this journey: shows it, closing what is open inside unless it is the active one. */
  readonly onSelect: () => void;
}

export interface ContextStripProps {
  /** The active journey path, outermost first; the last item is the active journey. */
  readonly items: readonly ContextStripItem[];
}

/**
 * The path of open journeys down to the active one, from the root journey. Opening a composite
 * extends it; choosing an earlier step returns to that journey and closes what is open inside it.
 */
export function ContextStrip({ items }: ContextStripProps) {
  if (items.length === 0) return null;
  return (
    <nav className={styles.strip} aria-label="Journey path">
      <ol className={styles.list}>
        {items.map((item, i) => (
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
              className={styles.step}
              aria-current={i === items.length - 1 ? "location" : undefined}
              onClick={item.onSelect}
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
          </li>
        ))}
      </ol>
    </nav>
  );
}
