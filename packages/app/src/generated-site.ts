// What a site written next to a document reads. Node-safe: no React and no DOM, so the
// `journey-viewer` command can share it with the prebuilt site instead of repeating it.
export { VISUALISED_SOURCE } from "@/visualisation";
export {
  SCREENSHOT_MAP_SHAPE,
  TOUCHPOINT_PRESENTATION_SHAPE,
  isScreenshotMap,
  isTouchpointPresentation,
} from "@/presentation-input";
