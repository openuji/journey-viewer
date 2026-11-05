import type { CSSProperties } from "react";
import { Button } from "@/components/Button/Button";
import { Icon } from "@/components/Icon/Icon";
import { Text } from "@/components/Text/Text";
import { Tooltip } from "@/components/Tooltip/Tooltip";
import { TouchpointDot } from "@/components/TouchpointDot/TouchpointDot";
import styles from "@/components/JourneyPath/JourneyPath.module.css";

/** A journey that can stand in a step of the path. */
export interface JourneyPathChoice {
  readonly id: string;
  readonly title: string;
  readonly onSelect: () => void;
}

export interface JourneyPathItem {
  readonly id: string;
  readonly title: string;
  readonly touchpoint?: Readonly<{ label: string; color?: string }>;
  /** The journeys this step could be, itself included: its title gains a switch between them. */
  readonly choices?: readonly JourneyPathChoice[];
  readonly onSelect: () => void;
}

export interface JourneyPathProps {
  /** Outermost first; the last item is the current journey. */
  readonly items: readonly JourneyPathItem[];
  readonly label?: string;
  /** Accessible name and tooltip of a step's switch between journeys. */
  readonly choiceLabel?: string;
}

/**
 * The path of open journeys down to the current one, from the root journey. Choosing an earlier
 * step returns to that journey; a step with choices can also be switched to another journey. From
 * the `md` breakpoint the path keeps to one line: earlier steps give up width before the current
 * one.
 */
export function JourneyPath({
  items,
  label = "Journey path",
  choiceLabel = "Switch journey",
}: JourneyPathProps) {
  if (items.length === 0) return null;
  return (
    <nav className={styles.path} aria-label={label}>
      <ol
        className={styles.list}
        style={{ "--jv-path-earlier": items.length - 1 } as CSSProperties}
      >
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
                  className={styles.title}
                >
                  {item.title}
                </Text>
              </Button>
              {item.choices && item.choices.length > 1 && (
                <Tooltip label={choiceLabel}>
                  <span className={styles.choice}>
                    <select
                      className={styles.select}
                      aria-label={choiceLabel}
                      value={item.id}
                      onChange={(event) =>
                        item.choices
                          ?.find((choice) => choice.id === event.target.value)
                          ?.onSelect()
                      }
                    >
                      {item.choices.map((choice) => (
                        <option key={choice.id} value={choice.id}>
                          {choice.title}
                        </option>
                      ))}
                    </select>
                    <Icon name="chevron" />
                  </span>
                </Tooltip>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
