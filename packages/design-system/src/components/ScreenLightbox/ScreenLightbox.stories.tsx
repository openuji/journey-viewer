import type { Meta, StoryObj } from "@storybook/react-vite";
import { ScreenLightbox } from "@/components/ScreenLightbox/ScreenLightbox";
import { ScreenImage } from "@/components/ScreenImage/ScreenImage";
import { createScreenLightboxFixture } from "@/components/ScreenLightbox/ScreenLightbox.fixtures";
import { createScreenImageFixture } from "@/components/ScreenImage/ScreenImage.fixtures";
const meta = {
  title: "Screens/ScreenLightbox",
  component: ScreenLightbox,
  tags: ["autodocs"],
  args: {
    ...createScreenLightboxFixture(),
    onPrevious: () => {},
    onNext: () => {},
    onClose: () => {},
    children: (
      <ScreenImage
        {...createScreenImageFixture({ fit: "height" })}
        onLoad={() => {}}
        onError={() => {}}
      />
    ),
  },
  decorators: [
    (Story) => (
      <div style={{ background: "var(--jv-color-scrim)", padding: "1rem" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ScreenLightbox>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Unavailable: Story = {
  args: {
    canStep: false,
    position: "Screenshot unavailable",
    children: (
      <ScreenImage
        {...createScreenImageFixture({
          source: undefined,
          status: "unavailable",
          fit: "height",
        })}
        onLoad={() => {}}
        onError={() => {}}
      />
    ),
  },
};
