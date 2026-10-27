import type { Preview } from "@storybook/react-vite";
import "@journey-viewer/design-system/styles.css";
import "@journey-viewer/viewer/styles.css";
import "~/.storybook/preview.css";

const preview: Preview = {
  globalTypes: {
    theme: {
      description: "Scoped component theme",
      toolbar: {
        icon: "paintbrush",
        items: ["light", "dark"],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: "light" },
  decorators: [
    (Story, context) => (
      <div data-jv-theme={context.globals.theme} className="flow-story">
        <Story />
      </div>
    ),
  ],
  parameters: { layout: "fullscreen", a11y: { test: "error" } },
};
export default preview;
