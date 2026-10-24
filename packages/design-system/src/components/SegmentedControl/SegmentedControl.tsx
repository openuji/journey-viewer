import { Button } from "@/components/Button/Button";
import styles from "@/components/SegmentedControl/SegmentedControl.module.css";

export interface SegmentedOption<Value extends string> {
  readonly value: Value;
  readonly label: string;
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
      {options.map((option) => (
        <Button
          key={option.value}
          variant="segment"
          size="xs"
          selected={option.value === value}
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}
