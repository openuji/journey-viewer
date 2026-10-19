import type { HTMLAttributes } from "react";
import styles from "./Text.module.css";

export type TextRole = "body" | "label" | "caption" | "code";
export type TextTone = "default" | "muted" | "subtle" | "entry" | "exit";
export type TextProps = Readonly<
  HTMLAttributes<HTMLElement> & {
    as?: "span" | "p" | "code";
    variant?: TextRole;
    tone?: TextTone;
  }
>;

export function Text({
  as: Tag = "span",
  variant = "body",
  tone = "default",
  className,
  ...props
}: TextProps) {
  return (
    <Tag
      {...props}
      className={[styles.text, className].filter(Boolean).join(" ")}
      data-role={variant}
      data-tone={tone}
    />
  );
}
