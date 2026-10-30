import type { Meta, StoryObj } from "@storybook/react-vite";
import { FlowFrame } from "@/components/FlowFrame/FlowFrame";
import { createFlowFrameFixture } from "@/components/FlowFrame/FlowFrame.fixtures";

const meta = {
  title: "Flow/FlowFrame",
  component: FlowFrame,
  args: createFlowFrameFixture(),
  render: (args) => (
    <FlowFrame {...args} style={{ inlineSize: 240, blockSize: 120 }} />
  ),
} satisfies Meta<typeof FlowFrame>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Current: Story = {};
/** Around the active journey: on the ground. */
export const Outside: Story = {
  args: createFlowFrameFixture({ context: "outside" }),
};
/** The active journey's frame inside the frame that encloses it. */
export const Nested: Story = {
  render: () => (
    <FlowFrame
      context="outside"
      style={{ inlineSize: 280, blockSize: 160, padding: 24 }}
    >
      <FlowFrame
        context="current"
        style={{ inlineSize: "100%", blockSize: "100%" }}
      />
    </FlowFrame>
  ),
};
