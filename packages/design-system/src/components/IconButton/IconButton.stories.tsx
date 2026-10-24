import type { Meta, StoryObj } from "@storybook/react-vite";
import { IconButton } from "@/components/IconButton/IconButton";
import { createIconButtonFixture } from "@/components/IconButton/IconButton.fixtures";
const icon = (
  <svg viewBox="0 0 16 16" fill="none">
    <path d="M3 8h10M8 3v10" stroke="currentColor" />
  </svg>
);

const meta = {
  title: "Primitives/IconButton",
  component: IconButton,
  tags: ["autodocs"],
  args: { ...createIconButtonFixture(), icon },
  render: (args) => <IconButton {...args} icon={icon} />,
} satisfies Meta<typeof IconButton>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
