import type { HTMLAttributes } from "react";
import styles from "./Text.module.css";

export type TextRole = "body" | "label" | "caption" | "code";
export type TextTone = "default" | "muted" | "subtle" | "entry" | "exit" | "accent";
export type TextWeight = "regular" | "medium" | "semibold";
export type TextProps = Readonly<
  HTMLAttributes<HTMLElement> & {
    as?: "span" | "p" | "code" | "strong";
    variant?: TextRole;
    tone?: TextTone;
    /** Overrides the role's default weight. */
    weight?: TextWeight;
  }
>;

export function Text({
  as: Tag = "span",
  variant = "body",
  tone = "default",
  weight,
  className,
  ...props
}: TextProps) {
  return (
    <Tag
      {...props}
      className={[styles.text, className].filter(Boolean).join(" ")}
      data-role={variant}
      data-tone={tone}
      data-weight={weight}
    />
  );
}
