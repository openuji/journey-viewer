import type { Meta, StoryObj } from "@storybook/react-vite";
import { Badge } from "@/components/Badge/Badge";
import { createBadgeFixture } from "@/components/Badge/Badge.fixtures";

const meta = {
  title: "Primitives/Badge",
  component: Badge,
  tags: ["autodocs"],
  args: createBadgeFixture(),
} satisfies Meta<typeof Badge>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Tones: Story = {
  render: () => (
    <div className="story-inline">
      {(["default", "muted", "subtle", "entry", "exit"] as const).map(
        (tone) => (
          <Badge
            key={tone}
            {...createBadgeFixture({
              tone,
              children: tone,
              label: `${tone} badge`,
            })}
          />
        ),
      )}
    </div>
  ),
};
