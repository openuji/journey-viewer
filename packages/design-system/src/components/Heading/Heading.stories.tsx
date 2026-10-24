import type { Meta, StoryObj } from "@storybook/react-vite";
import { Heading } from "@/components/Heading/Heading";
import { createHeadingFixture } from "@/components/Heading/Heading.fixtures";

const meta = {
  title: "Primitives/Heading",
  component: Heading,
  tags: ["autodocs"],
  args: createHeadingFixture(),
} satisfies Meta<typeof Heading>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const SizesAndLevels: Story = {
  render: () => (
    <div className="story-stack">
      {([1, 2, 3, 4, 5, 6] as const).map((level) => (
        <Heading
          key={level}
          {...createHeadingFixture({
            level,
            size: level < 3 ? "lg" : level < 5 ? "md" : level < 6 ? "sm" : "xs",
            children: `Semantic heading level ${level}`,
          })}
        />
      ))}
    </div>
  ),
};
