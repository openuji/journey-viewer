import type { Meta, StoryObj } from "@storybook/react-vite";
import { FlowKey } from "@/components/FlowKey/FlowKey";
import { JourneyPath } from "@/components/JourneyPath/JourneyPath";
import { createJourneyPathFixture } from "@/components/JourneyPath/JourneyPath.fixtures";

const withSelect = (fixture = createJourneyPathFixture()) => ({
  ...fixture,
  items: fixture.items.map((item) => ({ ...item, onSelect: () => undefined })),
});

const meta = {
  title: "Flow/JourneyPath",
  component: JourneyPath,
  args: withSelect(),
} satisfies Meta<typeof JourneyPath>;
export default meta;
type Story = StoryObj<typeof meta>;
export const TwoJourneysOpen: Story = {};
export const RootJourney: Story = {
  args: withSelect(
    createJourneyPathFixture({
      items: createJourneyPathFixture().items.slice(0, 1),
    }),
  ),
};
/** Canvas controls at the bar's end. */
export const WithControls: Story = {
  args: { ...withSelect(), end: <FlowKey /> },
};
