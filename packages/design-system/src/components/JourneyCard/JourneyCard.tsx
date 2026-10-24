import type { ReactNode } from "react";
import { Surface } from "@/components/Surface/Surface";
import { JourneyHead } from "@/components/JourneyHead/JourneyHead";
import type { JourneyHeadProps } from "@/components/JourneyHead/JourneyHead";
import styles from "@/components/JourneyCard/JourneyCard.module.css";

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
