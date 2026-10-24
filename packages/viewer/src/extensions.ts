import type { ComponentType } from "react";
import type {
  HeadingLevel,
  StateRowProps,
} from "@journey-viewer/design-system";
import type {
  UjgCompositeState,
  UjgDocument,
  UjgJourney,
  UjgNode,
  UjgState,
} from "@journey-viewer/ujg-jsonld";
import type { ViewerSelection } from "@/interaction";
import type { ViewerTarget } from "@/navigation";
import type { ViewerOccurrence } from "@/occurrence";

/** Original canonical nodes and the current explicit call site; nothing is copied or retained. */
export interface ViewerNodeContext {
  readonly document: UjgDocument;
  readonly journey: UjgJourney;
  readonly node: UjgNode;
  readonly selection: ViewerSelection;
  /** Null for an informational inspector without controlled navigation. */
  readonly occurrence: ViewerOccurrence | null;
}

export interface ViewerInspectorPanelProps extends ViewerNodeContext {
  /** Heading level inside the descriptor's titled section, capped at 6. */
  readonly level: HeadingLevel;
  readonly onNavigate?: (target: ViewerTarget) => void;
}

export interface ViewerInspectorPanel {
  readonly id: string;
  readonly title: string;
  readonly matches: (context: ViewerNodeContext) => boolean;
  readonly Component: ComponentType<ViewerInspectorPanelProps>;
}

/** Rendered beside journey/state content and for every valid inspector selection kind. */
export interface ViewerAnnotation {
  readonly id: string;
  readonly matches: (context: ViewerNodeContext) => boolean;
  readonly Component: ComponentType<ViewerNodeContext>;
}

export interface ViewerStateContext extends ViewerNodeContext {
  readonly node: UjgState | UjgCompositeState;
  readonly occurrence: ViewerOccurrence;
}

export interface ViewerStateRenderProps {
  readonly context: ViewerStateContext;
  /** Complete design-system contract, including callbacks, notice, media and nested content. */
  readonly row: StateRowProps;
}

export interface ViewerStateOverride {
  readonly id: string;
  readonly matches: (context: ViewerStateContext) => boolean;
  readonly Component: ComponentType<ViewerStateRenderProps>;
}

/** Explicit build-time composition. IDs are caller-owned React keys, never registration names. */
export interface ViewerExtensions {
  /** Every matching panel appends after built-in inspection/navigation, in supplied order. */
  readonly inspectorPanels?: readonly ViewerInspectorPanel[];
  /** Every matching annotation renders in supplied order. */
  readonly annotations?: readonly ViewerAnnotation[];
  /** First match wins; no match uses StateRow. A matching component may deliberately return null. */
  readonly stateOverrides?: readonly ViewerStateOverride[];
}
