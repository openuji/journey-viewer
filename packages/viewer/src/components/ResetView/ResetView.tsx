import { Icon, IconButton, Tooltip } from "@journey-viewer/design-system";
import { useViewer } from "@/components/Viewer/Viewer";

/** Returns to the initial view, expansion and selection. */
export function ControlledResetView({
  onReset,
}: Readonly<{ onReset: () => void }>) {
  return (
    <Tooltip label="Reset view">
      <IconButton
        label="Reset view"
        icon={<Icon name="reset" />}
        onClick={onReset}
      />
    </Tooltip>
  );
}

export function ResetView() {
  const { dispatch } = useViewer();
  return <ControlledResetView onReset={() => dispatch({ type: "reset" })} />;
}
