import type { HTMLAttributes, ReactNode } from "react";
import { Surface } from "../Surface/Surface.js";
import { Text } from "../Text/Text.js";
import type { TextTone } from "../Text/Text.js";
import styles from "./Badge.module.css";

export type BadgeProps = Readonly<
  HTMLAttributes<HTMLSpanElement> & {
    children: ReactNode;
    tone?: TextTone;
    label?: string;
  }
>;

export function Badge({
  children,
  tone = "muted",
  label,
  title,
  className,
  ...props
}: BadgeProps) {
  return (
    <Surface
      {...props}
      as="span"
      radius="sm"
      className={[styles.badge, className].filter(Boolean).join(" ")}
      title={title ?? label}
    >
      <Text variant="caption" tone={tone}>
        <span aria-hidden={label ? true : undefined}>{children}</span>
        {label && <span className={styles.label}>{label}</span>}
      </Text>
    </Surface>
  );
}
