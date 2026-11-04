import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

export default defineConfig({
  resolve: {
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
