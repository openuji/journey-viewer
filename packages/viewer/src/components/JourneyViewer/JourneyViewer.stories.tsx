import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "@journey-viewer/design-system";
import { JourneyViewer } from "./JourneyViewer.js";
import { emptyCompositesDocument, emptyDocument, oidcDocument, screensDocument, topologyDocument } from "../../../.storybook/documents.js";
import { oidcScreenshots, oidcTouchpoints, missingScreenshots } from "../../../.storybook/screenshots.js";
import { ScreenshotInputs } from "../../../.storybook/ScreenshotInputs.js";

const meta = {
  title: "Viewer/JourneyViewer",
  component: JourneyViewer,
  tags: ["autodocs"],
  args: { document: oidcDocument },
  parameters: { controls: { exclude: ["document"] } },
} satisfies Meta<typeof JourneyViewer>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Oidc: Story = { name: "Solid-OIDC" };
export const MultipleRootsAndRecursion: Story = { args: { document: topologyDocument } };
export const Empty: Story = { args: { document: emptyDocument } };
export const EmptyComposites: Story = { args: { document: emptyCompositesDocument } };
export const IndependentInstances: Story = {
  render: (args) => <div className="story-stack"><JourneyViewer {...args} /><JourneyViewer {...args} /></div>,
};
const replacement = Object.freeze({ ...oidcDocument });
function ReplacementExample() {
  const [document, setDocument] = useState(oidcDocument);
  return (
    <div className="story-stack">
      <Button onClick={() => setDocument((current) => current === oidcDocument ? replacement : oidcDocument)}>Replace document with same ID</Button>
      <JourneyViewer document={document} />
    </div>
  );
}
export const DocumentReplacement: Story = { render: () => <ReplacementExample /> };
export const Screens: Story = { args: { screenshots: oidcScreenshots, touchpoints: oidcTouchpoints } };
export const MissingImage: Story = { args: { screenshots: missingScreenshots, touchpoints: oidcTouchpoints } };
export const LiveScreenshotMap: Story = { render: () => <ScreenshotInputs>{(screenshots) => (
  <JourneyViewer document={oidcDocument} screenshots={screenshots} touchpoints={oidcTouchpoints} />
)}</ScreenshotInputs> };
export const SeveralSurfaces: Story = { args: { document: screensDocument, screenshots: {
  "opaque:7": oidcScreenshots["urn:ujg:solid-oidc:app-sign-in-required-surface"]!,
  "opaque:9": oidcScreenshots["urn:ujg:solid-oidc:app-logged-in-surface"]!,
  "opaque:11": oidcScreenshots["urn:ujg:solid-oidc:app-sign-in-required-surface"]!,
  "opaque:15": oidcScreenshots["urn:ujg:solid-oidc:mfa-sms-message-surface"]!,
} } };
