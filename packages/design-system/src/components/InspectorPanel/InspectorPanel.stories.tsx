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
export const Interactive: Story = {
  args: {
    sections: createInspectorPanelFixture().sections.map((section) => ({
      ...section,
      groups: (section.groups ?? []).map((group) => ({ ...group, onSelect: () => undefined })),
    })),
  },
};
export const NestedJourney: Story = {
  args: {
    typeLabel: "Composite state",
    sections: [{ title: "Nested journey", details: [{
      id: "urn:example:identity", label: "Identity journey", sub: "12 states · 5 entries · 4 exits",
      touchpoint: { label: "Identity provider", color: "var(--jv-color-category-blue)" },
      note: "Touchpoint change: Web → Identity provider", onSelect: () => undefined,
    }] }],
  },
};
export const EmptySections: Story = { args: { sections: [{ title: "Incoming", direction: "incoming", count: 0 }] } };
export const LongContent: Story = {
  args: { title: "Averylongunbrokenstatelabelthatmustwrapwithoutoverflowingtheavailablemobilewidth", identity: "urn:example:averylongidentitythatmustwrapwithoutoverflowingtheavailablemobilewidth" },
};
