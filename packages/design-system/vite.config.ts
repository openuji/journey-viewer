import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    lib: {
      entry: "src/entry.ts",
      formats: ["es"],
      fileName: "index",
      cssFileName: "styles",
    },
    rolldownOptions: { external: ["react", "react/jsx-runtime"] },
  },
});
