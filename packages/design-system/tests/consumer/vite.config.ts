import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

// This consumer deliberately has no Tailwind plugin and imports the compiled package by
// name; the "~" alias only reaches development data such as the alternate theme.
export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  base: "/consumer/",
  resolve: { alias: { "~": fileURLToPath(new URL("../..", import.meta.url)) } },
  build: { outDir: "../../.test-output/consumer", emptyOutDir: true },
});
