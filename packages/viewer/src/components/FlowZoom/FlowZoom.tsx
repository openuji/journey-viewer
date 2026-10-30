import { SegmentedControl } from "@journey-viewer/design-system";
import { useFlowSettings } from "@/components/FlowSettings/FlowSettings";

const zooms = [
  { value: "actual", label: "100%" },
  { value: "fit", label: "Fit" },
] as const;

/** The flow at its drawn size or fitted to the canvas; needs an enclosing `FlowSettings`. */
export function FlowZoom() {
  const { settings, change } = useFlowSettings();
  return (
    <SegmentedControl
      label="Zoom"
      options={zooms}
      value={settings.zoom}
      onChange={(zoom) => change({ ...settings, zoom })}
    />
  );
}
