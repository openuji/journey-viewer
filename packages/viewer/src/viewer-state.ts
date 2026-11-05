import type { ReactNode } from "react";
import type { JourneyGraph } from "@journey-viewer/ujg-jsonld";
import { toggleContracts } from "@/interaction";
import {
  createViewerSnapshot,
  selectTouchpoint,
  setSearchQuery,
  setViewMode,
} from "@/navigation";
import type { ViewerMode, ViewerSnapshot, ViewerTarget } from "@/navigation";
import { occurrenceKey } from "@/occurrence";
import { closeScreenshot } from "@/screens";
import type { ScreenshotMap } from "@/screens";
import type { PreviewAnchor } from "@/preview-placement";
import { disclose } from "@/disclosure";
import type { DisclosureAction, ViewerDisclosure } from "@/disclosure";

/**
 * One way to show the graph in the viewer's stage. The descriptor is readonly configuration: the
 * view switch lists it and the stage renders the active one; nothing registers it.
 */
export interface ViewerView {
  readonly id: string;
  readonly label: string;
  /** Returns elements only; hooks belong in the components it renders. */
  readonly render: () => ReactNode;
  /** Applied to the snapshot when the view becomes active, such as the columns' lanes. */
  readonly enter?: (
    graph: JourneyGraph,
    snapshot: ViewerSnapshot,
  ) => ViewerSnapshot;
  /** Where the inspector sits on phones; it comes first by default. */
  readonly inspector?: "before" | "after";
}

/** What the reducer reads besides the state; the viewer's props, unchanged. */
export interface ViewerInputs {
  readonly graph: JourneyGraph;
  readonly screenshots: ScreenshotMap;
  readonly views: readonly ViewerView[];
  /** The view the viewer opens with and returns to on reset; the first by default. */
  readonly initialView?: string | undefined;
  /**
   * Commands applied in order to a fresh viewer in its initial view, such as an expansion or a
   * `navigate` to a selection at its call site; reset returns to their result.
   */
  readonly initialCommands?: readonly ViewerInitialCommand[] | undefined;
}

/** The tree and columns' hover preview of a screen. */
export interface ScreenPreview {
  readonly target: ViewerTarget;
  readonly surfaceId: string;
  readonly anchor: PreviewAnchor;
  readonly visible: boolean;
}

/** A request to bring a target, or the viewer's top, into view; every request is a new object. */
export interface ViewerReveal {
  readonly seq: number;
  readonly kind: "top" | "journey" | "state" | "entry" | "exit";
  /** Occurrence key of the containing journey; empty for "top". */
  readonly occurrence: string;
  readonly id: string;
  /** Null for "top". */
  readonly target: ViewerTarget | null;
}

export interface ViewerState {
  readonly disclosure: ViewerDisclosure;
  /** The active view's id. */
  readonly view: string;
  /** Whether search results may show for a non-blank query. */
  readonly searchOpen: boolean;
  readonly reveal: ViewerReveal | null;
  readonly preview: ScreenPreview | null;
}

/** Everything a control can ask of the viewer. */
export type ViewerCommand =
  | Exclude<DisclosureAction, { type: "navigate" }>
  | {
      readonly type: "navigate";
      readonly target: ViewerTarget;
      /** Also brings the target into view, as the inspector's links do. */
      readonly reveal?: boolean;
    }
  | { readonly type: "view"; readonly id: string }
  /** Rows or columns within Tree; retained when switching to Flow. */
  | { readonly type: "treeLayout"; readonly mode: ViewerMode }
  /** Opens the search results. */
  | { readonly type: "query"; readonly query: string }
  | { readonly type: "searchFocus" }
  | { readonly type: "searchDismiss" }
  /** Null shows every journey. */
  | { readonly type: "touchpoint"; readonly id: string | null }
  | { readonly type: "toggleContracts"; readonly journeyId: string }
  | { readonly type: "closeScreen" }
  | {
      readonly type: "preview";
      readonly target: ViewerTarget;
      readonly surfaceId: string;
      readonly anchor: PreviewAnchor;
    }
  | { readonly type: "hidePreview" }
  /** The initial view, expansion and selection, scrolled to the top. */
  | { readonly type: "reset" };

/** A command a viewer can open with; reset returns to the initial state, so it is not one. */
export type ViewerInitialCommand = Exclude<ViewerCommand, { type: "reset" }>;

const revealOf = (target: ViewerTarget, seq: number): ViewerReveal => ({
  seq,
  kind: target.selection.kind,
  occurrence: occurrenceKey(target.occurrence),
  id: target.selection.nodeId,
  target,
});

