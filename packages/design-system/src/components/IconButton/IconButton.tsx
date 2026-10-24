import type { ReactNode } from "react";
import { Button } from "@/components/Button/Button";
import type { ButtonProps } from "@/components/Button/Button";
import styles from "@/components/IconButton/IconButton.module.css";

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
