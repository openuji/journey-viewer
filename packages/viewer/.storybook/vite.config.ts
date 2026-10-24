import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [tailwindcss()],
  resolve: {
    // Mirrors tsconfig.json "paths" for Vite and Tailwind's CSS resolver.
    alias: [
      {
        find: "~/examples",
        replacement: fileURLToPath(
          new URL("../../../examples", import.meta.url),
        ),
      },
      {
        find: "@",
        replacement: fileURLToPath(new URL("../src", import.meta.url)),
      },
      { find: "~", replacement: fileURLToPath(new URL("..", import.meta.url)) },
    ],
  },
});
