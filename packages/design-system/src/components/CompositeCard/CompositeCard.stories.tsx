import type { Meta, StoryObj } from "@storybook/react-vite";
import { CompositeCard } from "@/components/CompositeCard/CompositeCard";
import { createCompositeCardFixture } from "@/components/CompositeCard/CompositeCard.fixtures";

const meta = {
  title: "Flow/CompositeCard",
  component: CompositeCard,
  args: {
    ...createCompositeCardFixture(),
    onSelect: () => undefined,
    onToggle: () => undefined,
  },
  // The layout's size for these lines: padding, 17px title lines and 16px caption lines.
  render: (args) => (
    <div
      style={{
        inlineSize: 236,
        blockSize: 22 + args.title.length * 17 + args.caption.length * 16,
      }}
    >
      <CompositeCard
        {...args}
        style={{ inlineSize: "100%", blockSize: "100%" }}
      />
    </div>
  ),
} satisfies Meta<typeof CompositeCard>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Closed: Story = {};
export const Selected: Story = {
  args: createCompositeCardFixture({ selected: true }),
};
export const LeadsIntoSelection: Story = {
  args: createCompositeCardFixture({ tone: "incoming" }),
};
export const RepeatsAnEnclosingJourney: Story = {
  args: createCompositeCardFixture({
    toggle: null,
    caption: ["IdP auth flow (repeats an", "enclosing journey)"],
  }),
};
export const NoChildJourney: Story = {
  args: createCompositeCardFixture({
    toggle: null,
    caption: ["No child journey"],
  }),
};
/** Open: the card heads its frame, with the frame's hairline as its border. */
export const Heading: Story = {
  args: createCompositeCardFixture({
    toggle: "collapse",
    heading: true,
    current: true,
  }),
};
export const HeadingSelected: Story = {
  args: createCompositeCardFixture({
    toggle: "collapse",
    heading: true,
    selected: true,
  }),
};
