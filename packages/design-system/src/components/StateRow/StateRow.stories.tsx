import type { Meta, StoryObj } from "@storybook/react-vite";
import { ScreenAction, StateRow } from "./StateRow.js";
import { Text } from "../Text/Text.js";
import { createStateRowFixture } from "./StateRow.fixtures.ts";

const meta = {
  title: "Hierarchy/StateRow",
  component: StateRow,
  tags: ["autodocs"],
  args: { ...createStateRowFixture(), onToggle: () => undefined },
} satisfies Meta<typeof StateRow>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Notice: Story = {
  args: {
    ...createStateRowFixture({ label: "Empty composition", composite: false }),
    notice: <Text as="p" variant="caption" tone="subtle">No child journeys.</Text>,
  },
};
export const Filtered: Story = {
  args: createStateRowFixture({ filtered: true }),
};
export const Tones: Story = {
  render: () => <div className="story-stack">{(["active", "incoming", "outgoing", "both", "dim"] as const).map((tone) => (
    <StateRow key={tone} {...createStateRowFixture({
      label: tone, composite: false, tone,
      marks: { incoming: tone === "incoming" || tone === "both" ? 1 : 0, outgoing: tone === "outgoing" || tone === "both" ? 2 : 0 },
    })} />
  ))}<StateRow {...createStateRowFixture({ label: "Selected", composite: false, selected: true })} /></div>,
};
export const LaneIndicator: Story = {
  render: () => <div className="story-stack">
    <StateRow {...createStateRowFixture({ label: "Closed lane child" })} />
    <StateRow {...createStateRowFixture({ label: "Open lane child", expanded: true })} />
  </div>,
};
export const Crossing: Story = {
  args: { ...createStateRowFixture({ crossing: { label: "Identity provider", color: "var(--jv-color-category-blue)" } }), onToggle: () => undefined },
};
export const LongContent: Story = {
  args: createStateRowFixture({
    label:
      "Averylongunbrokenstatelabelthatmustwrapwithoutoverflowingtheavailablemobilewidth",
    description: "Additional nested journey information",
    selected: true,
  }),
};
export const WithScreenAction: Story = {
  args: {
    ...createStateRowFixture({ composite: false, label: "Login" }),
    actions: <ScreenAction label="Screen mockup: Login" color="var(--jv-color-category-blue)" />,
  },
};
