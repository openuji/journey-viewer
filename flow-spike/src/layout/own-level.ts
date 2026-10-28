import { layoutLevel } from "@journey-viewer/flow-layout";
import type { LevelInput, Placement } from "@journey-viewer/flow-layout";
import { drawnSizes } from "@/layout/geometry";

/** The own engine, `@journey-viewer/flow-layout`, for the flow's drawn sizes. */
export const ownLevel =
  (placement: Placement = "median") =>
  (input: LevelInput) =>
    layoutLevel(input, { ...drawnSizes, placement });
