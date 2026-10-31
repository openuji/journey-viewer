import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "@journey-viewer/design-system";
import { JourneyViewer } from "@/components/JourneyViewer/JourneyViewer";
import {
  emptyCompositesGraph,
  emptyGraph,
  oidcGraph,
  screensGraph,
  topologyGraph,
} from "~/.storybook/documents";
import {
  oidcScreenshots,
  oidcTouchpoints,
  missingScreenshots,
} from "~/.storybook/screenshots";
import { ScreenshotInputs } from "~/.storybook/ScreenshotInputs";
import { exampleExtensions } from "~/.storybook/extensions";

const meta = {
  title: "Viewer/JourneyViewer",
  component: JourneyViewer,
  tags: ["autodocs"],
  args: { graph: oidcGraph },
  parameters: { controls: { exclude: ["graph"] } },
} satisfies Meta<typeof JourneyViewer>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Oidc: Story = { name: "Solid-OIDC" };
export const MultipleRootsAndRecursion: Story = {
  args: { graph: topologyGraph },
};
export const Empty: Story = { args: { graph: emptyGraph } };
export const EmptyComposites: Story = {
  args: { graph: emptyCompositesGraph },
};
export const IndependentInstances: Story = {
  render: (args) => (
    <div className="story-stack">
      <JourneyViewer {...args} />
      <JourneyViewer {...args} />
    </div>
  ),
};
const replacement = Object.freeze({ ...oidcGraph });
function ReplacementExample() {
  const [graph, setGraph] = useState(oidcGraph);
  return (
    <div className="story-stack">
      <Button
        onClick={() =>
          setGraph((current) =>
            current === oidcGraph ? replacement : oidcGraph,
          )
        }
      >
        Replace document with same ID
      </Button>
      <JourneyViewer graph={graph} />
    </div>
  );
}
export const DocumentReplacement: Story = {
  render: () => <ReplacementExample />,
};
export const Screens: Story = {
  args: { screenshots: oidcScreenshots, touchpoints: oidcTouchpoints },
};
export const MissingImage: Story = {
  args: { screenshots: missingScreenshots, touchpoints: oidcTouchpoints },
};
export const LiveScreenshotMap: Story = {
  render: () => (
    <ScreenshotInputs>
      {(screenshots) => (
        <JourneyViewer
          graph={oidcGraph}
          screenshots={screenshots}
          touchpoints={oidcTouchpoints}
        />
      )}
    </ScreenshotInputs>
  ),
};
export const SeveralSurfaces: Story = {
  args: {
    graph: screensGraph,
    screenshots: {
      "opaque:7":
        oidcScreenshots["urn:ujg:solid-oidc:app-sign-in-required-surface"]!,
      "opaque:9": oidcScreenshots["urn:ujg:solid-oidc:app-logged-in-surface"]!,
      "opaque:11":
        oidcScreenshots["urn:ujg:solid-oidc:app-sign-in-required-surface"]!,
      "opaque:15":
        oidcScreenshots["urn:ujg:solid-oidc:mfa-sms-message-surface"]!,
    },
  },
};
export const BuildTimeExtensions: Story = {
  args: { graph: topologyGraph, extensions: exampleExtensions },
};
function ExtensionInputs() {
  const [enabled, setEnabled] = useState(true);
  return (
    <div className="story-stack">
      <Button
        aria-pressed={enabled}
        onClick={() => setEnabled((current) => !current)}
      >
        Toggle example extensions
      </Button>
      <JourneyViewer
        graph={topologyGraph}
        {...(enabled ? { extensions: exampleExtensions } : {})}
      />
    </div>
  );
}
export const RemovableExtensions: Story = { render: () => <ExtensionInputs /> };
