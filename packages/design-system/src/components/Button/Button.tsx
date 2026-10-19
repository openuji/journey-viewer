import type { ButtonHTMLAttributes } from "react";
import styles from "./Button.module.css";

export type ButtonVariant = "solid" | "outline" | "ghost" | "row";
export type ButtonSize = "sm" | "md";
export type ButtonProps = Readonly<
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: ButtonVariant;
    size?: ButtonSize;
    selected?: boolean;
    iconOnly?: boolean;
  }
>;

/** The single native button implementation, including all shared interaction styles. */
export function Button({
  variant = "ghost",
  size = "sm",
  selected,
  iconOnly = false,
  type = "button",
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      type={type}
      className={[styles.button, className].filter(Boolean).join(" ")}
      data-variant={variant}
      data-size={size}
      data-selected={selected || undefined}
      data-icon-only={iconOnly || undefined}
    >
      {children}
    </button>
  );
}
