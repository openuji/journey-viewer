import type { Meta, StoryObj } from "@storybook/react-vite";
import { JourneyContracts } from "./JourneyContracts.js";
import { createJourneyContractsFixture } from "./JourneyContracts.fixtures.ts";

const meta = {
  title: "Hierarchy/JourneyContracts",
  component: JourneyContracts,
  tags: ["autodocs"],
  args: createJourneyContractsFixture(),
} satisfies Meta<typeof JourneyContracts>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Empty: Story = { args: { entries: [], exits: [] } };
export const LongContent: Story = {
  args: {
    entries: [{ id: "entry:long", label: "Averylongentrylabelthatwrapswithoutoverflowingtheavailablemobilewidth", default: true }],
    exits: [{ id: "exit:long", label: "A long exit contract label that remains readable at narrow widths" }],
  },
};
