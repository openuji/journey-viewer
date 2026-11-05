import type { Meta, StoryObj } from "@storybook/react-vite";
import { ScreenLightbox } from "@/components/ScreenLightbox/ScreenLightbox";
import { ScreenImage } from "@/components/ScreenImage/ScreenImage";
import { createScreenLightboxFixture } from "@/components/ScreenLightbox/ScreenLightbox.fixtures";
import { createScreenImageFixture } from "@/components/ScreenImage/ScreenImage.fixtures";
import { screenShapes } from "@/dev/screen-source";
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
        {...createScreenImageFixture({ fit: "contain" })}
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
          fit: "contain",
        })}
        onLoad={() => {}}
        onError={() => {}}
      />
    ),
  },
};

export const LongCaption: Story = {
  args: {
    title:
      "Recording; comment composer displays an error while microphone permission is pending",
    context:
      "Record and annotate a browser session / via Recording with page comments active / Add page comments / Session Recorder Chrome extension / ".repeat(
        4,
      ),
    position: "108 / 117 views · 2 of 2 call sites",
    sizingMode: "fit",
    onSizingModeChange: () => {},
  },
};

export const MixedShapes: Story = {
  render: (args) => (
    <div>
      {screenShapes.map(({ label, source }) => (
        <ScreenLightbox
          {...args}
          key={label}
          title={`${label} screenshot fixture`}
        >
          <ScreenImage
            source={source}
            label={label}
            status="ready"
            fit="contain"
            onLoad={() => {}}
            onError={() => {}}
          />
        </ScreenLightbox>
      ))}
    </div>
  ),
};
