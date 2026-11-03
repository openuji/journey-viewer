import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";
import type { Placement } from "@journey-viewer/flow-layout";
import type { FlowRootScope } from "@/flow/roots";
import type { FlowZoomLevel } from "@/components/JourneyFlow/JourneyFlow";

/** How the flow is drawn; not part of the graph state, so reset leaves it. */
export interface FlowSettingsValue {
  readonly placement: Placement;
  readonly zoom: FlowZoomLevel;
  /** Every root journey on the canvas, or one at a time. */
  readonly roots: FlowRootScope;
}

export interface FlowSettingsProps {
  readonly initialPlacement?: Placement;
  readonly initialZoom?: FlowZoomLevel;
  readonly initialRoots?: FlowRootScope;
  readonly children?: ReactNode;
}

const defaults: FlowSettingsValue = {
  placement: "median",
  zoom: "actual",
  roots: "all",
};
const FlowSettingsContext = createContext<Readonly<{
  settings: FlowSettingsValue;
  change: (settings: FlowSettingsValue) => void;
}> | null>(null);

/**
 * Holds the flow's placement, zoom and root scope for the controls and the flow view inside it,
 * wherever they sit. Without it, the flow view draws every root journey, median at 100%.
 */
export function FlowSettings({
  initialPlacement = defaults.placement,
  initialZoom = defaults.zoom,
  initialRoots = defaults.roots,
  children,
}: FlowSettingsProps) {
  const [settings, change] = useState<FlowSettingsValue>({
    placement: initialPlacement,
    zoom: initialZoom,
    roots: initialRoots,
  });
  return (
    <FlowSettingsContext value={{ settings, change }}>
      {children}
    </FlowSettingsContext>
  );
}

/** The enclosing settings and their setter, for flow controls. */
export function useFlowSettings() {
  const context = useContext(FlowSettingsContext);
  if (!context)
    throw new Error("Flow controls need an enclosing <FlowSettings>.");
  return context;
}

/** The enclosing settings, or the defaults when there is no `FlowSettings`. */
export function useFlowSettingsValue(): FlowSettingsValue {
  return useContext(FlowSettingsContext)?.settings ?? defaults;
}
