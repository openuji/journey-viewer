import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // Mirrors tsconfig.json "paths" for Vite and Tailwind's CSS resolver.
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
        "@journey-viewer/design-system",
      ],
    },
  },
});
