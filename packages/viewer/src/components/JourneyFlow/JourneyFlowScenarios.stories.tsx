import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button, FlowKey } from "@journey-viewer/design-system";
import type { ViewerInitialCommand } from "@/viewer-state";
import { Viewer, useViewer } from "@/components/Viewer/Viewer";
import { ViewerBar } from "@/components/ViewerBar/ViewerBar";
import { DocumentSummary } from "@/components/DocumentSummary/DocumentSummary";
import { ViewSwitch } from "@/components/ViewSwitch/ViewSwitch";
import { WhenView } from "@/components/WhenView/WhenView";
import { ExpandCollapse } from "@/components/ExpandCollapse/ExpandCollapse";
import { TouchpointFilter } from "@/components/TouchpointFilter/TouchpointFilter";
import { GraphSearch } from "@/components/GraphSearch/GraphSearch";
import { ResetView } from "@/components/ResetView/ResetView";
import { ViewerMain } from "@/components/ViewerMain/ViewerMain";
import { columnsView, treeView } from "@/components/ExplorerView/ExplorerView";
import { flowView } from "@/components/FlowView/FlowView";
import { FlowSettings } from "@/components/FlowSettings/FlowSettings";
import { FlowPlacement } from "@/components/FlowPlacement/FlowPlacement";
import { FlowZoom } from "@/components/FlowZoom/FlowZoom";
import { oidcGraph } from "~/.storybook/documents";
import { oidcScreenshots, oidcTouchpoints } from "~/.storybook/screenshots";

/** The spike's main scope: the app journey with the identity provider's flow open inside it. */
const appWithIdpOpen: readonly ViewerInitialCommand[] = [
  { type: "collapseAll" },
  {
    type: "toggle",
    journeyId: "urn:ujg:solid-oidc:app-auth-journey",
    stateId: "urn:ujg:solid-oidc:idp-auth-flow",
  },
];

const inputs = {
  graph: oidcGraph,
  screenshots: oidcScreenshots,
  touchpoints: oidcTouchpoints,
  initialView: "flow",
  initialCommands: appWithIdpOpen,
};

/** The explorer bar's other tools, after the view switch and anything placed beside it. */
const tools = (
  <>
    <WhenView id={["tree", "flow"]}>
      <ExpandCollapse />
    </WhenView>
    <TouchpointFilter />
    <GraphSearch>
      <ResetView />
    </GraphSearch>
  </>
);
const flowControls = (
  <>
    <FlowPlacement />
    <FlowZoom />
    <FlowKey />
  </>
);

/**
 * Toolbar arrangements for a Flow view beside Tree and Columns. Each story is a plain composition
 * of the viewer's pieces: an arrangement is a different tree, not a flag.
 */
const meta = {
  title: "Viewer/Flow scenarios",
  parameters: { layout: "fullscreen" },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

/** Tree | Columns | Flow, then Placement, Zoom and the key in the bar. */
export const ControlsInTheBar: Story = {
  render: () => (
    <Viewer {...inputs} views={[treeView, columnsView, flowView()]}>
      <FlowSettings>
        <ViewerBar>
          <DocumentSummary />
          <ViewSwitch />
          <WhenView id="flow">{flowControls}</WhenView>
          {tools}
        </ViewerBar>
        <ViewerMain />
      </FlowSettings>
    </Viewer>
  ),
};

/** Only the view switch in the bar; Placement, Zoom and the key beside the journey path. */
export const ControlsOnTheCanvas: Story = {
  render: () => (
    <FlowSettings>
      <Viewer
        {...inputs}
        views={[treeView, columnsView, flowView({ pathEnd: flowControls })]}
      >
        <ViewerBar>
          <DocumentSummary />
          <ViewSwitch />
          {tools}
        </ViewerBar>
        <ViewerMain />
      </Viewer>
    </FlowSettings>
  ),
};

/** Only the view switch: median placement at 100%. */
export const FlowWithDefaults: Story = {
  render: () => (
    <Viewer {...inputs} views={[treeView, columnsView, flowView()]}>
      <ViewerBar>
        <DocumentSummary />
        <ViewSwitch />
        {tools}
      </ViewerBar>
      <ViewerMain />
    </Viewer>
  ),
};

/** No bar and no Tree or Columns: the canvas, its journey path and the inspector, as if embedded. */
export const FlowOnItsOwn: Story = {
  render: () => (
    <Viewer {...inputs} views={[flowView()]}>
      <ViewerMain />
    </Viewer>
  ),
};

/** A control the library does not have: any component inside the viewer can dispatch commands. */
function ToggleMfa() {
  const { dispatch } = useViewer();
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() =>
        dispatch({
          type: "toggle",
          journeyId: "urn:ujg:solid-oidc:idp-auth-journey",
          stateId: "urn:ujg:solid-oidc:idp-mfa-challenge",
        })
      }
    >
      Toggle MFA
    </Button>
  );
}

/** A custom command beside the library's pieces. */
export const CustomCommand: Story = {
  render: () => (
    <Viewer {...inputs} views={[treeView, flowView()]}>
      <ViewerBar>
        <DocumentSummary />
        <ViewSwitch />
        <ToggleMfa />
        {tools}
      </ViewerBar>
      <ViewerMain />
    </Viewer>
  ),
};
