import type { StorybookConfig } from "@storybook/react-vite";
import designSystem from "../../design-system/.storybook/main.js";

/** Extend the internal design-system catalog; all additions stay in viewer development. */
const config: StorybookConfig = {
  ...designSystem,
  stories: [
    {
      directory: "../../design-system/src",
      files: "**/*.stories.tsx",
      titlePrefix: "Design system",
    },
    {
      directory: "../../design-system/.storybook",
      files: "*.stories.tsx",
      titlePrefix: "Design system",
    },
    "../src/**/*.stories.tsx",
  ],
  staticDirs: [
    { from: "../../design-system/.test-output/consumer", to: "/consumer" },
    { from: "../.test-output/consumer", to: "/viewer-consumer" },
  ],
};
export default config;
