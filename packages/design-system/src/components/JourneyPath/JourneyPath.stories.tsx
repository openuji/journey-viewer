import type { Meta, StoryObj } from "@storybook/react-vite";
import { JourneyPath } from "@/components/JourneyPath/JourneyPath";
import {
  createJourneyPathFixture,
  createJourneyPathRootsFixture,
} from "@/components/JourneyPath/JourneyPath.fixtures";
import type { JourneyPathFixture } from "@/components/JourneyPath/JourneyPath.fixtures";

const withSelect = (
  fixture: JourneyPathFixture = createJourneyPathFixture(),
) => ({
  ...fixture,
  items: fixture.items.map(({ choices, ...item }) => ({
    ...item,
    ...(choices
      ? {
          choices: choices.map((choice) => ({
            ...choice,
            onSelect: () => undefined,
          })),
        }
      : {}),
    onSelect: () => undefined,
  })),
});

const meta = {
  title: "Flow/JourneyPath",
  component: JourneyPath,
  args: withSelect(),
} satisfies Meta<typeof JourneyPath>;
export default meta;
type Story = StoryObj<typeof meta>;
export const TwoJourneysOpen: Story = {};
/** Earlier steps give up width first; the current journey keeps its title longest. */
export const NarrowPath: Story = {
  render: (args) => (
    <div style={{ inlineSize: 320 }}>
      <JourneyPath {...args} />
    </div>
  ),
};
export const RootJourney: Story = {
  args: withSelect(
    createJourneyPathFixture({
      items: createJourneyPathFixture().items.slice(0, 1),
    }),
  ),
};
/** One root journey at a time: the chevron beside the root's title switches to another root. */
export const RootChoice: Story = {
  args: withSelect(createJourneyPathRootsFixture()),
};
/** The same switch on a path that goes deeper: the root stays a step back to its own journey. */
export const RootChoiceWithOpenJourney: Story = {
  args: withSelect({
    items: [
      ...createJourneyPathRootsFixture().items,
      ...createJourneyPathFixture().items.slice(1),
    ],
  }),
};
