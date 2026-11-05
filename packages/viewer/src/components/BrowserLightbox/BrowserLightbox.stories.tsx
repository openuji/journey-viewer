import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button, ScreenLightbox } from "@journey-viewer/design-system";
import { BrowserLightbox } from "@/components/BrowserLightbox/BrowserLightbox";
import { BrowserScreenImage } from "@/browser/BrowserScreenImage";
import { oidcScreenshots } from "~/.storybook/screenshots";
import { LightboxShapes } from "~/.storybook/LightboxShapes";

const screens = Object.values(oidcScreenshots).slice(0, 3);

/** Opens three screens in the lightbox; arrows step, Escape or the backdrop closes. */
function ThreeScreens() {
  const [open, setOpen] = useState<number | null>(null);
  const step = (by: number) =>
    setOpen((index) =>
      index === null ? index : (index + by + screens.length) % screens.length,
    );
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(0)}>
        Open screenshot viewer
      </Button>
      {open !== null && (
        <BrowserLightbox
          onClose={() => setOpen(null)}
          onPrevious={() => step(-1)}
          onNext={() => step(1)}
        >
          <ScreenLightbox
            title={`Screen ${open + 1}`}
            context="Solid-OIDC concept screens"
            position={`${open + 1} of ${screens.length}`}
            canStep
            onPrevious={() => step(-1)}
            onNext={() => step(1)}
            onClose={() => setOpen(null)}
          >
            <BrowserScreenImage
              source={screens[open]}
              label={`Screen ${open + 1}`}
              fit="contain"
            />
          </ScreenLightbox>
        </BrowserLightbox>
      )}
    </>
  );
}

/**
 * The only modal boundary: a native dialog with inert page, Tab kept inside, arrow keys stepping
 * and focus returned to the opener on close.
 */
const meta = {
  title: "Viewer/BrowserLightbox",
  parameters: { layout: "padded" },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const ThreeScreensFromAButton: Story = {
  render: () => <ThreeScreens />,
};

export const MixedShapes: Story = { render: () => <LightboxShapes /> };
