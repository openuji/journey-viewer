import { getJourneyEntries, getJourneyExits, getJourneyStates, getNodeSurfaces, getNodesByType } from "@journey-viewer/ujg-jsonld";
import type { UjgDocument, UjgSurface } from "@journey-viewer/ujg-jsonld";
import { resolveSelection, sameSelection, selectScreenNode } from "./interaction.js";
import type { ViewerSelection } from "./interaction.js";
import { getOccurrenceTrail, journeyOccurrences, sameOccurrence } from "./occurrence.js";
import type { ViewerSnapshot, ViewerTarget } from "./navigation.js";

/** Independent JSON input: exact UJG Surface IDs to caller-resolved image URLs. */
export type ScreenshotMap = Readonly<Record<string, string>>;

export interface NodeScreen {
  readonly surface: UjgSurface;
  readonly source: string | undefined;
}

export interface ViewerScreen extends NodeScreen {
  readonly target: ViewerTarget;
  readonly label: string;
}

/** Only identity/context is retained. The current map supplies the URL on every render. */
export interface ViewerLightbox {
  readonly surfaceRef: string;
  readonly target: ViewerTarget;
}

export function getNodeScreens(document: UjgDocument, screenshots: ScreenshotMap, nodeRef: string): readonly NodeScreen[] {
  return getNodeSurfaces(document, nodeRef).map((surface) => {
    const source = Object.hasOwn(screenshots, surface["@id"]) ? screenshots[surface["@id"]] : undefined;
    return { surface, source: typeof source === "string" && source.trim() ? source : undefined };
  });
}

/** Source journey/member/surface order, with every finite call-site context explicit. No retained catalog. */
export function getScreens(document: UjgDocument, screenshots: ScreenshotMap): readonly ViewerScreen[] {
  const occurrences = [...journeyOccurrences(document)];
  const screens: ViewerScreen[] = [];
  for (const journey of getNodesByType(document, "Journey")) {
    const members = [
      { node: journey, kind: "journey" },
      ...getJourneyStates(document, journey).map((node) => ({ node, kind: "state" } as const)),
      ...getJourneyEntries(document, journey).map((node) => ({ node, kind: "entry" } as const)),
      ...getJourneyExits(document, journey).map((node) => ({ node, kind: "exit" } as const)),
    ] as const;
    for (const { occurrence } of occurrences.filter((item) => item.journey === journey)) {
      for (const { node, kind } of members) {
        const selection: ViewerSelection = { kind, journeyRef: journey["@id"], nodeRef: node["@id"] };
        for (const screen of getNodeScreens(document, screenshots, node["@id"])) {
          if (screens.some((existing) => existing.surface === screen.surface
            && sameSelection(existing.target.selection, selection) && sameOccurrence(existing.target.occurrence, occurrence))) continue;
          screens.push({ ...screen, target: { selection, occurrence }, label: typeof node.label === "string" ? node.label : node["@id"] });
        }
      }
    }
  }
  return screens;
}

export function openScreenshot(
  document: UjgDocument, screenshots: ScreenshotMap, current: ViewerSnapshot, target: ViewerTarget, surfaceRef: string,
): ViewerSnapshot {
  const journey = getOccurrenceTrail(document, target.occurrence).at(-1)?.journey;
  if (journey?.["@id"] !== target.selection.journeyRef || !resolveSelection(document, target.selection)
    || !getNodeScreens(document, screenshots, target.selection.nodeRef).some((screen) => screen.surface["@id"] === surfaceRef && screen.source)) return current;
  // Reveals ancestors but never expands a composite's children as a side effect of opening its image.
  const interaction = selectScreenNode(document, current.interaction, target.selection);
  const navigation = current.navigation;
  const focus = navigation.focus === null ? null : target.occurrence;
  const unchangedContext = sameOccurrence(navigation.occurrence, target.occurrence) && sameOccurrence(navigation.focus, focus) && navigation.hover === null;
  if (interaction === current.interaction && unchangedContext && current.lightbox?.surfaceRef === surfaceRef
    && sameSelection(current.lightbox.target.selection, target.selection) && sameOccurrence(current.lightbox.target.occurrence, target.occurrence)) return current;
  return {
    ...current, interaction,
    navigation: unchangedContext ? navigation : { ...navigation, occurrence: target.occurrence, focus, hover: null, hoverOccurrence: null },
    lightbox: { surfaceRef, target: { selection: { ...target.selection }, occurrence: target.occurrence } },
  };
}

export function closeScreenshot(current: ViewerSnapshot): ViewerSnapshot {
  return current.lightbox === null ? current : { ...current, lightbox: null };
}

/** Wraps in source display order, skipping absent mappings but keeping failed URLs navigable. */
export function stepScreenshot(
  document: UjgDocument, screenshots: ScreenshotMap, current: ViewerSnapshot, direction: -1 | 1,
): ViewerSnapshot {
  if (!current.lightbox || (direction !== -1 && direction !== 1)) return current;
  const screens = getScreens(document, screenshots);
  const index = screens.findIndex((screen) => screen.surface["@id"] === current.lightbox?.surfaceRef
    && sameSelection(screen.target.selection, current.lightbox.target.selection)
    && sameOccurrence(screen.target.occurrence, current.lightbox.target.occurrence));
  for (let offset = 1; offset <= screens.length; offset += 1) {
    const next = screens[((index < 0 ? (direction === 1 ? -1 : 0) : index) + direction * offset + screens.length) % screens.length];
    if (next?.source) return openScreenshot(document, screenshots, current, next.target, next.surface["@id"]);
  }
  return current;
}
