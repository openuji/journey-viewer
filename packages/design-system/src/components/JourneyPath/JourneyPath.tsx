import type { CSSProperties, ReactNode } from "react";
import { Button } from "@/components/Button/Button";
import { Text } from "@/components/Text/Text";
import { TouchpointDot } from "@/components/TouchpointDot/TouchpointDot";
import styles from "@/components/JourneyPath/JourneyPath.module.css";

export interface JourneyPathItem {
  readonly id: string;
  readonly title: string;
  readonly touchpoint?: Readonly<{ label: string; color?: string }>;
  readonly onSelect: () => void;
}

export interface JourneyPathProps {
  /** Outermost first; the last item is the current journey. */
  readonly items: readonly JourneyPathItem[];
  readonly label?: string;
  /** Controls for what the path shows, at the bar's end. */
  readonly end?: ReactNode;
}

/**
 * The path of open journeys down to the current one, from the root journey. Choosing an earlier
 * step returns to that journey.
 */
export function JourneyPath({
  items,
  label = "Journey path",
  end,
}: JourneyPathProps) {
  if (items.length === 0 && end === undefined) return null;
  return (
    <div className={styles.bar}>
      <nav className={styles.path} aria-label={label}>
        <ol className={styles.list}>
          {items.map((item, i) => {
            const current = i === items.length - 1;
            return (
              <li
                key={item.id}
                className={styles.item}
                style={
                  item.touchpoint?.color
                    ? ({
                        "--jv-touchpoint-color": item.touchpoint.color,
                      } as CSSProperties)
                    : undefined
                }
              >
                <Button
                  variant="ghost"
                  size="xs"
                  className={styles.step}
                  aria-current={current ? "location" : undefined}
                  onClick={item.onSelect}
                >
                  {item.touchpoint && (
                    <TouchpointDot
                      label={item.touchpoint.label}
                      {...(item.touchpoint.color
                        ? { color: item.touchpoint.color }
                        : {})}
                      decorative
                    />
                  )}
                  <Text
                    variant="label"
                    weight={current ? "semibold" : "medium"}
                  >
                    {item.title}
                  </Text>
                </Button>
              </li>
            );
          })}
        </ol>
      </nav>
      {end !== undefined && <div className={styles.end}>{end}</div>}
    </div>
  );
}
