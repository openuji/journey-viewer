import type { Meta, StoryObj } from "@storybook/react-vite";
import { StateSummary } from "./StateSummary.js";
import { createStateSummaryFixture } from "./StateSummary.fixtures.ts";

const meta = {
  title: "Hierarchy/StateSummary",
  component: StateSummary,
  tags: ["autodocs"],
  args: createStateSummaryFixture(),
} satisfies Meta<typeof StateSummary>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Nested: Story = {
  render: (args) => (
    <StateSummary {...args}>
      <StateSummary label="Nested state" />
    </StateSummary>
  ),
};
export const LongContent: Story = {
  args: {
    label: "Averylongunbrokenstatelabelthatmustwrapwithoutoverflowingtheavailablemobilewidth",
  },
};
