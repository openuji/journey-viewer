import type { Meta, StoryObj } from "@storybook/react-vite";
import { Surface } from "@/components/Surface/Surface";
import { createSurfaceFixture } from "@/components/Surface/Surface.fixtures";
import { Text } from "@/components/Text/Text";

const meta = {
  title: "Primitives/Surface",
  component: Surface,
  tags: ["autodocs"],
  args: createSurfaceFixture(),
  render: (args) => (
    <Surface {...args} className="story-panel">
      <Text>Shared card and panel surface.</Text>
    </Surface>
  ),
} satisfies Meta<typeof Surface>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Variants: Story = {
  render: () => (
    <div className="story-stack">
      {(["sm", "lg", "full"] as const).map((radius) => (
        <Surface
          key={radius}
          {...createSurfaceFixture({
            radius,
            tone: radius === "full" ? "muted" : "default",
            raised: radius === "lg",
          })}
          className="story-panel"
        >
          <Text>{radius} surface</Text>
        </Surface>
      ))}
    </div>
  ),
};
