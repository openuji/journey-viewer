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
  readonly level?: HeadingLevel;
}

export function JourneyHead({
  title,
  count,
  touchpoint,
  level = 2,
}: JourneyHeadProps) {
  return (
    <header className={styles.head}>
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
      </div>
      {count !== undefined && (
        <Badge className={styles.count ?? ""}>{count}</Badge>
      )}
    </header>
  );
}
