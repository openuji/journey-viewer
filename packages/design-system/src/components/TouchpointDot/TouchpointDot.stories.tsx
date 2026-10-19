import type { Meta, StoryObj } from "@storybook/react-vite";
import { TouchpointDot } from "./TouchpointDot.js";
import { createTouchpointDotFixture } from "./TouchpointDot.fixtures.ts";

const meta = {
  title: "Hierarchy/TouchpointDot",
  component: TouchpointDot,
  tags: ["autodocs"],
  args: createTouchpointDotFixture(),
} satisfies Meta<typeof TouchpointDot>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
