import type { Meta, StoryObj } from "@storybook/react-vite";
import { JourneyCard } from "./JourneyCard.js";
import { createJourneyCardFixture } from "./JourneyCard.fixtures.ts";
import { StateRow } from "../StateRow/StateRow.js";
import { createStateRowFixture } from "../StateRow/StateRow.fixtures.ts";

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
