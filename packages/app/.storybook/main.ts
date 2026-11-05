import type { StorybookConfig } from "@storybook/react-vite";

/** The application's internal catalog, separate from the viewer and design system. */
const config: StorybookConfig = {
  stories: ["../src/**/*.stories.tsx"],
  framework: {
    name: "@storybook/react-vite",
    options: { builder: { viteConfigPath: ".storybook/vite.config.ts" } },
  },
  addons: ["@storybook/addon-docs", "@storybook/addon-a11y"],
  staticDirs: [{ from: "../../../examples/solid-oidc", to: "/solid-oidc" }],
  core: { disableTelemetry: true },
};
export default config;
