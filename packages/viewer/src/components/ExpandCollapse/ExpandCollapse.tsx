import { Icon, IconButton, Tooltip } from "@journey-viewer/design-system";
import { useViewer } from "@/components/Viewer/Viewer";
import styles from "@/components/ExpandCollapse/ExpandCollapse.module.css";

export interface ControlledExpandCollapseProps {
  readonly onExpandAll: () => void;
  readonly onCollapseAll: () => void;
}

/** Opens or closes every journey. */
export function ControlledExpandCollapse({
  onExpandAll,
  onCollapseAll,
}: ControlledExpandCollapseProps) {
  return (
    <div className={styles.tools}>
      <Tooltip label="Expand all">
        <IconButton
          label="Expand all"
          icon={<Icon name="expand-all" />}
          onClick={onExpandAll}
        />
      </Tooltip>
      <Tooltip label="Collapse all">
        <IconButton
          label="Collapse all"
          icon={<Icon name="collapse-all" />}
          onClick={onCollapseAll}
        />
      </Tooltip>
    </div>
  );
}

export function ExpandCollapse() {
  const { dispatch } = useViewer();
  return (
    <ControlledExpandCollapse
      onExpandAll={() => dispatch({ type: "expandAll" })}
      onCollapseAll={() => dispatch({ type: "collapseAll" })}
    />
  );
}
