import type { Meta, StoryObj } from "@storybook/react-vite";
import { JourneyNest } from "./JourneyNest.js";
import { createJourneyNestFixture } from "./JourneyNest.fixtures.ts";
import { StateRow } from "../StateRow/StateRow.js";
import { createStateRowFixture } from "../StateRow/StateRow.fixtures.ts";

const meta = {
  title: "Hierarchy/JourneyNest",
  component: JourneyNest,
  tags: ["autodocs"],
  args: createJourneyNestFixture(),
  render: (args) => (
    <div>
      <StateRow {...createStateRowFixture({ label: "Authenticate", description: "Identity journey", expanded: true })} onToggle={() => undefined}>
        <JourneyNest {...args}>
          <StateRow {...createStateRowFixture({ label: "Select account", composite: false })} />
          <StateRow {...createStateRowFixture({ label: "Login", composite: false })} />
        </JourneyNest>
      </StateRow>
    </div>
  ),
} satisfies Meta<typeof JourneyNest>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Matched: Story = { args: createJourneyNestFixture({ matched: true }) };
