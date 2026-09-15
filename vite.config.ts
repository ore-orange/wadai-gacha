import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    watch: {
      // Docker (macOS / Windows) でファイル変更が検知されない場合のフォールバック
      usePolling: process.env.VITE_USE_POLLING === "true",
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
  },
});
