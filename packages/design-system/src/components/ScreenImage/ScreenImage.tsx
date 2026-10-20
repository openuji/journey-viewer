import { Surface } from "../Surface/Surface.js";
import { Text } from "../Text/Text.js";
import styles from "./ScreenImage.module.css";

export interface ScreenImageProps {
  readonly source: string | undefined;
  readonly label: string;
  readonly status: "loading" | "ready" | "unavailable";
  readonly onLoad: () => void;
  readonly onError: () => void;
}

/** Stateless image presentation. The browser boundary owns loading/error state. */
export function ScreenImage({ source, label, status, onLoad, onError }: ScreenImageProps) {
  return <Surface tone="muted" radius="sm" className={styles.frame} data-image-status={status}>
    {source && status !== "unavailable" && <img className={styles.image} src={source} alt={`Screenshot: ${label}`}
      loading="lazy" decoding="async" onLoad={onLoad} onError={onError} />}
    {status !== "ready" && <Text role="status" variant="caption" tone="muted" className={styles.status}>
      {status === "unavailable" ? "Screenshot unavailable." : "Loading screenshot…"}
    </Text>}
  </Surface>;
}
