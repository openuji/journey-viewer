import { ScreenThumbnail } from "@journey-viewer/design-system";
import type { JourneyGraph } from "@journey-viewer/ujg-jsonld";
import { getNodeScreens } from "@/screens";
import type { ScreenshotMap } from "@/screens";
import { resolveSelection } from "@/interaction";
import type { ViewerTarget } from "@/navigation";
import { BrowserScreenImage } from "@/browser/BrowserScreenImage";

/** Complete controlled contract; the input map is never retained or copied into state. */
export interface JourneyScreenControls {
  readonly screenshots: ScreenshotMap;
  readonly onOpen: (target: ViewerTarget, surfaceId: string) => void;
}

export interface JourneyScreensProps extends JourneyScreenControls {
  readonly graph: JourneyGraph;
  readonly target: ViewerTarget;
}

/** Thumbnails for the target's explicit surfaces; unmapped surfaces show an unavailable frame. */
export function JourneyScreens({
  graph,
  screenshots,
  target,
  onOpen,
}: JourneyScreensProps) {
  const selected = resolveSelection(graph, target.selection);
  const title =
    typeof selected?.node.label === "string"
      ? selected.node.label
      : target.selection.nodeId;
  const screens = selected
    ? getNodeScreens(graph, screenshots, target.selection.nodeId)
    : [];
  if (screens.length === 0) return null;
  return (
    <div aria-label="Screenshot previews" role="group">
      {screens.map((screen) => (
        <ScreenThumbnail
          key={screen.surface.id}
          label={screens.length > 1 ? `${title} (${screen.surface.id})` : title}
          {...(screen.source
            ? { onOpen: () => onOpen(target, screen.surface.id) }
            : {})}
        >
          <BrowserScreenImage source={screen.source} label={title} />
        </ScreenThumbnail>
      ))}
    </div>
  );
}
