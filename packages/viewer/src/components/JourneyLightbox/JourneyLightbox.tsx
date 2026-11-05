import { useState } from "react";
import { ScreenLightbox } from "@journey-viewer/design-system";
import { journeyTouchpoints } from "@journey-viewer/ujg-jsonld";
import type { JourneyGraph } from "@journey-viewer/ujg-jsonld";
import { BrowserLightbox } from "@/components/BrowserLightbox/BrowserLightbox";
import { BrowserScreenImage } from "@/browser/BrowserScreenImage";
import { getNodeScreens, getScreens } from "@/screens";
import type { ScreenshotMap, ViewerLightbox } from "@/screens";
import { resolveSelection, sameSelection } from "@/interaction";
import { sameOccurrence } from "@/occurrence";
import { occurrenceLabel } from "@/navigation";
import type { TouchpointPresentation } from "@/presentation";
import { touchpointColor, touchpointLabel } from "@/presentation";

export interface JourneyLightboxProps {
  readonly graph: JourneyGraph;
  readonly screenshots: ScreenshotMap;
  readonly lightbox: ViewerLightbox;
  readonly touchpoints?: TouchpointPresentation;
  readonly onClose: () => void;
  readonly onPrevious: () => void;
  readonly onNext: () => void;
}

export function JourneyLightbox({
  graph,
  screenshots,
  lightbox,
  touchpoints = {},
  onClose,
  onPrevious,
  onNext,
}: JourneyLightboxProps) {
  const resolved = resolveSelection(graph, lightbox.target.selection);
  const title =
    typeof resolved?.node.label === "string"
      ? resolved.node.label
      : lightbox.target.selection.nodeId;
  const screen = getNodeScreens(
    graph,
    screenshots,
    lightbox.target.selection.nodeId,
  ).find((item) => item.surface.id === lightbox.surfaceId);
  const configured = getScreens(graph, screenshots).filter(
    (item) => item.source !== undefined,
  );
  const index = configured.findIndex(
    (item) =>
      item.surface.id === lightbox.surfaceId &&
      sameSelection(item.target.selection, lightbox.target.selection) &&
      sameOccurrence(item.target.occurrence, lightbox.target.occurrence),
  );
  const hasRepeatedScreens =
    new Set(configured.map((item) => item.surface.id)).size < configured.length;
  const callSites = configured.filter(
    (item) => item.surface.id === lightbox.surfaceId,
  );
  const callSiteIndex = callSites.findIndex(
    (item) =>
      sameSelection(item.target.selection, lightbox.target.selection) &&
      sameOccurrence(item.target.occurrence, lightbox.target.occurrence),
  );
  const unit = hasRepeatedScreens ? "view" : "screen";
  const position =
    index < 0
      ? `Screenshot unavailable · ${configured.length} mapped ${unit}${configured.length === 1 ? "" : "s"}`
      : `${index + 1} / ${configured.length}${hasRepeatedScreens ? " views" : ""}${callSites.length > 1 ? ` · ${callSiteIndex + 1} of ${callSites.length} call sites` : ""}`;
  const touchpoint = journeyTouchpoints(
    graph,
    lightbox.target.selection.journeyId,
  )[0];
  const color = touchpoint
    ? touchpointColor(touchpoint, touchpoints)
    : undefined;
  const short = touchpoint
    ? touchpointLabel(touchpoint, touchpoints)
    : undefined;
  const journeyLabel = resolved
    ? resolved.journey.label
    : lightbox.target.selection.journeyId;
  const context = [
    callSites.length > 1
      ? occurrenceLabel(graph, lightbox.target.occurrence)
      : journeyLabel,
    ...(short ? [short] : []),
  ].join(" · ");
  const [sizing, setSizing] = useState<
    Readonly<{
      lightbox: ViewerLightbox;
      source: string | undefined;
      mode: "fit" | "original";
    }>
  >(() => ({ lightbox, source: screen?.source, mode: "fit" }));
  const sameView =
    sizing.lightbox.surfaceId === lightbox.surfaceId &&
    sameSelection(
      sizing.lightbox.target.selection,
      lightbox.target.selection,
    ) &&
    sameOccurrence(
      sizing.lightbox.target.occurrence,
      lightbox.target.occurrence,
    ) &&
    sizing.source === screen?.source;
  if (!sameView) {
    setSizing({ lightbox, source: screen?.source, mode: "fit" });
    return null;
  }
  return (
    <BrowserLightbox onClose={onClose} onPrevious={onPrevious} onNext={onNext}>
      <ScreenLightbox
        title={title}
        context={context}
        position={position}
        {...(touchpoint && short
          ? { touchpoint: { label: short, ...(color ? { color } : {}) } }
          : {})}
        canStep={configured.length > 0}
        onPrevious={onPrevious}
        onNext={onNext}
        onClose={onClose}
        sizingMode={sizing.mode}
        onSizingModeChange={(mode) =>
          setSizing({ lightbox, source: screen?.source, mode })
        }
      >
        <BrowserScreenImage
          source={screen?.source}
          label={title}
          fit={sizing.mode === "fit" ? "contain" : "original"}
        />
      </ScreenLightbox>
    </BrowserLightbox>
  );
}
