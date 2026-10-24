import type { ButtonHTMLAttributes } from "react";
import styles from "@/components/Button/Button.module.css";

/**
 * `row` fills its container with a hover background; `bare` fills it without one (rows own that
 * presentation); `pill`, `segment` and `chip` are compact toolbar/list treatments; `panel` is a
 * full-width muted media button.
 */
export type ButtonVariant =
  | "solid"
  | "outline"
  | "ghost"
  | "row"
  | "bare"
  | "pill"
  | "segment"
  | "chip"
  | "panel";
export type ButtonSize = "xs" | "sm" | "md";
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
