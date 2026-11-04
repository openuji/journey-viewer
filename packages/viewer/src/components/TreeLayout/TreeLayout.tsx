import { Icon, SegmentedControl } from "@journey-viewer/design-system";
import { useViewer } from "@/components/Viewer/Viewer";
import type { ViewerMode } from "@/navigation";

const layouts = [
  { value: "tree", label: "Rows", icon: <Icon name="layout-rows" /> },
  { value: "columns", label: "Columns", icon: <Icon name="layout-columns" /> },
] as const;

interface ControlledTreeLayoutProps {
  readonly mode: ViewerMode;
  readonly onChange: (mode: ViewerMode) => void;
}

/** Rows or columns, with the same named glyphs for controlled and composed viewers. */
export function ControlledTreeLayout({
  mode,
  onChange,
}: ControlledTreeLayoutProps) {
  return (
    <SegmentedControl
      label="Tree layout"
      options={layouts}
      value={mode}
      onChange={onChange}
    />
  );
}

/** The tree's presentation; its placement and visibility belong to the composition. */
export function TreeLayout() {
  const { state, dispatch } = useViewer();
  return (
    <ControlledTreeLayout
      mode={state.disclosure.snapshot.navigation.mode}
      onChange={(mode) => dispatch({ type: "treeLayout", mode })}
    />
  );
}
