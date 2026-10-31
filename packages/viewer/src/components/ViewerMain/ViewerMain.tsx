import { JourneyInspector } from "@/components/JourneyInspector/JourneyInspector";
import { useViewer } from "@/components/Viewer/Viewer";
import { BrowserScrollPanel } from "@/browser/BrowserScrollPanel";
import styles from "@/components/ViewerMain/ViewerMain.module.css";

/** The active view's stage beside the sticky selection inspector, as in the original hierarchy. */
export function ViewerMain() {
  const {
    graph,
    views,
    level,
    screenshots,
    touchpoints,
    extensions,
    state,
    dispatch,
  } = useViewer();
  const view = views.find(({ id }) => id === state.view) ?? views[0];
  const { snapshot } = state.disclosure;
  const selection = snapshot.interaction.selection;
  const occurrence = snapshot.navigation.occurrence;
  return (
    <div className={styles.content}>
      <div className={styles.layout} data-view={view?.id}>
        <section aria-label="Journey graph" className={styles.stage}>
          {view?.render()}
        </section>
        <BrowserScrollPanel
          className={[
            styles.inspector,
            view?.inspector === "after" ? styles.after : undefined,
          ]
            .filter(Boolean)
            .join(" ")}
          resetKey={
            selection
              ? `${selection.kind} ${selection.journeyId} ${selection.nodeId}`
              : ""
          }
        >
          <JourneyInspector
            graph={graph}
            selection={selection}
            level={level}
            {...(extensions ? { extensions } : {})}
            touchpoints={touchpoints}
            media={{
              screenshots,
              onOpen: (target, surfaceId) =>
                dispatch({ type: "openScreen", target, surfaceId }),
              target:
                selection && occurrence ? { selection, occurrence } : null,
            }}
            navigation={{
              occurrence,
              onNavigate: (target) =>
                dispatch({ type: "navigate", target, reveal: true }),
            }}
          />
        </BrowserScrollPanel>
      </div>
    </div>
  );
}
