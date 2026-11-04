import type { ReactNode } from "react";
import { Heading } from "@/components/Heading/Heading";
import { Icon } from "@/components/Icon/Icon";
import { IconButton } from "@/components/IconButton/IconButton";
import { Text } from "@/components/Text/Text";
import { TouchpointDot } from "@/components/TouchpointDot/TouchpointDot";
import { Tooltip } from "@/components/Tooltip/Tooltip";
import styles from "@/components/ScreenLightbox/ScreenLightbox.module.css";

export interface ScreenLightboxProps {
  readonly title: string;
  readonly context: string;
  readonly position: string;
  readonly touchpoint?: Readonly<{ label: string; color?: string }>;
  readonly canStep: boolean;
  readonly onPrevious: () => void;
  readonly onNext: () => void;
  readonly onClose: () => void;
  readonly sizingMode?: "fit" | "original";
  readonly onSizingModeChange?: (mode: "fit" | "original") => void;
  /** Usually a `ScreenImage` with `fit="contain"` or `fit="original"`. */
  readonly children?: ReactNode;
}

/** Modal content with an independent level-2 heading. The caller/browser owns dialog lifecycle and focus. */
export function ScreenLightbox({
  title,
  context,
  position,
  touchpoint,
  canStep,
  onPrevious,
  onNext,
  onClose,
  sizingMode,
  onSizingModeChange,
  children,
}: ScreenLightboxProps) {
  return (
    <figure className={styles.figure}>
      <div className={styles.body}>{children}</div>
      <figcaption className={styles.caption}>
        <div
          className={styles.details}
          role="region"
          aria-label="Screenshot details"
          tabIndex={0}
          data-screen-scroll=""
        >
          {touchpoint && (
            <TouchpointDot
              label={touchpoint.label}
              decorative
              {...(touchpoint.color ? { color: touchpoint.color } : {})}
            />
          )}
          <div className={styles.text}>
            <Heading level={2} size="sm">
              {title}
            </Heading>
            <Text variant="caption" tone="muted" className={styles.context}>
              {context}
            </Text>
          </div>
        </div>
        <div className={styles.toolbar}>
          <Text
            role="status"
            variant="caption"
            tone="subtle"
            className={styles.count}
          >
            {position}
          </Text>
          <div className={styles.controls}>
            {sizingMode !== undefined && onSizingModeChange && (
              <Tooltip
                label={sizingMode === "fit" ? "Original size" : "Fit to window"}
              >
                <IconButton
                  label={
                    sizingMode === "fit" ? "Original size" : "Fit to window"
                  }
                  icon={
                    <Icon
                      name={sizingMode === "fit" ? "zoom-actual" : "zoom-fit"}
                    />
                  }
                  onClick={() =>
                    onSizingModeChange(
                      sizingMode === "fit" ? "original" : "fit",
                    )
                  }
                />
              </Tooltip>
            )}
            <IconButton
              label="Previous screen"
              icon={<Icon name="previous" />}
              disabled={!canStep}
              onClick={onPrevious}
            />
            <IconButton
              label="Next screen"
              icon={<Icon name="next" />}
              disabled={!canStep}
              onClick={onNext}
            />
            <IconButton
              label="Close screenshot"
              data-lightbox-close=""
              icon={<Icon name="close" />}
              onClick={onClose}
            />
          </div>
        </div>
      </figcaption>
    </figure>
  );
}
