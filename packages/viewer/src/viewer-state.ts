import type { ReactNode } from "react";
import type { UjgDocument } from "@journey-viewer/ujg-jsonld";
import { toggleContracts } from "@/interaction";
import type { ViewerInteraction } from "@/interaction";
import {
  createViewerSnapshot,
  selectTouchpoint,
  setSearchQuery,
} from "@/navigation";
import type { ViewerSnapshot, ViewerTarget } from "@/navigation";
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
    document: UjgDocument,
    snapshot: ViewerSnapshot,
  ) => ViewerSnapshot;
  /** Where the inspector sits on phones; it comes first by default. */
  readonly inspector?: "before" | "after";
}

/** What the reducer reads besides the state; the viewer's props, unchanged. */
export interface ViewerInputs {
  readonly document: UjgDocument;
  readonly screenshots: ScreenshotMap;
  readonly views: readonly ViewerView[];
  /** The view the viewer opens with and returns to on reset; the first by default. */
  readonly initialView?: string | undefined;
  /** The expansion and selection it opens with and returns to on reset. */
  readonly initialInteraction?:
    | ((
        document: UjgDocument,
        interaction: ViewerInteraction,
      ) => ViewerInteraction)
    | undefined;
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
  readonly ref: string;
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

const revealOf = (target: ViewerTarget, seq: number): ViewerReveal => ({
  seq,
  kind: target.selection.kind,
  occurrence: occurrenceKey(target.occurrence),
  ref: target.selection.nodeRef,
  target,
});

const viewOf = (inputs: ViewerInputs, id: string | undefined) =>
  inputs.views.find((view) => view.id === id) ?? inputs.views[0];

const enter = (
  inputs: ViewerInputs,
  snapshot: ViewerSnapshot,
  id: string | undefined,
) => viewOf(inputs, id)?.enter?.(inputs.document, snapshot) ?? snapshot;

export function createViewerState(inputs: ViewerInputs): ViewerState {
  const { document, initialInteraction } = inputs;
  const created = createViewerSnapshot(document);
  const snapshot = initialInteraction
    ? {
        ...created,
        interaction: initialInteraction(document, created.interaction),
      }
    : created;
  const view = viewOf(inputs, inputs.initialView);
  return {
    disclosure: {
      snapshot: enter(inputs, snapshot, view?.id),
      location: null,
    },
    view: view?.id ?? "",
    searchOpen: false,
    reveal: null,
    preview: null,
  };
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
  const { document, screenshots } = inputs;
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
      const disclosure = disclose(document, screenshots, state.disclosure, {
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
        disclosure: disclose(document, screenshots, state.disclosure, command),
        searchOpen: false,
        reveal: nextReveal(command.target),
      };
    case "openScreen":
      return {
        ...withDisclosure(
          disclose(document, screenshots, state.disclosure, command),
        ),
        preview: state.preview && { ...state.preview, visible: false },
      };
    case "toggle":
    case "stepScreen":
    case "expandAll":
    case "collapseAll":
    case "return":
      return withDisclosure(
        disclose(document, screenshots, state.disclosure, command),
      );
    case "view": {
      const view = inputs.views.find(({ id }) => id === command.id);
      if (!view || view.id === state.view) return state;
      return {
        ...withSnapshot(view.enter?.(document, snapshot) ?? snapshot),
        view: view.id,
      };
    }
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
      return withSnapshot(selectTouchpoint(document, snapshot, command.id));
    case "toggleContracts": {
      const interaction = toggleContracts(
        document,
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
          ref: "",
          target: null,
        },
      };
  }
}
