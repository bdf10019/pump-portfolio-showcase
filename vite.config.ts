import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  build: {
    target: "es2022",
    sourcemap: true,
    rollupOptions: {
      input: {
        story: resolve(process.cwd(), "index.html"),
        viewer: resolve(process.cwd(), "viewer.html"),
      },
    },
  },
});
