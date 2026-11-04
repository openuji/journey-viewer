import type { Ref } from "react";
import { Text } from "@/components/Text/Text";
import styles from "@/components/ScreenImage/ScreenImage.module.css";

export interface ScreenImageProps {
  readonly source: string | undefined;
  readonly label: string;
  readonly status: "loading" | "ready" | "unavailable";
  /** `contain` and `original` fill a definite stage; `original` scrolls at one image pixel per CSS pixel. */
  readonly fit?: "width" | "height" | "contain" | "original";
  /** Browser readiness checks belong to the caller. */
  readonly imageRef?: Ref<HTMLImageElement>;
  readonly onLoad: () => void;
  readonly onError: () => void;
}

/** Stateless image presentation. The browser boundary owns loading/error state. */
export function ScreenImage({
  source,
  label,
  status,
  fit = "width",
  imageRef,
  onLoad,
  onError,
}: ScreenImageProps) {
  return (
    <span
      className={styles.frame}
      data-image-status={status}
      data-fit={fit}
      role={fit === "original" ? "region" : undefined}
      aria-label={fit === "original" ? "Screenshot image" : undefined}
      tabIndex={fit === "original" ? 0 : undefined}
      data-screen-scroll={fit === "original" ? "" : undefined}
    >
      {source && status !== "unavailable" && (
        <img
          key={source}
          ref={imageRef}
          className={styles.image}
          src={source}
          alt={`Screenshot: ${label}`}
          decoding="async"
          onLoad={onLoad}
          onError={onError}
        />
      )}
      {status !== "ready" && (
        <Text
          role="status"
          variant="caption"
          tone="muted"
          className={styles.status}
        >
          {status === "unavailable"
            ? "Screenshot unavailable."
            : "Loading screenshot…"}
        </Text>
      )}
    </span>
  );
}
