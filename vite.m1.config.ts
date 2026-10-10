import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  build: {
    target: "es2022",
    sourcemap: true,
    outDir: "dist-m1",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        proof: resolve(process.cwd(), "m1-proofs.html"),
      },
    },
  },
});
