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
      // `generated-site` is the Node-safe part the `journey-viewer` command reads.
      entry: {
        index: "src/index.ts",
        "generated-site": "src/generated-site.ts",
      },
      formats: ["es"],
      fileName: (_format, name) => `${name}.js`,
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
