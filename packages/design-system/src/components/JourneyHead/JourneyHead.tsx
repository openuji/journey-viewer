import type { CSSProperties } from "react";
import { Heading } from "../Heading/Heading.js";
import type { HeadingLevel } from "../Heading/Heading.js";
import { Text } from "../Text/Text.js";
import { TouchpointDot } from "../TouchpointDot/TouchpointDot.js";
import type { TouchpointDotProps } from "../TouchpointDot/TouchpointDot.js";
import styles from "./JourneyHead.module.css";

export interface JourneyHeadProps {
  readonly title: string;
  readonly count?: string;
  /** A single captioned touchpoint; the visible caption names it, so the dot is decorative. */
  readonly touchpoint?: Readonly<Pick<TouchpointDotProps, "label" | "color">>;
  /** Individually named touchpoint dots without captions. */
  readonly touchpoints?: readonly Readonly<{ id: string; label: string; color?: string }>[];
  /** Context above the title, such as the ancestor path of a column. */
  readonly crumb?: string;
  readonly level?: HeadingLevel;
  readonly filtered?: boolean;
  /** Tinted with the first touchpoint color when a filter matches this journey. */
  readonly matched?: boolean;
}

export function JourneyHead({
  title,
  count,
  touchpoint,
  touchpoints = [],
  crumb,
  level = 2,
  filtered = false,
  matched = false,
}: JourneyHeadProps) {
  const tint = touchpoints[0]?.color ?? touchpoint?.color;
  return (
    <header className={styles.head} data-filtered={filtered || undefined} data-matched={matched || undefined}
      data-crumb={crumb !== undefined || undefined}
      style={tint === undefined ? undefined : ({ "--jv-touchpoint-color": tint } as CSSProperties)}>
      {touchpoint && <TouchpointDot {...touchpoint} decorative className={styles.dot ?? ""} />}
      {touchpoints.map((item, index) => (
        <TouchpointDot key={`${index}:${item.id}`} label={item.label} className={styles.dot ?? ""}
          {...(item.color ? { color: item.color } : {})} />
      ))}
      <div className={styles.title}>
        {crumb !== undefined && <Text as="p" variant="caption" tone="subtle">{crumb}</Text>}
        <Heading level={level} size="sm">
          {title}
        </Heading>
        {touchpoint && (
          <Text variant="caption" tone="muted">
            {touchpoint.label}
          </Text>
        )}
      </div>
      {count !== undefined && (
        <Text variant="caption" tone="subtle" className={styles.count}>{count}</Text>
      )}
    </header>
  );
}
