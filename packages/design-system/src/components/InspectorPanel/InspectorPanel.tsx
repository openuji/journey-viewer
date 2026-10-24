import type { ReactNode } from "react";
import { Badge } from "@/components/Badge/Badge";
import { Button } from "@/components/Button/Button";
import { Heading } from "@/components/Heading/Heading";
import type { HeadingLevel } from "@/components/Heading/Heading";
import { Surface } from "@/components/Surface/Surface";
import { Text } from "@/components/Text/Text";
import { TouchpointDot } from "@/components/TouchpointDot/TouchpointDot";
import styles from "@/components/InspectorPanel/InspectorPanel.module.css";

export type InspectorDirection = "incoming" | "outgoing";

export interface InspectorTouchpoint {
  readonly id: string;
  readonly label: string;
  readonly color?: string;
}

export interface InspectorTransitionItem {
  readonly id: string;
  readonly label: string;
  readonly annotation?: string;
  readonly tags: readonly string[];
}

/** Transitions sharing the same state or exit at their other end. */
export interface InspectorTransitionGroup {
  readonly id: string;
  readonly label: string;
  readonly exit: boolean;
  readonly items: readonly InspectorTransitionItem[];
  /** Omitted by informational inspectors; the group head is then not interactive. */
  readonly onSelect?: () => void;
}

export interface InspectorDetail {
  readonly id: string;
  readonly label: string;
  readonly sub: string;
  readonly touchpoint?: Readonly<{ label: string; color?: string }>;
  readonly note?: string;
  readonly onSelect?: () => void;
}

export interface InspectorSection {
  readonly title: string;
  readonly direction?: InspectorDirection;
  readonly count?: number;
  readonly details?: readonly InspectorDetail[];
  readonly groups?: readonly InspectorTransitionGroup[];
  /** Shown when the section has no details or groups. */
  readonly empty?: string;
}

export interface InspectorPanelProps {
  readonly title: string;
  /** Human-readable kind, such as "State" or "Journey exit". */
  readonly typeLabel: string;
  readonly identity: string;
  /** The selection's journey path. */
  readonly crumb: string;
  readonly touchpoints: readonly InspectorTouchpoint[];
  readonly sections: readonly InspectorSection[];
  readonly footnote?: string;
  readonly level?: HeadingLevel;
  readonly media?: ReactNode;
  /** Appended after the built-in sections and footnote. */
  readonly children?: ReactNode;
}

const symbols = { incoming: "←", outgoing: "→" } as const;
const tones = { incoming: "entry", outgoing: "exit" } as const;

function DetailButton({ detail }: Readonly<{ detail: InspectorDetail }>) {
  const content = (
    <>
      {detail.touchpoint && (
        <TouchpointDot
          label={detail.touchpoint.label}
          {...(detail.touchpoint.color
            ? { color: detail.touchpoint.color }
            : {})}
        />
      )}
      <span className={styles.detailText}>
        <Text
          as="strong"
          variant="label"
          weight="semibold"
          className={styles.block}
        >
          {detail.label}
        </Text>
        <Text variant="caption" tone="muted" className={styles.block}>
          {detail.sub}
        </Text>
      </span>
    </>
  );
  return (
    <>
      {detail.onSelect ? (
        <Button
          variant="outline"
          className={styles.detail}
          onClick={detail.onSelect}
        >
          {content}
        </Button>
      ) : (
        <div className={styles.detail}>{content}</div>
      )}
      {detail.note && (
        <Text as="p" variant="caption" tone="muted" className={styles.note}>
          {detail.note}
        </Text>
      )}
    </>
  );
}

