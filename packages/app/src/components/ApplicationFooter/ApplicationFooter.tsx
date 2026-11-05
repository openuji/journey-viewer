import styles from "@/components/ApplicationFooter/ApplicationFooter.module.css";

const LICENSE_HREF =
  "https://github.com/openuji/journey-viewer/blob/main/LICENSE";
const SOURCE_HREF = "https://github.com/openuji/journey-viewer";
const INITIATIVE_HREF = "https://openuji.org/";

const external = {
  target: "_blank",
  rel: "noreferrer",
} as const;

/** Quiet project and licensing context at the end of every application shell. */
export function ApplicationFooter() {
  return (
    <footer className={styles.footer} data-application-footer="">
      <p className={styles.line}>
        <span className={styles.group}>
          <span>Journey Viewer Community</span>
          <span aria-hidden="true">—</span>
          <a href={LICENSE_HREF} {...external}>
            MIT
          </a>
        </span>
        <span className={styles.separator} aria-hidden="true">
          ·
        </span>
        <a href={SOURCE_HREF} {...external}>
          GitHub
        </a>
        <span className={styles.separator} aria-hidden="true">
          ·
        </span>
        <span className={styles.group}>
          <span aria-hidden="true">©</span>
          <a href={INITIATIVE_HREF} {...external}>
            Open User Journey Initiative
          </a>
        </span>
      </p>
    </footer>
  );
}
