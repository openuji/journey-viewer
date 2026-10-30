import type {
  ScreenshotMap,
  TouchpointPresentation,
} from "@journey-viewer/viewer";

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** A parsed screenshot map: Surface IDs to image paths or URLs. */
export function isScreenshotMap(value: unknown): value is ScreenshotMap {
  return (
    isRecord(value) &&
    Object.values(value).every((path) => typeof path === "string")
  );
}

/** A parsed touchpoint presentation: Touchpoint IDs to an optional short label and color. */
export function isTouchpointPresentation(
  value: unknown,
): value is TouchpointPresentation {
  return (
    isRecord(value) &&
    Object.values(value).every(
      (style) =>
        isRecord(style) &&
        ["shortLabel", "color"].every(
          (key) => style[key] === undefined || typeof style[key] === "string",
        ),
    )
  );
}

export const SCREENSHOT_MAP_SHAPE = "must map Surface IDs to image paths";
export const TOUCHPOINT_PRESENTATION_SHAPE =
  "must map Touchpoint IDs to objects with an optional shortLabel and color";
