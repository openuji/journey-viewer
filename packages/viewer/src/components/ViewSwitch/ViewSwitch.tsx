import { SegmentedControl } from "@journey-viewer/design-system";
import { useViewer } from "@/components/Viewer/Viewer";

/** Switches between the viewer's views; a single view shows no switch. */
export function ViewSwitch() {
  const { views, state, dispatch } = useViewer();
  if (views.length < 2) return null;
  return (
    <SegmentedControl
      label="View"
      options={views.map(({ id, label }) => ({ value: id, label }))}
      value={state.view}
      onChange={(id) => dispatch({ type: "view", id })}
    />
  );
}
