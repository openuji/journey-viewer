import type { Meta, StoryObj } from "@storybook/react-vite";
import { StateNode } from "@/components/StateNode/StateNode";
import { createStateNodeFixture } from "@/components/StateNode/StateNode.fixtures";

const meta = {
  title: "Flow/StateNode",
  component: StateNode,
  args: { ...createStateNodeFixture(), onSelect: () => undefined },
  render: (args) => (
    <div style={{ inlineSize: 150, blockSize: 50 }}>
      <StateNode {...args} style={{ inlineSize: "100%", blockSize: "100%" }} />
    </div>
  ),
} satisfies Meta<typeof StateNode>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Selected: Story = {
  args: createStateNodeFixture({ selected: true }),
};
export const LeadsIntoSelection: Story = {
  args: createStateNodeFixture({ tone: "incoming" }),
};
export const ReachedFromSelection: Story = {
  args: createStateNodeFixture({ tone: "outgoing" }),
};
export const BothDirections: Story = {
  args: createStateNodeFixture({ tone: "both" }),
};
export const WithScreen: Story = {
  args: {
    ...createStateNodeFixture(),
    screen: {
      label: "Screen: Enter the email code",
      color: "var(--jv-color-category-blue)",
      onOpen: () => undefined,
    },
  },
  render: (args) => (
    <div style={{ inlineSize: 174, blockSize: 50 }}>
      <StateNode {...args} style={{ inlineSize: "100%", blockSize: "100%" }} />
    </div>
  ),
};
