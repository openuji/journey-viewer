import { flowGeometry } from "@journey-viewer/design-system";
import { layoutLevel, minimumLengths } from "@journey-viewer/flow-layout";
import type {
  LayoutOptions,
  LevelInput,
  LevelLayout,
  Placement,
} from "@journey-viewer/flow-layout";

export type { Point } from "@journey-viewer/flow-layout";

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export const FRAME_PAD = 16;

/** The design system's drawn sizes, which every level is laid out for. */
const drawnSizes: LayoutOptions = {
  cornerRadius: flowGeometry.cornerRadius,
  arrowLength: flowGeometry.arrowLength,
  padding: FRAME_PAD,
};

/**
 * The engine's guarantees for those sizes: `MIN_STEP` is the shortest leg between two bends that
 * keeps both corners round, `ARRIVAL` the shortest last leg after a bend that keeps the arrowhead
 * off the corner.
 */
export const { step: MIN_STEP, arrival: ARRIVAL } = minimumLengths(drawnSizes);

/** Lays out one journey level for the drawn sizes. */
export const flowLevel =
  (placement: Placement = "median") =>
  (input: LevelInput): LevelLayout =>
    layoutLevel(input, { ...drawnSizes, placement });
