import type { ReactNode } from "react";
import { Button } from "../Button/Button.js";
import { Icon } from "../Icon/Icon.js";
import { Text } from "../Text/Text.js";
import { TouchpointDot } from "../TouchpointDot/TouchpointDot.js";
import styles from "./SearchField.module.css";

export interface SearchFieldProps {
  /** Accessible name of the field; visually hidden. */
  readonly label: string;
  readonly value: string;
  readonly placeholder?: string;
  readonly onChange: (value: string) => void;
  readonly onSubmit: () => void;
  /** Escape clears and leaves the field. */
  readonly onClear: () => void;
  readonly onFocus?: () => void;
  /** Whether the result popover is shown. */
  readonly open?: boolean;
  /** Announced above the results, for example "No matches". */
  readonly status?: string;
  /** `SearchResult` items. */
  readonly children?: ReactNode;
}

export interface SearchResultProps {
  readonly label: string;
  readonly context: string;
  readonly touchpoint?: Readonly<{ label: string; color?: string }>;
  /** A screenshot is available for the result. */
  readonly screen?: boolean;
  readonly onPick: () => void;
}

export function SearchResult({ label, context, touchpoint, screen = false, onPick }: SearchResultProps) {
  return <li className={styles.item}>
    <Button variant="row" className={styles.result} onClick={onPick}>
      {touchpoint && <TouchpointDot label={touchpoint.label} decorative {...(touchpoint.color ? { color: touchpoint.color } : {})} />}
      <span className={styles.text}>
        <Text variant="label">{label}</Text>
        <Text variant="caption" tone="subtle" className={styles.context}>{context}</Text>
      </span>
      {screen && <span className={styles.screen} title="Screenshot available"><Icon name="phone" /></span>}
    </Button>
  </li>;
}

/** A native search input with a caller-controlled result popover; keyboard actions are explicit callbacks. */
export function SearchField({ label, value, placeholder, onChange, onSubmit, onClear, onFocus, open = false, status, children }: SearchFieldProps) {
  return (
    <div className={styles.wrap} data-search-field="">
      <label className={styles.field}>
        <span className={styles.hidden}>{label}</span>
        <Text variant="body" className={styles.fieldText}><input className={styles.input} type="search" value={value} placeholder={placeholder} autoComplete="off"
          onChange={(event) => onChange(event.target.value)}
          onFocus={onFocus}
          onKeyDown={(event) => {
            if (event.key === "Enter") { event.preventDefault(); onSubmit(); }
            if (event.key === "Escape") { event.preventDefault(); onClear(); event.currentTarget.blur(); }
          }} /></Text>
      </label>
      {open && <div className={styles.results}>
        {status && <Text as="p" role="status" variant="caption" tone="subtle" className={styles.status}>{status}</Text>}
        {children && <ul className={styles.list} aria-label={`${label} results`}>{children}</ul>}
      </div>}
    </div>
  );
}
