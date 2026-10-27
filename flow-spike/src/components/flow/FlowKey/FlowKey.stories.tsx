import type { Meta, StoryObj } from "@storybook/react-vite";
import { specDetail, stakeholderDetail } from "@/model/presentation";
import { FlowKey } from "@/components/flow/FlowKey/FlowKey";

const meta = {
  title: "Flow/FlowKey",
  component: FlowKey,
  args: { detail: stakeholderDetail },
  render: (args) => (
    <div className="flow-story-pad" style={{ minBlockSize: 360 }}>
      <FlowKey {...args} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    canvasElement.querySelector("details")?.setAttribute("open", "");
  },
} satisfies Meta<typeof FlowKey>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Only the marks a stakeholder sees. */
export const Stakeholder: Story = {};
/** Spec detail adds counts, default-entry arrivals and navigation markers. */
export const Spec: Story = { args: { detail: specDetail } };
