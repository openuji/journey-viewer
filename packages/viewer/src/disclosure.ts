import type { JourneyGraph } from "@journey-viewer/ujg-jsonld";
import {
  collapseAllJourneys,
  expandAllJourneys,
  toggleChildJourneys,
} from "@/interaction";
import type { ViewerInteraction } from "@/interaction";
import { navigateViewer, pickSearchResult } from "@/navigation";
import type { ViewerSnapshot, ViewerTarget } from "@/navigation";
import type { ViewerOccurrence } from "@/occurrence";
import { openScreenshot, stepScreenshot } from "@/screens";
import type { ScreenshotMap } from "@/screens";
import type { FlowFrame } from "@/flow/scene";

/**
 * What is open and where the user is: the snapshot Tree, Columns and Flow share, and the node last
 * clicked, expanded or returned to. Both change only through `disclose`. The flow's journey path is
 * the frames showing `location`; when its own frame is closed, that ends at the nearest open one.
 */
export interface ViewerDisclosure {
  readonly snapshot: ViewerSnapshot;
  /** Null until the user acts: the first root journey. */
  readonly location: ViewerTarget | null;
}

/** Every transition that can select a node, open a screen or open or close journeys. */
export type DisclosureAction =
  /** A composite's chevron; the tree's toggle names no occurrence, so it leaves the location. */
  | {
      readonly type: "toggle";
      readonly journeyId: string;
      readonly stateId: string;
      readonly occurrence?: ViewerOccurrence;
    }
  /** A click on a block, a row or a link; it opens the target's composite and what encloses it. */
  | { readonly type: "navigate"; readonly target: ViewerTarget }
  /** A search result: like `navigate`, and it clears the query. */
  | { readonly type: "pick"; readonly target: ViewerTarget }
  | {
      readonly type: "openScreen";
      readonly target: ViewerTarget;
      readonly surfaceId: string;
    }
  | { readonly type: "stepScreen"; readonly direction: -1 | 1 }
  | { readonly type: "expandAll" }
  | { readonly type: "collapseAll" }
  /** An earlier step on the journey path: closes what is open inside that journey. */
  | { readonly type: "return"; readonly frame: FlowFrame };

/** Frames open inside `frame`, at any depth. */
const framesInside = (frame: FlowFrame): readonly FlowFrame[] => {
  const inner =
    frame.content.kind === "row"
      ? frame.content.frames
      : frame.content.vertices.flatMap((v) =>
          v.kind === "frame" ? [v.frame] : [],
        );
  return inner.flatMap((f) => [f, ...framesInside(f)]);
};

/**
 * Closes every composite open inside `frame`; `frame` itself stays open, so its own child journeys
 * are kept. Expansion follows journey identity, so other occurrences of those journeys close too,
 * exactly as with their own toggles.
 */
export function collapseWithin(
  frame: FlowFrame,
  interaction: ViewerInteraction,
): ViewerInteraction {
  const own = new Set(frame.card.children.map((child) => child.id));
  const inside = new Set(
    framesInside(frame)
      .filter((f) => f.card.kind === "composite")
      .flatMap((f) => f.card.children.map((child) => child.id))
      .filter((id) => !own.has(id)),
  );
  return inside.size === 0
    ? interaction
    : {
        ...interaction,
        expandedJourneys: interaction.expandedJourneys.filter(
          (id) => !inside.has(id),
        ),
      };
}

/**
 * The disclosure reducer. A click, a search result or a screen marks its node; a chevron marks its
 * composite, whether it opens or closes; returning marks that step. Expand all, collapse all and
 * the tree's toggle leave the location.
 */
export function disclose(
  graph: JourneyGraph,
  screenshots: ScreenshotMap,
  state: ViewerDisclosure,
  action: DisclosureAction,
): ViewerDisclosure {
  const { snapshot, location } = state;
  const expansion = (
    interaction: ViewerInteraction,
    next: ViewerTarget | null = location,
  ): ViewerDisclosure =>
    interaction === snapshot.interaction && next === location
      ? state
      : { snapshot: { ...snapshot, interaction }, location: next };
  switch (action.type) {
    case "toggle": {
      const { journeyId, stateId, occurrence } = action;
      return expansion(
        toggleChildJourneys(graph, snapshot.interaction, journeyId, stateId),
        occurrence
          ? {
              selection: {
                kind: "state",
                journeyId: journeyId,
                nodeId: stateId,
              },
              occurrence,
            }
          : location,
      );
    }
    case "navigate":
    case "pick":
      return {
        snapshot: (action.type === "pick" ? pickSearchResult : navigateViewer)(
          graph,
          snapshot,
          action.target,
        ),
        location: action.target,
      };
    case "openScreen":
    case "stepScreen": {
      const next =
        action.type === "openScreen"
          ? openScreenshot(
              graph,
              screenshots,
              snapshot,
              action.target,
              action.surfaceId,
            )
          : stepScreenshot(graph, screenshots, snapshot, action.direction);
      return { snapshot: next, location: next.lightbox?.target ?? location };
    }
    case "expandAll":
      return expansion(expandAllJourneys(graph, snapshot.interaction));
    case "collapseAll":
      return expansion(collapseAllJourneys(snapshot.interaction));
    case "return":
      return expansion(
        collapseWithin(action.frame, snapshot.interaction),
        action.frame.card.target,
      );
  }
}
