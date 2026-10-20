import { Text } from "../Text/Text.js";
import styles from "./SearchField.module.css";

export interface SearchFieldProps {
  readonly label: string;
  readonly value: string;
  readonly placeholder?: string;
  readonly onChange: (value: string) => void;
  readonly onSubmit: () => void;
  readonly onClear: () => void;
}

/** A labeled native search input; keyboard actions are explicit caller callbacks. */
export function SearchField({ label, value, placeholder, onChange, onSubmit, onClear }: SearchFieldProps) {
  return (
    <label className={styles.label}>
      <Text variant="label" className={styles.content}>
        {label}
        <input className={styles.input} type="search" value={value} placeholder={placeholder} autoComplete="off"
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") { event.preventDefault(); onSubmit(); }
            if (event.key === "Escape") { event.preventDefault(); onClear(); }
          }} />
      </Text>
    </label>
  );
}
