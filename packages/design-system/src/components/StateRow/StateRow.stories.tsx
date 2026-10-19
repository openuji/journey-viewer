import type { Meta, StoryObj } from "@storybook/react-vite";
import { StateRow } from "./StateRow.js";
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
export const Filtered: Story = {
  args: createStateRowFixture({ filtered: true }),
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
