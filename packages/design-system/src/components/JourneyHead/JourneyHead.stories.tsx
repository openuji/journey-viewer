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

export const SeveralTouchpoints: Story = { args: { touchpoints: [
  { id: "urn:example:web", label: "Web", color: "var(--jv-color-category-blue)" },
  { id: "urn:example:phone", label: "Phone", color: "var(--jv-color-category-teal)" },
] } };