function TransitionGroup({
  group,
  direction,
}: Readonly<{
  group: InspectorTransitionGroup;
  direction: InspectorDirection;
}>) {
  const head = (
    <>
      <Text
        tone={tones[direction]}
        aria-hidden="true"
        className={styles.direction}
      >
        {symbols[direction]}
      </Text>
      <Text variant="label" weight="semibold">
        {group.label}
      </Text>
      {group.exit && <Badge>exit</Badge>}
      {group.items.length > 1 && (
        <Text variant="caption" tone="subtle" className={styles.groupCount}>
          {group.items.length}
        </Text>
      )}
    </>
  );
  return (
    <div className={styles.group}>
      {group.onSelect ? (
        <Button
          variant="row"
          className={styles.groupHead}
          onClick={group.onSelect}
        >
          {head}
        </Button>
      ) : (
        <div className={styles.groupHead}>{head}</div>
      )}
      <ul className={styles.items}>
        {group.items.map((item, index) => (
          <li key={`${index}:${item.id}`} className={styles.item}>
            <Text variant="caption" className={styles.block}>
              {item.label}
            </Text>
            {item.annotation && (
              <Text variant="caption" tone="muted" className={styles.block}>
                {item.annotation}
              </Text>
            )}
            {item.tags.length > 0 && (
              <Text variant="caption" tone="subtle" className={styles.block}>
                {item.tags.join(" · ")}
              </Text>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function InspectorPanel({
  title,
  typeLabel,
  identity,
  crumb,
  touchpoints,
  sections,
  footnote,
  level = 2,
  media,
  children,
}: InspectorPanelProps) {
  const sectionLevel = Math.min(level + 1, 6) as HeadingLevel;
  return (
    <Surface
      as="aside"
      aria-label="Selection inspector"
      className={styles.panel}
    >
      <header className={styles.head}>
        <Text as="p" variant="caption" tone="subtle">
          {crumb}
        </Text>
        <Heading level={level} className={styles.title}>
          {title}
        </Heading>
        <Text as="p" variant="caption" tone="muted" className={styles.meta}>
          {touchpoints.map((touchpoint, index) => (
            <span
              key={`${index}:${touchpoint.id}`}
              className={styles.touchpoint}
              title={touchpoint.id}
            >
              <TouchpointDot
                label={touchpoint.label}
                decorative
                {...(touchpoint.color ? { color: touchpoint.color } : {})}
              />
              {touchpoint.label}
            </span>
          ))}
          {touchpoints.length > 0 && <span aria-hidden="true">·</span>}
          <span>{typeLabel}</span>
        </Text>
        <Text
          as="code"
          variant="code"
          tone="subtle"
          className={styles.identity}
        >
          {identity}
        </Text>
      </header>
      {media && <div className={styles.media}>{media}</div>}
      <div className={styles.body}>
        {sections.map((section, index) => {
          const details = section.details ?? [];
          const groups = section.groups ?? [];
          return (
            <section
              key={`${index}:${section.title}`}
              className={styles.section}
            >
              <Heading
                level={sectionLevel}
                size="xs"
                className={styles.heading}
              >
                <Text
                  variant="caption"
                  weight="semibold"
                  tone={section.direction ? tones[section.direction] : "muted"}
                >
                  {section.direction && (
                    <span aria-hidden="true">
                      {symbols[section.direction]}{" "}
                    </span>
                  )}
                  {section.title}
                </Text>
                {section.count !== undefined && (
                  <Text variant="caption" tone="subtle" weight="medium">
                    {section.count}
                  </Text>
                )}
              </Heading>
              {details.map((detail, detailIndex) => (
                <DetailButton
                  key={`${detailIndex}:${detail.id}`}
                  detail={detail}
                />
              ))}
              {groups.map((group, groupIndex) => (
                <TransitionGroup
                  key={`${groupIndex}:${group.id}`}
                  group={group}
                  direction={section.direction ?? "outgoing"}
                />
              ))}
              {details.length === 0 && groups.length === 0 && (
                <Text
                  as="p"
                  variant="caption"
                  tone="subtle"
                  className={styles.empty}
                >
                  {section.empty ?? "None"}
                </Text>
              )}
            </section>
          );
        })}
        {footnote && (
          <Text as="p" variant="caption" tone="subtle" className={styles.foot}>
            {footnote}
          </Text>
        )}
        {children}
      </div>
    </Surface>
  );
}
