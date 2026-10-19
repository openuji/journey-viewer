import type { ReactNode } from "react";
import { Surface } from "../Surface/Surface.js";
import { JourneyHead } from "../JourneyHead/JourneyHead.js";
import type { JourneyHeadProps } from "../JourneyHead/JourneyHead.js";
import styles from "./JourneyCard.module.css";

export interface JourneyCardProps extends JourneyHeadProps {
  readonly children?: ReactNode;
  readonly className?: string;
}

export function JourneyCard({
  children,
  className,
  ...head
}: JourneyCardProps) {
  return (
    <Surface
      as="article"
      className={[styles.card, className].filter(Boolean).join(" ")}
    >
      <JourneyHead {...head} />
      <div className={styles.content}>{children}</div>
    </Surface>
  );
}
