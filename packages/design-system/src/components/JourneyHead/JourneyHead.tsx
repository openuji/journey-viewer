import { Heading } from "../Heading/Heading.js";
import type { HeadingLevel } from "../Heading/Heading.js";
import { Text } from "../Text/Text.js";
import { Badge } from "../Badge/Badge.js";
import { TouchpointDot } from "../TouchpointDot/TouchpointDot.js";
import type { TouchpointDotProps } from "../TouchpointDot/TouchpointDot.js";
import styles from "./JourneyHead.module.css";

export interface JourneyHeadProps {
  readonly title: string;
  readonly count?: string;
  readonly touchpoint?: Readonly<Pick<TouchpointDotProps, "label" | "color">>;
  readonly touchpoints?: readonly Readonly<{ id: string; label: string; color?: string }>[];
  readonly level?: HeadingLevel;
  readonly filtered?: boolean;
}

export function JourneyHead({
  title,
  count,
  touchpoint,
  touchpoints = [],
  level = 2,
  filtered = false,
}: JourneyHeadProps) {
  return (
    <header className={styles.head} data-filtered={filtered || undefined}>
      {touchpoint && <TouchpointDot {...touchpoint} decorative />}
      <div className={styles.title}>
        <Heading level={level} size="sm">
          {title}
        </Heading>
        {touchpoint && (
          <Text variant="caption" tone="muted">
            {touchpoint.label}
          </Text>
        )}
        {touchpoints.map((item, index) => <span className={styles.touchpoint} key={`${index}:${item.id}`} title={item.id}>
          <TouchpointDot label={item.label} {...(item.color ? { color: item.color } : {})} decorative />
          <Text variant="caption" tone="muted">{item.label}</Text>
        </span>)}
      </div>
      {count !== undefined && (
        <Badge className={styles.count ?? ""}>{count}</Badge>
      )}
    </header>
  );
}
