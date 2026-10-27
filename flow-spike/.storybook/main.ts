import { fileURLToPath } from "node:url";
import type { StorybookConfig } from "@storybook/react-vite";

const at = (path: string) => fileURLToPath(new URL(path, import.meta.url));

/** The spike's own catalog; it imports only the libraries' built public exports. */
const config: StorybookConfig = {
  stories: ["../src/**/*.stories.tsx"],
  framework: "@storybook/react-vite",
  addons: ["@storybook/addon-a11y"],
  staticDirs: [{ from: "../../examples/solid-oidc", to: "/solid-oidc" }],
  core: { disableTelemetry: true },
  async viteFinal(config) {
    return {
      ...config,
      resolve: {
        ...config.resolve,
        // Mirrors tsconfig.json "paths"; the most specific aliases come first.
        alias: [
          { find: "~/examples", replacement: at("../../examples") },
          { find: "~/packages", replacement: at("../../packages") },
          { find: "@", replacement: at("../src") },
          { find: "~", replacement: at("..") },
        ],
        dedupe: ["react", "react-dom"],
      },
      server: { ...config.server, fs: { allow: [at("../..")] } },
    };
  },
};
export default config;
