import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The prebuilt static site the CLI copies. A relative base lets it run from any folder.
export default defineConfig({
  root: fileURLToPath(new URL("./src/site", import.meta.url)),
  base: "./",
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  build: {
    outDir: fileURLToPath(new URL("./dist/site", import.meta.url)),
    emptyOutDir: true,
    // `generate --inline` can only be a single file when dynamic imports stay in the entry chunk.
    rollupOptions: { output: { codeSplitting: false } },
  },
});
