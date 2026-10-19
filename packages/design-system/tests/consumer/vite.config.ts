import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

// This consumer deliberately has no Tailwind plugin or design-system source alias.
export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  base: "/consumer/",
  build: { outDir: "../../.test-output/consumer", emptyOutDir: true },
});
