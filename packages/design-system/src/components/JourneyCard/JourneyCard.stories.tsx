import type { Meta, StoryObj } from "@storybook/react-vite";
import { JourneyCard } from "@/components/JourneyCard/JourneyCard";
import { createJourneyCardFixture } from "@/components/JourneyCard/JourneyCard.fixtures";
import { StateRow } from "@/components/StateRow/StateRow";
import { createStateRowFixture } from "@/components/StateRow/StateRow.fixtures";

const meta = {
  title: "Hierarchy/JourneyCard",
  component: JourneyCard,
  tags: ["autodocs"],
  args: createJourneyCardFixture(),
  render: (args) => (
    <JourneyCard {...args}>
      <StateRow {...createStateRowFixture({ composite: false })} />
    </JourneyCard>
  ),
} satisfies Meta<typeof JourneyCard>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
