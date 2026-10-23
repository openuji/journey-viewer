import type { HTMLAttributes } from "react";
import styles from "./Heading.module.css";

export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;
export type HeadingProps = Readonly<
  HTMLAttributes<HTMLHeadingElement> & {
    level: HeadingLevel;
    size?: "xs" | "sm" | "md" | "lg";
  }
>;

export function Heading({
  level,
  size = "md",
  className,
  ...props
}: HeadingProps) {
  const Tag = `h${level}` as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  return (
    <Tag
      {...props}
      className={[styles.heading, className].filter(Boolean).join(" ")}
      data-size={size}
    />
  );
}
