import type { Meta, StoryObj } from "@storybook/react-vite";
import { ScreenThumbnail } from "@/components/ScreenThumbnail/ScreenThumbnail";
import { ScreenImage } from "@/components/ScreenImage/ScreenImage";
import { createScreenThumbnailFixture } from "@/components/ScreenThumbnail/ScreenThumbnail.fixtures";
import { createScreenImageFixture } from "@/components/ScreenImage/ScreenImage.fixtures";
const meta = {
  title: "Screens/ScreenThumbnail",
  component: ScreenThumbnail,
  tags: ["autodocs"],
  args: {
    ...createScreenThumbnailFixture(),
    onOpen: () => {},
    children: (
      <ScreenImage
        {...createScreenImageFixture()}
        onLoad={() => {}}
        onError={() => {}}
      />
    ),
  },
  decorators: [
    (Story) => (
      <div style={{ inlineSize: "18rem" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ScreenThumbnail>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Unavailable: Story = {
  render: () => (
    <ScreenThumbnail label="Sign-in screen">
      <ScreenImage
        {...createScreenImageFixture({
          source: undefined,
          status: "unavailable",
        })}
        onLoad={() => {}}
        onError={() => {}}
      />
    </ScreenThumbnail>
  ),
};
