import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

// Build-only package/CSS smoke fixture, embedded in Storybook; no Tailwind. It imports the
// compiled package by name; the "~" aliases only reach development data.
export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  base: "/viewer-consumer/",
  resolve: {
    alias: [
      {
        find: "~/examples",
        replacement: fileURLToPath(
          new URL("../../../../examples", import.meta.url),
        ),
      },
      {
        find: "~",
        replacement: fileURLToPath(new URL("../..", import.meta.url)),
      },
    ],
  },
  build: { outDir: "../../.test-output/consumer", emptyOutDir: true },
});
