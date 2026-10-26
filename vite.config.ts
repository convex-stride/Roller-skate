import { defineConfig } from "vite";
export default defineConfig({
  base: "./",
  build: { assetsInlineLimit: 5 * 1024 * 1024 },
});
