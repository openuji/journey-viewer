import type { Meta, StoryObj } from "@storybook/react-vite";
import { StateRow } from "./StateRow.js";
import { Text } from "../Text/Text.js";
import { createStateRowFixture } from "./StateRow.fixtures.ts";

const meta = {
  title: "Hierarchy/StateRow",
  component: StateRow,
  tags: ["autodocs"],
  args: createStateRowFixture(),
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
export const Relations: Story = {
  render: () => <div className="story-stack">{(["incoming", "outgoing", "both"] as const).map((relation) => (
    <StateRow key={relation} {...createStateRowFixture({ label: relation, relation })} />
  ))}</div>,
};
export const Boundaries: Story = {
  render: () => (
    <div className="story-stack">
      {(["entry", "exit", "both"] as const).map((boundary) => (
        <StateRow
          key={boundary}
          {...createStateRowFixture({
            label: boundary,
            entryCount: boundary === "exit" ? 0 : 1,
            exitCount: boundary === "entry" ? 0 : 2,
          })}
        />
      ))}
    </div>
  ),
};
export const LongContent: Story = {
  args: createStateRowFixture({
    label:
      "Averylongunbrokenstatelabelthatmustwrapwithoutoverflowingtheavailablemobilewidth",
    description: "Additional nested journey information",
    selected: true,
  }),
};
