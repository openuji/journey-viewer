import type { Meta, StoryObj } from "@storybook/react-vite";
import { Text } from "./Text.js";
import { createTextFixture } from "./Text.fixtures.ts";

const meta = {
  title: "Primitives/Text",
  component: Text,
  tags: ["autodocs"],
  args: createTextFixture(),
} satisfies Meta<typeof Text>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Tones: Story = {
  render: () => (
    <div className="story-inline">
      {(["default", "muted", "subtle", "entry", "exit"] as const).map(
        (tone) => (
          <Text key={tone} {...createTextFixture({ tone, children: tone })} />
        ),
      )}
    </div>
  ),
};
export const Roles: Story = {
  render: () => (
    <div className="story-stack">
      {(["body", "label", "caption", "code"] as const).map((variant) => (
        <Text
          key={variant}
          {...createTextFixture({
            variant,
            as: variant === "code" ? "code" : "p",
            children: `${variant}: shared typography`,
          })}
        />
      ))}
    </div>
  ),
};
