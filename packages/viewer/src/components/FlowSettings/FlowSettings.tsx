import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";
import type { Placement } from "@journey-viewer/flow-layout";
import type { FlowZoomLevel } from "@/components/JourneyFlow/JourneyFlow";

/** How the flow is drawn; not part of the graph state, so reset leaves it. */
export interface FlowSettingsValue {
  readonly placement: Placement;
  readonly zoom: FlowZoomLevel;
}

export interface FlowSettingsProps {
  readonly initialPlacement?: Placement;
  readonly initialZoom?: FlowZoomLevel;
  readonly children?: ReactNode;
}

const defaults: FlowSettingsValue = { placement: "median", zoom: "actual" };
const FlowSettingsContext = createContext<Readonly<{
  settings: FlowSettingsValue;
  change: (settings: FlowSettingsValue) => void;
}> | null>(null);

/**
 * Holds the flow's placement and zoom for the controls and the flow view inside it, wherever they
 * sit. Without it, the flow view draws median at 100%.
 */
export function FlowSettings({
  initialPlacement = defaults.placement,
  initialZoom = defaults.zoom,
  children,
}: FlowSettingsProps) {
  const [settings, change] = useState<FlowSettingsValue>({
    placement: initialPlacement,
    zoom: initialZoom,
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
