import type { Meta, StoryObj } from "@storybook/react-vite";
import { Connector } from "@/components/Connector/Connector";
import { createConnectorFixture } from "@/components/Connector/Connector.fixtures";

const meta = {
  title: "Flow/Connector",
  component: Connector,
  args: createConnectorFixture(),
  render: (args) => (
    <svg width="160" height="80" overflow="visible" aria-hidden="true">
      <Connector {...args} />
    </svg>
  ),
} satisfies Meta<typeof Connector>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Bundle: Story = {};
export const Association: Story = {
  args: createConnectorFixture({ kind: "association" }),
};
export const AtRest: Story = { args: createConnectorFixture({ rest: true }) };
