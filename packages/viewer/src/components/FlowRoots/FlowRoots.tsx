import { SegmentedControl } from "@journey-viewer/design-system";
import { useFlowSettings } from "@/components/FlowSettings/FlowSettings";

const roots = [
  { value: "all", label: "All journeys" },
  { value: "one", label: "One journey" },
] as const;

/**
 * Every root journey on the canvas, or one at a time with the others a choice on the journey
 * path; needs an enclosing `FlowSettings`.
 */
export function FlowRoots() {
  const { settings, change } = useFlowSettings();
  return (
    <SegmentedControl
      label="Journeys"
      options={roots}
      value={settings.roots}
      onChange={(value) => change({ ...settings, roots: value })}
    />
  );
}
