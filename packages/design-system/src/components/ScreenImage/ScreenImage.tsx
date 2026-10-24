import { Text } from "@/components/Text/Text";
import styles from "@/components/ScreenImage/ScreenImage.module.css";

export interface ScreenImageProps {
  readonly source: string | undefined;
  readonly label: string;
  readonly status: "loading" | "ready" | "unavailable";
  /** `width` fills the container width; `height` uses `--jv-screen-image-height` and its natural width. */
  readonly fit?: "width" | "height";
  readonly onLoad: () => void;
  readonly onError: () => void;
}

/** Stateless image presentation. The browser boundary owns loading/error state. */
export function ScreenImage({
  source,
  label,
  status,
  fit = "width",
  onLoad,
  onError,
}: ScreenImageProps) {
  return (
    <span className={styles.frame} data-image-status={status} data-fit={fit}>
      {source && status !== "unavailable" && (
        <img
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
