import type { StorybookConfig } from "@storybook/react-vite";

/** The viewer's own internal catalog; it imports only the design system's public exports. */
const config: StorybookConfig = {
  stories: ["../src/**/*.stories.tsx"],
  framework: {
    name: "@storybook/react-vite",
    options: { builder: { viteConfigPath: ".storybook/vite.config.ts" } },
  },
  addons: ["@storybook/addon-docs", "@storybook/addon-a11y"],
  staticDirs: [
    { from: "../../../examples/solid-oidc", to: "/solid-oidc" },
    { from: "../.test-output/consumer", to: "/viewer-consumer" },
  ],
  core: { disableTelemetry: true },
};
export default config;
