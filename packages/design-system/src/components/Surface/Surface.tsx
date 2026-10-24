import type { HTMLAttributes } from "react";
import styles from "@/components/Surface/Surface.module.css";

export type SurfaceProps = Readonly<
  HTMLAttributes<HTMLElement> & {
    as?: "div" | "article" | "section" | "aside" | "span";
    tone?: "default" | "muted";
    radius?: "sm" | "lg" | "full";
    raised?: boolean;
  }
>;

export function Surface({
  as: Tag = "div",
  tone = "default",
  radius = "lg",
  raised = false,
  className,
  ...props
}: SurfaceProps) {
  return (
    <Tag
      {...props}
      className={[styles.surface, className].filter(Boolean).join(" ")}
      data-surface-tone={tone}
      data-radius={radius}
      data-raised={raised || undefined}
    />
  );
}
