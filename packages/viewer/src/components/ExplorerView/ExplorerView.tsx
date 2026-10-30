import { JourneyExplorer } from "@/components/JourneyExplorer/JourneyExplorer";
import { useViewer } from "@/components/Viewer/Viewer";
import { setViewMode } from "@/navigation";
import type { ViewerMode } from "@/navigation";
import type { ViewerView } from "@/viewer-state";
import styles from "@/components/ExplorerView/ExplorerView.module.css";

/** The tree or columns over the viewer's snapshot; row tones follow the selection only. */
function ExplorerView({ mode }: Readonly<{ mode: ViewerMode }>) {
  const {
    document,
    level,
    screenshots,
    touchpoints,
    extensions,
    state,
    dispatch,
  } = useViewer();
  const { snapshot } = state.disclosure;
  return (
    <div className={mode === "tree" ? styles.tree : styles.columns}>
      <JourneyExplorer
        document={document}
        interaction={snapshot.interaction}
        navigation={snapshot.navigation}
        level={level}
        media={{
          screenshots,
          onOpen: (target, surfaceId) =>
            dispatch({ type: "openScreen", target, surfaceId }),
          onPreview: (target, surfaceId, anchor) =>
            dispatch(
              anchor
                ? { type: "preview", target, surfaceId, anchor }
                : { type: "hidePreview" },
            ),
        }}
        touchpoints={touchpoints}
        {...(extensions ? { extensions } : {})}
        onSelect={(selection, occurrence) =>
          dispatch({ type: "navigate", target: { selection, occurrence } })
        }
        onToggleChildren={(journeyId, stateId) =>
          dispatch({ type: "toggle", journeyId, stateId })
        }
        onToggleContracts={(journeyId) =>
          dispatch({ type: "toggleContracts", journeyId })
        }
      />
    </div>
  );
}

/** The nested hierarchy with expandable composites. */
export const treeView: ViewerView = {
  id: "tree",
  label: "Tree",
  render: () => <ExplorerView mode="tree" />,
  enter: (document, snapshot) => setViewMode(document, snapshot, "tree"),
};

/** One column per journey along the selection's call path. */
export const columnsView: ViewerView = {
  id: "columns",
  label: "Columns",
  render: () => <ExplorerView mode="columns" />,
  enter: (document, snapshot) => setViewMode(document, snapshot, "columns"),
};
