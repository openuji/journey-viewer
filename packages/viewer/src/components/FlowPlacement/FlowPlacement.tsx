import { SegmentedControl } from "@journey-viewer/design-system";
import { useFlowSettings } from "@/components/FlowSettings/FlowSettings";

const placements = [
  { value: "median", label: "Median" },
  { value: "aligned-center", label: "Aligned centre" },
  { value: "aligned-left", label: "Aligned left" },
] as const;

/** Where each layer's states sit; needs an enclosing `FlowSettings`. */
export function FlowPlacement() {
  const { settings, change } = useFlowSettings();
  return (
    <SegmentedControl
      label="Placement"
      options={placements}
      value={settings.placement}
      onChange={(placement) => change({ ...settings, placement })}
    />
  );
}
