import { ScreenPreview, Text } from "@journey-viewer/design-system";
import type { UjgDocument } from "@journey-viewer/ujg-jsonld";
import { getNodeScreens } from "../../screens.js";
import type { ScreenshotMap } from "../../screens.js";
import { resolveSelection } from "../../interaction.js";
import type { ViewerTarget } from "../../navigation.js";
import { BrowserScreenImage } from "../../browser/BrowserScreenImage.js";

/** Complete controlled contract; the input map is never retained or copied into state. */
export interface JourneyScreenControls {
  readonly screenshots: ScreenshotMap;
  readonly onOpen: (target: ViewerTarget, surfaceRef: string) => void;
}

export interface JourneyScreensProps extends JourneyScreenControls {
  readonly document: UjgDocument;
  readonly target: ViewerTarget;
}

export function JourneyScreens({ document, screenshots, target, onOpen }: JourneyScreensProps) {
  const selected = resolveSelection(document, target.selection);
  const title = typeof selected?.node.label === "string" ? selected.node.label : target.selection.nodeRef;
  const screens = selected ? getNodeScreens(document, screenshots, target.selection.nodeRef) : [];
  return <div aria-label="Screenshot previews" role="group">
    {screens.map((screen) => <ScreenPreview key={screen.surface["@id"]} title={title} identity={screen.surface["@id"]}
      available={screen.source !== undefined} onOpen={() => onOpen(target, screen.surface["@id"])}>
      <BrowserScreenImage source={screen.source} label={title} />
    </ScreenPreview>)}
    {screens.length === 0 && <Text as="p" variant="caption" tone="muted">No screenshots for this item.</Text>}
  </div>;
}
