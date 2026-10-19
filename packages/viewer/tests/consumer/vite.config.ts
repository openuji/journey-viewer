import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

// Build-only package/CSS smoke fixture, embedded in Storybook; no Tailwind or source aliases.
export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  base: "/viewer-consumer/",
  build: { outDir: "../../.test-output/consumer", emptyOutDir: true },
});
