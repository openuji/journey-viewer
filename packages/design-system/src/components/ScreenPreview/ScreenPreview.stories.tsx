import type { Meta, StoryObj } from "@storybook/react-vite";
import { ScreenPreview } from "./ScreenPreview.js";
import { ScreenImage } from "../ScreenImage/ScreenImage.js";
import { createScreenPreviewFixture } from "./ScreenPreview.fixtures.ts";
import { createScreenImageFixture } from "../ScreenImage/ScreenImage.fixtures.ts";
const meta = { title: "Screens/ScreenPreview", component: ScreenPreview, tags: ["autodocs"],
  args: { ...createScreenPreviewFixture(), style: { position: "relative" }, children: <ScreenImage {...createScreenImageFixture()} onLoad={() => {}} onError={() => {}} /> },
} satisfies Meta<typeof ScreenPreview>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Unavailable: Story = { args: { context: "Screenshot unavailable.", children: <ScreenImage {...createScreenImageFixture({ source: undefined, status: "unavailable" })} onLoad={() => {}} onError={() => {}} /> } };
export const LongContent: Story = { args: { title: "Averylongunbrokenstatelabelthatmustwrapwithoutoverflowingtheavailablemobilewidth" } };
