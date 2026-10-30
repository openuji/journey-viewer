import { Icon, IconButton } from "@journey-viewer/design-system";
import { useViewer } from "@/components/Viewer/Viewer";

/** Returns to the initial view, expansion and selection. */
export function ControlledResetView({
  onReset,
}: Readonly<{ onReset: () => void }>) {
  return (
    <IconButton
      label="Reset view"
      title="Reset view"
      icon={<Icon name="reset" />}
      onClick={onReset}
    />
  );
}

export function ResetView() {
  const { dispatch } = useViewer();
  return <ControlledResetView onReset={() => dispatch({ type: "reset" })} />;
}
