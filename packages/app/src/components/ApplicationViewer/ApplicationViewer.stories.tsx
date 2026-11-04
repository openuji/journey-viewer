import type { Meta, StoryObj } from "@storybook/react-vite";
import { ApplicationViewer } from "@/components/ApplicationViewer/ApplicationViewer";
import {
  emptyGraph,
  oidcGraph,
  oidcScreenshots,
  oidcTouchpoints,
} from "~/.storybook/fixtures";

const meta = {
  title: "App/ApplicationViewer",
  component: ApplicationViewer,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    controls: { exclude: ["graph", "screenshots", "touchpoints"] },
  },
  args: {
    graph: oidcGraph,
    screenshots: oidcScreenshots,
    touchpoints: oidcTouchpoints,
  },
} satisfies Meta<typeof ApplicationViewer>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Screens: Story = {};
export const DocumentOnly: Story = {
  args: { screenshots: {}, touchpoints: {} },
};
export const Empty: Story = {
  args: { graph: emptyGraph, screenshots: {}, touchpoints: {} },
};
