import type { HTMLAttributes, ReactNode } from "react";
import { Surface } from "@/components/Surface/Surface";
import { Text } from "@/components/Text/Text";
import type { TextTone } from "@/components/Text/Text";
import styles from "@/components/Badge/Badge.module.css";

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
