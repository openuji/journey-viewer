import icon from "@/components/BrandLink/icon.svg";
import styles from "@/components/BrandLink/BrandLink.module.css";

export interface BrandLinkProps {
  /** Where "home" is: the site's own folder for a generated site, the landing page in `apps/web`. */
  readonly href: string;
}

/** The Journey Viewer icon as a home link, for the application header's `brand` slot. */
export function BrandLink({ href }: BrandLinkProps) {
  return (
    <a className={styles.brand} href={href} aria-label="Journey Viewer home">
      <img src={icon} width="22" height="22" alt="" />
    </a>
  );
}
