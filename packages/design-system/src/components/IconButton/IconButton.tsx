import type { ReactNode } from "react";
import { Button } from "../Button/Button.js";
import type { ButtonProps } from "../Button/Button.js";
import styles from "./IconButton.module.css";

export type IconButtonProps = Readonly<
  Omit<ButtonProps, "children" | "iconOnly" | "aria-label"> & {
    label: string;
    icon: ReactNode;
  }
>;

export function IconButton({ label, icon, ...props }: IconButtonProps) {
  return (
    <Button {...props} aria-label={label} iconOnly>
      <span className={styles.icon} aria-hidden="true">
        {icon}
      </span>
    </Button>
  );
}
