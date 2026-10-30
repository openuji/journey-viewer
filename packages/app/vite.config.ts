import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The library: the application's components and policy, with its dependencies left to the consumer.
export default defineConfig({
  plugins: [react()],
  resolve: {
    // Mirrors tsconfig.json "paths" for Vite.
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  build: {
    lib: {
      entry: "src/index.ts",
      formats: ["es"],
      fileName: "index",
      cssFileName: "styles",
    },
    rolldownOptions: {
      external: [
        "react",
        "react/jsx-runtime",
        "@journey-viewer/ujg-jsonld",
        "@journey-viewer/lint",
        "@journey-viewer/lint/ujg",
        "@journey-viewer/design-system",
        "@journey-viewer/viewer",
      ],
    },
  },
});
