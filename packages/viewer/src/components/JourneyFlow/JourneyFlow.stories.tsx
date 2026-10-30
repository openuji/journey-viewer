import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { Placement } from "@journey-viewer/flow-layout";
import type { UjgDocument } from "@journey-viewer/ujg-jsonld";
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
import { BrowserTextMeasure } from "@/browser/BrowserTextMeasure";
import { JourneyFlow } from "@/components/JourneyFlow/JourneyFlow";
import type { FlowView } from "@/components/JourneyFlow/JourneyFlow";
import {
  emptyCompositesDocument,
  oidcDocument,
  screensDocument,
  topologyDocument,
} from "~/.storybook/documents";
import { oidcScreenshots, oidcTouchpoints } from "~/.storybook/screenshots";

const id = (local: string) => `urn:ujg:solid-oidc:${local}`;
const collapsed = (document: UjgDocument) =>
  collapseAllJourneys(createViewerInteraction(document));
const idpOpen = toggleChildJourneys(
  oidcDocument,
  collapsed(oidcDocument),
  id("app-auth-journey"),
  id("idp-auth-flow"),
);

interface FlowStoryProps {
  readonly document: UjgDocument;
  readonly interaction: ViewerInteraction;
  readonly placement?: Placement;
}

/**
 * A controlled flow with its own disclosure state. The wrapper reports the artifacts of the layout
 * the browser renders, composed again from the same inputs and the same text measurement.
 */
function FlowStory({
  document,
  interaction,
  placement = "median",
}: FlowStoryProps) {
  const [state, setState] = useState<
    ViewerDisclosure & {
      readonly view: FlowView;
      readonly active: ViewerSelection | null;
    }
  >(() => ({
    snapshot: { ...createViewerSnapshot(document), interaction },
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
                      buildFlowScene(document, snapshot.interaction),
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
            document={document}
            interaction={snapshot.interaction}
            location={state.location}
            placement={placement}
            screenshots={document === oidcDocument ? oidcScreenshots : {}}
            touchpoints={oidcTouchpoints}
            active={state.active}
            view={state.view}
            onAction={(action, view) =>
              setState((current) => ({
                ...current,
                ...disclose(
                  document,
                  document === oidcDocument ? oidcScreenshots : {},
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
  args: { document: oidcDocument, interaction: collapsed(oidcDocument) },
  parameters: { controls: { exclude: ["document", "interaction"] } },
} satisfies Meta<typeof FlowStory>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Collapsed: Story = {};
/** The main scope: the app journey with the identity provider's flow open inside it. */
export const AppWithIdpOpen: Story = { args: { interaction: idpOpen } };
export const FullyOpen: Story = {
  args: { interaction: createViewerInteraction(oidcDocument) },
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
    document: topologyDocument,
    interaction: createViewerInteraction(topologyDocument),
  },
};
/** A composite with several child journeys opens them as sibling frames. */
export const SiblingChildJourneys: Story = {
  args: {
    document: screensDocument,
    interaction: createViewerInteraction(screensDocument),
  },
};
export const ChildlessComposites: Story = {
  args: {
    document: emptyCompositesDocument,
    interaction: createViewerInteraction(emptyCompositesDocument),
  },
};
