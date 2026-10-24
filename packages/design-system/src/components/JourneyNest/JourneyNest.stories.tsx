import type { Meta, StoryObj } from "@storybook/react-vite";
import { JourneyNest } from "@/components/JourneyNest/JourneyNest";
import { createJourneyNestFixture } from "@/components/JourneyNest/JourneyNest.fixtures";
import { StateRow } from "@/components/StateRow/StateRow";
import { createStateRowFixture } from "@/components/StateRow/StateRow.fixtures";

const meta = {
  title: "Hierarchy/JourneyNest",
  component: JourneyNest,
  tags: ["autodocs"],
  args: createJourneyNestFixture(),
  render: (args) => (
    <div>
      <StateRow
        {...createStateRowFixture({
          label: "Authenticate",
          description: "Identity journey",
          expanded: true,
        })}
        onToggle={() => undefined}
      >
        <JourneyNest {...args}>
          <StateRow
            {...createStateRowFixture({
              label: "Select account",
              composite: false,
            })}
          />
          <StateRow
            {...createStateRowFixture({ label: "Login", composite: false })}
          />
        </JourneyNest>
      </StateRow>
    </div>
  ),
} satisfies Meta<typeof JourneyNest>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Matched: Story = {
  args: createJourneyNestFixture({ matched: true }),
};
