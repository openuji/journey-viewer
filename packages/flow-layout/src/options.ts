import type { Placement } from "@/types";

/**
 * Drawn sizes the routes must make room for, and the spacing of the level. Every length is in the
 * same units as the node sizes (CSS pixels for a web renderer).
 */
export interface LayoutOptions {
  /** Defaults to `median`. */
  readonly placement?: Placement;
  /** Radius the renderer rounds each bend with. Defaults to 6. */
  readonly cornerRadius?: number;
  /** Length of an arrowhead, from its tip to its base. Defaults to 7. */
  readonly arrowLength?: number;
  /** Space inside the level's frame, left, right and below the content. Defaults to 16. */
  readonly padding?: number;
  /** Space between neighbouring blocks across a layer. Defaults to 28. */
  readonly blockSpacing?: number;
  /** Least space between a vertical line and a block beside it. Defaults to 16. */
  readonly lineSpacing?: number;
  /** Least space between a vertical line and a frame beside it, so it never reads as a second border. Defaults to 44. */
  readonly frameLineSpacing?: number;
  /** Least space between a horizontal line and a frame's top or bottom border. Defaults to 22. */
  readonly frameTrackSpacing?: number;
}

/** The lengths a layout guarantees for given drawn sizes. */
export interface MinimumLengths {
  /**
   * Shortest last leg before an arrowhead after a bend: the corner at its full radius, one radius of
   * straight line, and the head. On a shorter leg the arrowhead would sit on the corner.
   */
  readonly arrival: number;
  /**
   * Shortest leg between two bends: both corners at their full radius (a corner takes at most half
   * of each leg) and one radius of straight line between them. A shorter step draws as an S-curve.
   */
  readonly step: number;
}

export function minimumLengths(
  options: Pick<LayoutOptions, "cornerRadius" | "arrowLength"> = {},
): MinimumLengths {
  const radius = options.cornerRadius ?? 6;
  return {
    arrival: 2 * radius + (options.arrowLength ?? 7),
    step: 3 * radius,
  };
}

export type Resolved = Required<LayoutOptions> & MinimumLengths;

export function resolveOptions(options: LayoutOptions = {}): Resolved {
  return {
    placement: options.placement ?? "median",
    cornerRadius: options.cornerRadius ?? 6,
    arrowLength: options.arrowLength ?? 7,
    padding: options.padding ?? 16,
    blockSpacing: options.blockSpacing ?? 28,
    lineSpacing: options.lineSpacing ?? 16,
    frameLineSpacing: options.frameLineSpacing ?? 44,
    frameTrackSpacing: options.frameTrackSpacing ?? 22,
    ...minimumLengths(options),
  };
}
