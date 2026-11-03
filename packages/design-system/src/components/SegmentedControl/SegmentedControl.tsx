import type { ReactNode } from "react";
import { Button } from "@/components/Button/Button";
import { IconButton } from "@/components/IconButton/IconButton";
import { Tooltip } from "@/components/Tooltip/Tooltip";
import styles from "@/components/SegmentedControl/SegmentedControl.module.css";

export interface SegmentedOption<Value extends string> {
  readonly value: Value;
  readonly label: string;
  /** Draws the option as this glyph alone; the label becomes its name and its tooltip. */
  readonly icon?: ReactNode;
}

export interface SegmentedControlProps<Value extends string> {
  /** Accessible name of the group. */
  readonly label: string;
  readonly options: readonly SegmentedOption<Value>[];
  readonly value: Value;
  readonly onChange: (value: Value) => void;
}

/** Mutually exclusive pressed buttons, such as a view switch. */
export function SegmentedControl<Value extends string>({
  label,
  options,
  value,
  onChange,
}: SegmentedControlProps<Value>) {
  return (
    <div role="group" aria-label={label} className={styles.group}>
      {options.map((option) => {
        const selected = option.value === value;
        const select = () => onChange(option.value);
        return option.icon === undefined ? (
          <Button
            key={option.value}
            variant="segment"
            size="xs"
            selected={selected}
            aria-pressed={selected}
            onClick={select}
          >
            {option.label}
          </Button>
        ) : (
          <Tooltip key={option.value} label={option.label}>
            <IconButton
              variant="segment"
              size="xs"
              selected={selected}
              label={option.label}
              icon={option.icon}
              aria-pressed={selected}
              onClick={select}
            />
          </Tooltip>
        );
      })}
    </div>
  );
}
