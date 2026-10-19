import type { Preview } from "@storybook/react-vite";
import "./tailwind.css";
import "./generated/alternate.css";
import "./preview.css";

const preview: Preview = {
  globalTypes: {
    theme: {
      description: "Scoped component theme",
      toolbar: {
        icon: "paintbrush",
        items: ["light", "dark", "alternate"],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: "light" },
  decorators: [
    (Story, context) => (
      <div data-jv-theme={context.globals.theme} className="story-scope">
        <Story />
      </div>
    ),
  ],
  parameters: { layout: "padded", a11y: { test: "error" } },
};
export default preview;
