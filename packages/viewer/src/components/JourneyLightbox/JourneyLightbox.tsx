import { ScreenLightbox } from "@journey-viewer/design-system";
import { getJourneyTouchpoints } from "@journey-viewer/ujg-jsonld";
import type { UjgDocument } from "@journey-viewer/ujg-jsonld";
import { BrowserLightbox } from "@/browser/BrowserLightbox";
import { BrowserScreenImage } from "@/browser/BrowserScreenImage";
import { getNodeScreens, getScreens } from "@/screens";
import type { ScreenshotMap, ViewerLightbox } from "@/screens";
import { resolveSelection, sameSelection } from "@/interaction";
import { sameOccurrence } from "@/occurrence";
import { occurrenceLabel } from "@/navigation";
import type { TouchpointPresentation } from "@/presentation";
import { touchpointColor, touchpointLabel } from "@/presentation";

export interface JourneyLightboxProps {
  readonly document: UjgDocument;
  readonly screenshots: ScreenshotMap;
  readonly lightbox: ViewerLightbox;
  readonly touchpoints?: TouchpointPresentation;
  readonly onClose: () => void;
  readonly onPrevious: () => void;
  readonly onNext: () => void;
}

export function JourneyLightbox({
  document,
  screenshots,
  lightbox,
  touchpoints = {},
  onClose,
  onPrevious,
  onNext,
}: JourneyLightboxProps) {
  const resolved = resolveSelection(document, lightbox.target.selection);
  const title =
    typeof resolved?.node.label === "string"
      ? resolved.node.label
      : lightbox.target.selection.nodeRef;
  const screen = getNodeScreens(
    document,
    screenshots,
    lightbox.target.selection.nodeRef,
  ).find((item) => item.surface["@id"] === lightbox.surfaceRef);
  const configured = getScreens(document, screenshots).filter(
    (item) => item.source !== undefined,
  );
  const index = configured.findIndex(
    (item) =>
      item.surface["@id"] === lightbox.surfaceRef &&
      sameSelection(item.target.selection, lightbox.target.selection) &&
      sameOccurrence(item.target.occurrence, lightbox.target.occurrence),
  );
  const hasRepeatedScreens =
    new Set(configured.map((item) => item.surface["@id"])).size <
    configured.length;
  const callSites = configured.filter(
    (item) => item.surface["@id"] === lightbox.surfaceRef,
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
  const touchpoint = getJourneyTouchpoints(
    document,
    lightbox.target.selection.journeyRef,
  )[0];
  const color = touchpoint
    ? touchpointColor(touchpoint, touchpoints)
    : undefined;
  const short = touchpoint
    ? touchpointLabel(touchpoint, touchpoints)
    : undefined;
  const journeyLabel = resolved
    ? (resolved.journey.label ?? resolved.journey["@id"])
    : lightbox.target.selection.journeyRef;
  const context = [
    callSites.length > 1
      ? occurrenceLabel(document, lightbox.target.occurrence)
      : journeyLabel,
    ...(short ? [short] : []),
  ].join(" · ");
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
      >
        <BrowserScreenImage
          source={screen?.source}
          label={title}
          fit="height"
        />
      </ScreenLightbox>
    </BrowserLightbox>
  );
}
