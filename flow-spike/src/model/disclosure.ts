import {
  collapseAllJourneys,
  expandAllJourneys,
  navigateViewer,
  openScreenshot,
  stepScreenshot,
  toggleChildJourneys,
} from "@journey-viewer/viewer";
import type {
  ScreenshotMap,
  ViewerInteraction,
  ViewerOccurrence,
  ViewerSnapshot,
  ViewerTarget,
} from "@journey-viewer/viewer";
import type { UjgDocument } from "@journey-viewer/ujg-jsonld";
import { cardTarget } from "@/model/flow-scene";
import type { FlowFrame } from "@/model/flow-scene";

/**
 * What the flow has open and where the user is: the snapshot it shares with Tree and Columns, and
 * the node last clicked, expanded or returned to. Both change only through `disclose`. The journey
 * path is the frames showing `location`; when its own frame is closed, that ends at the nearest
 * open one.
 */
export interface FlowDisclosure {
  readonly snapshot: ViewerSnapshot;
  /** Null until the user acts: the first root journey. */
  readonly location: ViewerTarget | null;
}

/** Every transition that can open or close journeys. */
export type DisclosureAction =
  /** A composite's chevron; the tree's toggle names no occurrence, so it leaves the location. */
  | {
      readonly type: "toggle";
      readonly journeyRef: string;
      readonly stateRef: string;
      readonly occurrence?: ViewerOccurrence;
    }
  /** A click on a block, or a link; it opens the target's composite and what encloses it. */
  | { readonly type: "navigate"; readonly target: ViewerTarget }
  | {
      readonly type: "openScreen";
      readonly target: ViewerTarget;
      readonly surfaceRef: string;
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
  const own = new Set(frame.card.children.map((child) => child["@id"]));
  const inside = new Set(
    framesInside(frame)
      .filter((f) => f.card.kind === "composite")
      .flatMap((f) => f.card.children.map((child) => child["@id"]))
      .filter((ref) => !own.has(ref)),
  );
  return inside.size === 0
    ? interaction
    : {
        ...interaction,
        expandedJourneys: interaction.expandedJourneys.filter(
          (ref) => !inside.has(ref),
        ),
      };
}

/**
 * The flow's reducer. A click or a screen marks its node; a chevron marks its composite, whether it
 * opens or closes; returning marks that step. Expand all, collapse all and the tree's toggle leave
 * the location.
 */
export function disclose(
  document: UjgDocument,
  screenshots: ScreenshotMap,
  state: FlowDisclosure,
  action: DisclosureAction,
): FlowDisclosure {
  const { snapshot, location } = state;
  const expansion = (interaction: ViewerInteraction): ViewerSnapshot => ({
    ...snapshot,
    interaction,
  });
  switch (action.type) {
    case "toggle": {
      const { journeyRef, stateRef, occurrence } = action;
      return {
        snapshot: expansion(
          toggleChildJourneys(
            document,
            snapshot.interaction,
            journeyRef,
            stateRef,
          ),
        ),
        location: occurrence
          ? {
              selection: { kind: "state", journeyRef, nodeRef: stateRef },
              occurrence,
            }
          : location,
      };
    }
    case "navigate":
      return {
        snapshot: navigateViewer(document, snapshot, action.target),
        location: action.target,
      };
    case "openScreen":
    case "stepScreen": {
      const next =
        action.type === "openScreen"
          ? openScreenshot(
              document,
              screenshots,
              snapshot,
              action.target,
              action.surfaceRef,
            )
          : stepScreenshot(document, screenshots, snapshot, action.direction);
      return { snapshot: next, location: next.lightbox?.target ?? location };
    }
    case "expandAll":
      return {
        snapshot: expansion(expandAllJourneys(document, snapshot.interaction)),
        location,
      };
    case "collapseAll":
      return {
        snapshot: expansion(collapseAllJourneys(snapshot.interaction)),
        location,
      };
    case "return":
      return {
        snapshot: expansion(collapseWithin(action.frame, snapshot.interaction)),
        location: cardTarget(action.frame.card),
      };
  }
}
