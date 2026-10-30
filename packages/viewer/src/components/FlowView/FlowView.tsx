import { useState } from "react";
import type { ReactNode } from "react";
import type { ViewerSelection } from "@/interaction";
import type { ViewerReveal, ViewerView } from "@/viewer-state";
import { JourneyFlow } from "@/components/JourneyFlow/JourneyFlow";
import type { FlowView } from "@/components/JourneyFlow/JourneyFlow";
import { useViewer } from "@/components/Viewer/Viewer";
import { useFlowSettingsValue } from "@/components/FlowSettings/FlowSettings";
import type { FlowSettingsValue } from "@/components/FlowSettings/FlowSettings";
import styles from "@/components/FlowView/FlowView.module.css";

export interface FlowViewOptions {
  /** Controls at the end of the journey path's bar. */
  readonly pathEnd?: ReactNode;
}

/** The canvas's own presentation, and the inputs it last followed. */
interface FlowStageState {
  readonly view: FlowView;
  readonly active: ViewerSelection | null;
  readonly reveal: ViewerReveal | null;
  readonly settings: FlowSettingsValue;
}

const still: FlowView = { anchor: null, reveal: null };

function FlowStage({ pathEnd }: FlowViewOptions) {
  const { document, screenshots, touchpoints, state, dispatch } = useViewer();
  const settings = useFlowSettingsValue();
  const [stage, setStage] = useState<FlowStageState>(() => ({
    view: still,
    active: null,
    reveal: state.reveal,
    settings,
  }));
  if (stage.reveal !== state.reveal || stage.settings !== settings) {
    // A reveal from the inspector or search brings its target into view, and a reset's ("top")
    // returns the canvas to its first view; new settings start from a still view. Adjusted during
    // render, like the viewer's reset on document change.
    const revealed = stage.reveal !== state.reveal ? state.reveal : null;
    setStage({
      ...stage,
      view: revealed
        ? {
            anchor: null,
            reveal: revealed.target
              ? { target: revealed.target }
              : { start: true },
          }
        : still,
      reveal: state.reveal,
      settings,
    });
    return null;
  }
  const { disclosure } = state;
  const { snapshot } = disclosure;
  return (
    <JourneyFlow
      className={styles.stage}
      document={document}
      interaction={snapshot.interaction}
      location={disclosure.location}
      placement={settings.placement}
      zoom={settings.zoom}
      screenshots={screenshots}
      touchpoints={touchpoints}
      touchpointRefs={snapshot.navigation.touchpointRefs}
      active={stage.active}
      view={stage.view}
      {...(pathEnd !== undefined ? { pathEnd } : {})}
      onAction={(action, view) => {
        dispatch(action);
        setStage((current) => ({ ...current, view }));
      }}
      onView={(view) => setStage((current) => ({ ...current, view }))}
      onActivate={(active) => setStage((current) => ({ ...current, active }))}
    />
  );
}

/**
 * The flow chart: nested frames for open journeys, metro-style connectors and the journey path,
 * over the snapshot Tree and Columns share. Placement and zoom come from an enclosing
 * `FlowSettings`.
 */
export function flowView(options: FlowViewOptions = {}): ViewerView {
  return {
    id: "flow",
    label: "Flow",
    render: () => <FlowStage {...options} />,
    inspector: "after",
  };
}
