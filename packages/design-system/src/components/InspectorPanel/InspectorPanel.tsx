import { Badge } from "../Badge/Badge.js";
import { Heading } from "../Heading/Heading.js";
import type { HeadingLevel } from "../Heading/Heading.js";
import { Surface } from "../Surface/Surface.js";
import { Text } from "../Text/Text.js";
import styles from "./InspectorPanel.module.css";
import type { ReactNode } from "react";

export interface InspectorItem {
  readonly id: string;
  readonly label: string;
  readonly details: readonly string[];
}

export interface InspectorSection {
  readonly title: string;
  readonly items: readonly InspectorItem[];
}

export interface InspectorPanelProps {
  readonly title: string;
  readonly kind: string;
  readonly identity: string;
  readonly context: string;
  readonly touchpoints: readonly string[];
  readonly sections: readonly InspectorSection[];
  readonly level?: HeadingLevel;
  readonly children?: ReactNode;
}

export function InspectorPanel({ title, kind, identity, context, touchpoints, sections, level = 2, children }: InspectorPanelProps) {
  return (
    <Surface as="aside" aria-label="Selection inspector" className={styles.panel}>
      <header className={styles.header}>
        <Text variant="caption" tone="muted">{context}</Text>
        <Heading level={level}>{title}</Heading>
        <Badge>{kind}</Badge>
        <Text as="code" variant="code">{identity}</Text>
        {touchpoints.length > 0 && (
          <ul className={styles.details} aria-label="Touchpoints">
            {touchpoints.map((label, index) => <li key={`${index}:${label}`}><Text variant="caption" tone="muted">{label}</Text></li>)}
          </ul>
        )}
      </header>
      {sections.map((section, index) => (
        <div key={`${index}:${section.title}`} className={styles.section}>
          <div className={styles.sectionHead}>
            <Heading level={Math.min(level + 1, 6) as HeadingLevel} size="sm">{section.title}</Heading>
            <Badge>{section.items.length}</Badge>
          </div>
          <ul className={styles.items}>
            {section.items.map((item, itemIndex) => (
              <li key={`${itemIndex}:${item.id}`} className={styles.item}>
                <Text variant="label">{item.label}</Text>
                <Text as="code" variant="code" tone="muted">{item.id}</Text>
                {item.details.map((detail, detailIndex) => <Text as="p" key={detailIndex} variant="caption" tone="muted">{detail}</Text>)}
              </li>
            ))}
            {section.items.length === 0 && <li><Text variant="caption" tone="muted">None.</Text></li>}
          </ul>
        </div>
      ))}
      {children}
    </Surface>
  );
}
