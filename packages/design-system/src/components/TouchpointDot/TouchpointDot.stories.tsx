import type { Meta, StoryObj } from "@storybook/react-vite";
import { TouchpointDot } from "@/components/TouchpointDot/TouchpointDot";
import { createTouchpointDotFixture } from "@/components/TouchpointDot/TouchpointDot.fixtures";

const meta = {
  title: "Hierarchy/TouchpointDot",
  component: TouchpointDot,
  tags: ["autodocs"],
  args: createTouchpointDotFixture(),
} satisfies Meta<typeof TouchpointDot>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
