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

const named = [
  { id: "urn:example:web", label: "Web", color: "var(--jv-color-category-blue)" },
  { id: "urn:example:phone", label: "Phone", color: "var(--jv-color-category-teal)" },
] as const;
export const SeveralTouchpoints: Story = { render: () => <JourneyHead title="Account access" count="4 states" touchpoints={named} /> };
export const ColumnCrumb: Story = {
  render: () => <JourneyHead title="Account access" count="4" touchpoints={named.slice(0, 1)} crumb="Root journey / Account access" />,
};
export const Matched: Story = { render: () => <JourneyHead title="Account access" count="4 states" touchpoints={named.slice(0, 1)} matched /> };
export const Filtered: Story = { args: { filtered: true } };
