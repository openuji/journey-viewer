import type { Meta, StoryObj } from "@storybook/react-vite";
import { FlowKey } from "@/components/FlowKey/FlowKey";
import { createFlowKeyFixture } from "@/components/FlowKey/FlowKey.fixtures";

const meta = {
  title: "Flow/FlowKey",
  component: FlowKey,
  args: createFlowKeyFixture(),
  render: (args) => (
    <div style={{ minBlockSize: 280 }}>
      <FlowKey {...args} />
    </div>
  ),
} satisfies Meta<typeof FlowKey>;
export default meta;
type Story = StoryObj<typeof meta>;
/** Opens on click; the panel lists the marks the canvas uses. */
export const Default: Story = {};
