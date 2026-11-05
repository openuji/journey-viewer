import type { CSSProperties, HTMLAttributes } from "react";
import styles from "@/components/InsetMap/InsetMap.module.css";

export interface InsetMapRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface InsetMapFrame {
  readonly id: string;
  readonly rect: InsetMapRect;
  /** As on the canvas: `current` frames are paper, `outside` frames sit on the ground. */
  readonly context: "current" | "outside";
}

export interface InsetMapBlock {
  readonly id: string;
  readonly rect: InsetMapRect;
  readonly selected?: boolean;
  /** Left out by a filter: it recedes, as on the canvas. */
  readonly receded?: boolean;
  /**
   * Drawn as a dot of one size at the centre of `rect`, whatever the scale, as a contract glyph on
   * a frame's border is.
   */
  readonly dot?: boolean;
}

export type InsetMapProps = Readonly<
  HTMLAttributes<HTMLDivElement> & {
    /** The chart's drawn size: the shapes and the view share its coordinates. */
    width: number;
    height: number;
    frames: readonly InsetMapFrame[];
    blocks: readonly InsetMapBlock[];
    /** The part of the chart the canvas shows; drawn only where it meets the chart. */
    view: InsetMapRect | null;
  }
>;

/** The part of `rect` inside the chart, or null when they do not meet. */
const within = (
  rect: InsetMapRect,
  width: number,
  height: number,
): InsetMapRect | null => {
  const x = Math.max(0, rect.x);
  const y = Math.max(0, rect.y);
  const right = Math.min(width, rect.x + rect.width);
  const bottom = Math.min(height, rect.y + rect.height);
  return right > x && bottom > y
    ? { x, y, width: right - x, height: bottom - y }
    : null;
};

/**
 * A whole flow chart in miniature: its frames and blocks, the selection in accent, and the part
 * the canvas shows, with the rest veiled. Decorative to assistive technology; the canvas it
 * mirrors is the accessible surface.
 */
export function InsetMap({
  width,
  height,
  frames,
  blocks,
  view,
  className,
  style,
  ...props
}: InsetMapProps) {
  if (!(width > 0 && height > 0)) return null;
  const shown = view && within(view, width, height);
  return (
    <div
      {...props}
      className={[styles.map, className].filter(Boolean).join(" ")}
      style={{ "--inset-ratio": width / height, ...style } as CSSProperties}
      data-inset-map=""
      aria-hidden="true"
    >
      <svg
        className={styles.chart}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
      >
        {frames.map((frame) => (
          <rect
            key={frame.id}
            className={styles.frame}
            data-context={frame.context}
            {...frame.rect}
          />
        ))}
        {blocks.map(({ id, rect, selected, receded, dot }) => {
          const marks = {
            "data-selected": selected || undefined,
            "data-receded": receded || undefined,
          };
          return dot ? (
            <path
              key={id}
              className={styles.dot}
              {...marks}
              d={`M${rect.x + rect.width / 2} ${rect.y + rect.height / 2}h0`}
            />
          ) : (
            <rect key={id} className={styles.block} {...marks} {...rect} />
          );
        })}
        {shown && (
          <>
            <path
              className={styles.veil}
              fillRule="evenodd"
              d={`M0 0H${width}V${height}H0Z M${shown.x} ${shown.y}h${shown.width}v${shown.height}h${-shown.width}Z`}
            />
            <rect className={styles.view} data-inset-view="" {...shown} />
          </>
        )}
      </svg>
    </div>
  );
}
