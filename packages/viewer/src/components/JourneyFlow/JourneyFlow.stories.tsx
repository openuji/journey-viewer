import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { Placement } from "@journey-viewer/flow-layout";
import type { JourneyGraph } from "@journey-viewer/ujg-jsonld";
import {
  collapseAllJourneys,
  createViewerInteraction,
  toggleChildJourneys,
} from "@/interaction";
import type { ViewerInteraction, ViewerSelection } from "@/interaction";
import { createViewerSnapshot } from "@/navigation";
import { disclose } from "@/disclosure";
import type { ViewerDisclosure } from "@/disclosure";
import { measureArtifacts } from "@/dev/artifacts";
import { composeFlow } from "@/flow/compose";
import { flowLevel } from "@/flow/geometry";
import { buildFlowScene } from "@/flow/scene";
import { BrowserTextMeasure } from "@/components/BrowserTextMeasure/BrowserTextMeasure";
import { JourneyFlow } from "@/components/JourneyFlow/JourneyFlow";
import type { FlowView } from "@/components/JourneyFlow/JourneyFlow";
import {
  emptyCompositesGraph,
  oidcGraph,
  screensGraph,
  topologyGraph,
} from "~/.storybook/documents";
import { oidcScreenshots, oidcTouchpoints } from "~/.storybook/screenshots";

const id = (local: string) => `urn:ujg:solid-oidc:${local}`;
const collapsed = (graph: JourneyGraph) =>
  collapseAllJourneys(createViewerInteraction(graph));
const idpOpen = toggleChildJourneys(
  oidcGraph,
  collapsed(oidcGraph),
  id("app-auth-journey"),
  id("idp-auth-flow"),
);

interface FlowStoryProps {
  readonly graph: JourneyGraph;
  readonly interaction: ViewerInteraction;
  readonly placement?: Placement;
}

/**
 * A controlled flow with its own disclosure state. The wrapper reports the artifacts of the layout
 * the browser renders, composed again from the same inputs and the same text measurement.
 */
function FlowStory({
  graph,
  interaction,
  placement = "median",
}: FlowStoryProps) {
  const [state, setState] = useState<
    ViewerDisclosure & {
      readonly view: FlowView;
      readonly active: ViewerSelection | null;
    }
  >(() => ({
    snapshot: { ...createViewerSnapshot(graph), interaction },
    location: null,
    view: { anchor: null, reveal: null },
    active: null,
  }));
  const { snapshot } = state;
  return (
    <BrowserTextMeasure>
      {(measure) => (
        <div
          style={{ blockSize: "80dvh", display: "grid" }}
          data-artifacts={
            measure
              ? JSON.stringify({
                  ...measureArtifacts(
                    composeFlow(
                      buildFlowScene(graph, snapshot.interaction),
                      flowLevel(placement),
                      measure,
                    ),
                  ),
                  examples: undefined,
                })
              : undefined
          }
        >
          <JourneyFlow
            graph={graph}
            interaction={snapshot.interaction}
            location={state.location}
            placement={placement}
            screenshots={graph === oidcGraph ? oidcScreenshots : {}}
            touchpoints={oidcTouchpoints}
            active={state.active}
            view={state.view}
            onAction={(action, view) =>
              setState((current) => ({
                ...current,
                ...disclose(
                  graph,
                  graph === oidcGraph ? oidcScreenshots : {},
                  current,
                  action,
                ),
                view,
              }))
            }
            onView={(view) => setState((current) => ({ ...current, view }))}
            onActivate={(active) =>
              setState((current) => ({ ...current, active }))
            }
          />
        </div>
      )}
    </BrowserTextMeasure>
  );
}

const meta = {
  title: "Viewer/JourneyFlow",
  component: FlowStory,
  args: { graph: oidcGraph, interaction: collapsed(oidcGraph) },
  parameters: { controls: { exclude: ["graph", "interaction"] } },
} satisfies Meta<typeof FlowStory>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Collapsed: Story = {};
/** The main scope: the app journey with the identity provider's flow open inside it. */
export const AppWithIdpOpen: Story = { args: { interaction: idpOpen } };
export const FullyOpen: Story = {
  args: { interaction: createViewerInteraction(oidcGraph) },
};
export const AlignedCentre: Story = {
  args: { interaction: idpOpen, placement: "aligned-center" },
};
export const AlignedLeft: Story = {
  args: { interaction: idpOpen, placement: "aligned-left" },
};
/** A recursive reference stops with a marker; multiple roots sit side by side. */
export const RecursionAndReuse: Story = {
  args: {
    graph: topologyGraph,
    interaction: createViewerInteraction(topologyGraph),
  },
};
/** A composite with several child journeys opens them as sibling frames. */
export const SiblingChildJourneys: Story = {
  args: {
    graph: screensGraph,
    interaction: createViewerInteraction(screensGraph),
  },
};
export const ChildlessComposites: Story = {
  args: {
    graph: emptyCompositesGraph,
    interaction: createViewerInteraction(emptyCompositesGraph),
  },
};
