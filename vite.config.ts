import { defineConfig } from "vite";
export default defineConfig({
  base: "./",
  optimizeDeps: { entries: ['index.html'] },
  build: { assetsInlineLimit: 5 * 1024 * 1024 },
});
