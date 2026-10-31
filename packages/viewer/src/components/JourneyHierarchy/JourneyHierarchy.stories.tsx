import type { Meta, StoryObj } from "@storybook/react-vite";
import { JourneyHierarchy } from "@/components/JourneyHierarchy/JourneyHierarchy";
import { emptyGraph, oidcGraph, topologyGraph } from "~/.storybook/documents";

const meta = {
  title: "Viewer/JourneyHierarchy",
  component: JourneyHierarchy,
  tags: ["autodocs"],
  args: { graph: oidcGraph, level: 2 },
  parameters: { controls: { exclude: ["graph"] } },
} satisfies Meta<typeof JourneyHierarchy>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Oidc: Story = { name: "Solid-OIDC" };
export const MultipleRootsAndRecursion: Story = {
  args: { graph: topologyGraph },
};
export const Empty: Story = { args: { graph: emptyGraph } };
export const BuiltConsumer: Story = {
  render: () => (
    <iframe
      title="Compiled viewer without Tailwind processing"
      src="/viewer-consumer/"
      style={{ border: 0, width: "100%", height: "90vh" }}
    />
  ),
};
