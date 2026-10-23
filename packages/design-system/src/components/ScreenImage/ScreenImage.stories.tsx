import type { Meta, StoryObj } from "@storybook/react-vite";
import { ScreenImage } from "./ScreenImage.js";
import { createScreenImageFixture } from "./ScreenImage.fixtures.ts";
const meta = { title: "Screens/ScreenImage", component: ScreenImage, tags: ["autodocs"],
  args: { ...createScreenImageFixture(), onLoad: () => {}, onError: () => {} },
  decorators: [(Story) => <div style={{ inlineSize: "10rem" }}><Story /></div>],
} satisfies Meta<typeof ScreenImage>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Ready: Story = {};
export const Loading: Story = { args: { status: "loading" } };
export const Unavailable: Story = { args: { source: undefined, status: "unavailable" } };
export const FitHeight: Story = {
  args: { fit: "height" },
  decorators: [(Story) => <div style={{ ["--jv-screen-image-height" as string]: "16rem" }}><Story /></div>],
};