const viewOf = (inputs: ViewerInputs, id: string | undefined) =>
  inputs.views.find((view) => view.id === id) ?? inputs.views[0];

/**
 * A fresh viewer in its initial view, after its initial commands. They go through the reducer, so
 * a selection always comes with its occurrence, lanes and location.
 */
export function createViewerState(inputs: ViewerInputs): ViewerState {
  const { graph, initialCommands = [] } = inputs;
  const snapshot = createViewerSnapshot(graph);
  const view = viewOf(inputs, inputs.initialView);
  const fresh: ViewerState = {
    disclosure: {
      snapshot: view?.enter?.(graph, snapshot) ?? snapshot,
      location: null,
    },
    view: view?.id ?? "",
    searchOpen: false,
    reveal: null,
    preview: null,
  };
  return initialCommands.reduce(
    (state, command) => reduceViewer(inputs, state, command),
    fresh,
  );
}

/**
 * The viewer's reducer. Every selection, screen and disclosure change goes through `disclose`, so
 * all views share one snapshot and the node the flow's journey path leads to. Unchanged results
 * keep the state's identity.
 */
export function reduceViewer(
  inputs: ViewerInputs,
  state: ViewerState,
  command: ViewerCommand,
): ViewerState {
  const { graph, screenshots } = inputs;
  const { snapshot } = state.disclosure;
  const withSnapshot = (next: ViewerSnapshot): ViewerState =>
    next === snapshot
      ? state
      : { ...state, disclosure: { ...state.disclosure, snapshot: next } };
  const withDisclosure = (next: ViewerDisclosure): ViewerState =>
    next === state.disclosure ? state : { ...state, disclosure: next };
  const nextReveal = (target: ViewerTarget) =>
    revealOf(target, (state.reveal?.seq ?? 0) + 1);
  switch (command.type) {
    case "navigate": {
      const { target, reveal } = command;
      const disclosure = disclose(graph, screenshots, state.disclosure, {
        type: "navigate",
        target,
      });
      return reveal && disclosure.snapshot !== snapshot
        ? { ...state, disclosure, reveal: nextReveal(target) }
        : withDisclosure(disclosure);
    }
    case "pick":
      return {
        ...state,
        disclosure: disclose(graph, screenshots, state.disclosure, command),
        searchOpen: false,
        reveal: nextReveal(command.target),
      };
    case "openScreen":
      return {
        ...withDisclosure(
          disclose(graph, screenshots, state.disclosure, command),
        ),
        preview: state.preview && { ...state.preview, visible: false },
      };
    case "toggle":
    case "stepScreen":
    case "expandAll":
    case "collapseAll":
    case "return":
      return withDisclosure(
        disclose(graph, screenshots, state.disclosure, command),
      );
    case "view": {
      const view = inputs.views.find(({ id }) => id === command.id);
      if (!view || view.id === state.view) return state;
      return {
        ...withSnapshot(view.enter?.(graph, snapshot) ?? snapshot),
        view: view.id,
      };
    }
    case "treeLayout":
      return withSnapshot(setViewMode(graph, snapshot, command.mode));
    case "query": {
      const next = setSearchQuery(snapshot, command.query);
      return next === snapshot && state.searchOpen
        ? state
        : { ...withSnapshot(next), searchOpen: true };
    }
    case "searchFocus":
      return state.searchOpen ? state : { ...state, searchOpen: true };
    case "searchDismiss":
      return state.searchOpen ? { ...state, searchOpen: false } : state;
    case "touchpoint":
      return withSnapshot(selectTouchpoint(graph, snapshot, command.id));
    case "toggleContracts": {
      const interaction = toggleContracts(
        graph,
        snapshot.interaction,
        command.journeyId,
      );
      return interaction === snapshot.interaction
        ? state
        : withSnapshot({ ...snapshot, interaction });
    }
    case "closeScreen":
      return withSnapshot(closeScreenshot(snapshot));
    case "preview": {
      const { target, surfaceId, anchor } = command;
      return {
        ...state,
        preview: { target, surfaceId, anchor, visible: true },
      };
    }
    case "hidePreview":
      return state.preview?.visible
        ? { ...state, preview: { ...state.preview, visible: false } }
        : state;
    case "reset":
      return {
        ...createViewerState(inputs),
        reveal: {
          seq: (state.reveal?.seq ?? 0) + 1,
          kind: "top",
          occurrence: "",
          id: "",
          target: null,
        },
      };
  }
}
