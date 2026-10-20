import type { Meta, StoryObj } from "@storybook/react-vite";
import { ScreenLightbox } from "./ScreenLightbox.js";
import { ScreenImage } from "../ScreenImage/ScreenImage.js";
import { createScreenLightboxFixture } from "./ScreenLightbox.fixtures.ts";
import { createScreenImageFixture } from "../ScreenImage/ScreenImage.fixtures.ts";
const meta = { title: "Screens/ScreenLightbox", component: ScreenLightbox, tags: ["autodocs"],
  args: { ...createScreenLightboxFixture(), onPrevious: () => {}, onNext: () => {}, onClose: () => {},
    children: <ScreenImage {...createScreenImageFixture()} onLoad={() => {}} onError={() => {}} /> },
} satisfies Meta<typeof ScreenLightbox>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Unavailable: Story = { args: { canStep: false, position: "Screenshot unavailable", children: <ScreenImage {...createScreenImageFixture({ source: undefined, status: "unavailable" })} onLoad={() => {}} onError={() => {}} /> } };
