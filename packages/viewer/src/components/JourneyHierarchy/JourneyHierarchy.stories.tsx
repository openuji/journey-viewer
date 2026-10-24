import type { Meta, StoryObj } from "@storybook/react-vite";
import { JourneyHierarchy } from "@/components/JourneyHierarchy/JourneyHierarchy";
import {
  emptyDocument,
  oidcDocument,
  topologyDocument,
} from "~/.storybook/documents";

const meta = {
  title: "Viewer/JourneyHierarchy",
  component: JourneyHierarchy,
  tags: ["autodocs"],
  args: { document: oidcDocument, level: 2 },
  parameters: { controls: { exclude: ["document"] } },
} satisfies Meta<typeof JourneyHierarchy>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Oidc: Story = { name: "Solid-OIDC" };
export const MultipleRootsAndRecursion: Story = {
  args: { document: topologyDocument },
};
export const Empty: Story = { args: { document: emptyDocument } };
export const BuiltConsumer: Story = {
  render: () => (
    <iframe
      title="Compiled viewer without Tailwind processing"
      src="/viewer-consumer/"
      style={{ border: 0, width: "100%", height: "90vh" }}
    />
  ),
};
