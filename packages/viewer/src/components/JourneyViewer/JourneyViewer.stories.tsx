import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "@journey-viewer/design-system";
import { JourneyViewer } from "./JourneyViewer.js";
import { emptyCompositesDocument, emptyDocument, oidcDocument, topologyDocument } from "../../../.storybook/documents.js";

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
