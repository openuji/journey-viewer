import styles from "@/components/Glyphs/Glyphs.module.css";

/** Decorative app glyphs; the enclosing control supplies the accessible name. */
export function FileGlyph() {
  return (
    <svg
      viewBox="0 0 16 16"
      width="15"
      height="15"
      aria-hidden="true"
      focusable="false"
      className={styles.glyph}
    >
      <path
        d="M9.5 1.75H4.25a1 1 0 0 0-1 1v10.5a1 1 0 0 0 1 1h7.5a1 1 0 0 0 1-1V5Zm0 0V5h3.25"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CheckGlyph() {
  return (
    <svg
      viewBox="0 0 16 16"
      width="13"
      height="13"
      aria-hidden="true"
      focusable="false"
      className={styles.glyph}
    >
      <path
        d="m3.5 8.25 3 3 6-6.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
