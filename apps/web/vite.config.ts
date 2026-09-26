import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { "/api": { target: "http://localhost:8787", changeOrigin: true } },
  },
  preview: {
    port: 4173,
    proxy: { "/api": { target: "http://localhost:8787", changeOrigin: true } },
  },
  build: {
    target: "es2022",
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("three") || id.includes("@react-three") || id.includes("postprocessing")) return "three";
          return undefined;
        },
      },
    },
  },
});
