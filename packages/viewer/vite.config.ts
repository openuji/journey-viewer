import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: "src/index.ts",
      formats: ["es"],
      fileName: "index",
      cssFileName: "styles",
    },
    rolldownOptions: {
      external: ["react", "react/jsx-runtime", "@journey-viewer/ujg-jsonld", "@journey-viewer/design-system"],
    },
  },
});
