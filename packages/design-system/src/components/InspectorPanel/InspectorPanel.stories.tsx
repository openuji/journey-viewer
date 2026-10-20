import type { Meta, StoryObj } from "@storybook/react-vite";
import { InspectorPanel } from "./InspectorPanel.js";
import { createInspectorPanelFixture } from "./InspectorPanel.fixtures.ts";

const meta = {
  title: "Inspection/InspectorPanel",
  component: InspectorPanel,
  tags: ["autodocs"],
  args: createInspectorPanelFixture(),
} satisfies Meta<typeof InspectorPanel>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const EmptySections: Story = { args: { sections: [{ title: "Incoming transitions", items: [] }] } };
export const LongContent: Story = {
  args: { title: "Averylongunbrokenstatelabelthatmustwrapwithoutoverflowingtheavailablemobilewidth", identity: "urn:example:averylongidentitythatmustwrapwithoutoverflowingtheavailablemobilewidth" },
};
