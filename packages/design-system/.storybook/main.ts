import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.tsx", "./*.stories.tsx"],
  framework: {
    name: "@storybook/react-vite",
    options: { builder: { viteConfigPath: ".storybook/vite.config.ts" } },
  },
  addons: ["@storybook/addon-docs", "@storybook/addon-a11y"],
  staticDirs: [{ from: "../.test-output/consumer", to: "/consumer" }],
  core: { disableTelemetry: true },
};
export default config;
