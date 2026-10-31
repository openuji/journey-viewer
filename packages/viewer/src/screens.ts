import { nodeSurfaces } from "@journey-viewer/ujg-jsonld";
import type { JourneyGraph, Surface } from "@journey-viewer/ujg-jsonld";
import {
  resolveSelection,
  sameSelection,
  selectScreenNode,
} from "@/interaction";
import type { ViewerSelection } from "@/interaction";
import {
  getOccurrenceTrail,
  journeyOccurrences,
  sameOccurrence,
} from "@/occurrence";
import { getLanePath } from "@/navigation";
import type { ViewerSnapshot, ViewerTarget } from "@/navigation";

/** Independent JSON input: exact surface IDs to caller-resolved image URLs. */
export type ScreenshotMap = Readonly<Record<string, string>>;

export interface NodeScreen {
  readonly surface: Surface;
  readonly source: string | undefined;
}

export interface ViewerScreen extends NodeScreen {
  readonly target: ViewerTarget;
  readonly label: string;
}

/** Only identity/context is retained. The current map supplies the URL on every render. */
export interface ViewerLightbox {
  readonly surfaceId: string;
  readonly target: ViewerTarget;
}

export function getNodeScreens(
  graph: JourneyGraph,
  screenshots: ScreenshotMap,
  nodeId: string,
): readonly NodeScreen[] {
  return nodeSurfaces(graph, nodeId).map((surface) => {
    const source = Object.hasOwn(screenshots, surface.id)
      ? screenshots[surface.id]
      : undefined;
    return {
      surface,
      source: typeof source === "string" && source.trim() ? source : undefined,
    };
  });
}

/** Source journey/member/surface order, with every finite call-site context explicit. No retained catalog. */
export function getScreens(
  graph: JourneyGraph,
  screenshots: ScreenshotMap,
): readonly ViewerScreen[] {
  const occurrences = [...journeyOccurrences(graph)];
  const screens: ViewerScreen[] = [];
  for (const journey of graph.journeys) {
    const members = [
      { node: journey, kind: "journey" },
      ...journey.states.map((node) => ({ node, kind: "state" }) as const),
      ...journey.entries.map((node) => ({ node, kind: "entry" }) as const),
      ...journey.exits.map((node) => ({ node, kind: "exit" }) as const),
    ] as const;
    for (const { occurrence } of occurrences.filter(
      (item) => item.journey === journey,
    )) {
      for (const { node, kind } of members) {
        const selection: ViewerSelection = {
          kind,
          journeyId: journey.id,
          nodeId: node.id,
        };
        for (const screen of getNodeScreens(graph, screenshots, node.id)) {
          if (
            screens.some(
              (existing) =>
                existing.surface === screen.surface &&
                sameSelection(existing.target.selection, selection) &&
                sameOccurrence(existing.target.occurrence, occurrence),
            )
          )
            continue;
          screens.push({
            ...screen,
            target: { selection, occurrence },
            label: node.label,
          });
        }
      }
    }
  }
  return screens;
}

export function openScreenshot(
  graph: JourneyGraph,
  screenshots: ScreenshotMap,
  current: ViewerSnapshot,
  target: ViewerTarget,
  surfaceId: string,
): ViewerSnapshot {
  const journey = getOccurrenceTrail(graph, target.occurrence).at(-1)?.journey;
  if (
    journey?.id !== target.selection.journeyId ||
    !resolveSelection(graph, target.selection) ||
    !getNodeScreens(graph, screenshots, target.selection.nodeId).some(
      (screen) => screen.surface.id === surfaceId && screen.source,
    )
  )
    return current;
  // Reveals ancestors but never expands a composite's children as a side effect of opening its image.
  const interaction = selectScreenNode(
    graph,
    current.interaction,
    target.selection,
  );
  const navigation = current.navigation;
  // Columns follow the screen's call path without opening a composite's children.
  const lanes =
    navigation.mode === "columns"
      ? getLanePath(graph, target.occurrence, target.selection, false)
      : navigation.lanes;
  const unchangedLanes =
    lanes.length === navigation.lanes.length &&
    lanes.every((lane, index) =>
      sameOccurrence(lane, navigation.lanes[index] ?? null),
    );
  const unchangedContext =
    sameOccurrence(navigation.occurrence, target.occurrence) &&
    unchangedLanes &&
    navigation.hover === null;
  if (
    interaction === current.interaction &&
    unchangedContext &&
    current.lightbox?.surfaceId === surfaceId &&
    sameSelection(current.lightbox.target.selection, target.selection) &&
    sameOccurrence(current.lightbox.target.occurrence, target.occurrence)
  )
    return current;
  return {
    ...current,
    interaction,
    navigation: unchangedContext
      ? navigation
      : {
          ...navigation,
          occurrence: target.occurrence,
          lanes: unchangedLanes ? navigation.lanes : lanes,
          hover: null,
          hoverOccurrence: null,
        },
    lightbox: {
      surfaceId,
      target: {
        selection: { ...target.selection },
        occurrence: target.occurrence,
      },
    },
  };
}

export function closeScreenshot(current: ViewerSnapshot): ViewerSnapshot {
  return current.lightbox === null ? current : { ...current, lightbox: null };
}

/** Wraps in source display order, skipping absent mappings but keeping failed URLs navigable. */
export function stepScreenshot(
  graph: JourneyGraph,
  screenshots: ScreenshotMap,
  current: ViewerSnapshot,
  direction: -1 | 1,
): ViewerSnapshot {
  if (!current.lightbox || (direction !== -1 && direction !== 1))
    return current;
  const screens = getScreens(graph, screenshots);
  const index = screens.findIndex(
    (screen) =>
      screen.surface.id === current.lightbox?.surfaceId &&
      sameSelection(
        screen.target.selection,
        current.lightbox.target.selection,
      ) &&
      sameOccurrence(
        screen.target.occurrence,
        current.lightbox.target.occurrence,
      ),
  );
  for (let offset = 1; offset <= screens.length; offset += 1) {
    const next =
      screens[
        ((index < 0 ? (direction === 1 ? -1 : 0) : index) +
          direction * offset +
          screens.length) %
          screens.length
      ];
    if (next?.source)
      return openScreenshot(
        graph,
        screenshots,
        current,
        next.target,
        next.surface.id,
      );
  }
  return current;
}

/** Distinct mapped surfaces reachable from rendered graph nodes. */
export function countMappedScreens(
  graph: JourneyGraph,
  screenshots: ScreenshotMap,
): number {
  return new Set(
    getScreens(graph, screenshots)
      .filter((screen) => screen.source)
      .map((screen) => screen.surface.id),
  ).size;
}
