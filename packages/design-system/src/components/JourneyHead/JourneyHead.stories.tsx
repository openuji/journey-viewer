import type { Meta, StoryObj } from "@storybook/react-vite";
import { JourneyHead } from "./JourneyHead.js";
import { createJourneyHeadFixture } from "./JourneyHead.fixtures.ts";

const meta = {
  title: "Hierarchy/JourneyHead",
  component: JourneyHead,
  tags: ["autodocs"],
  args: createJourneyHeadFixture(),
} satisfies Meta<typeof JourneyHead>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
