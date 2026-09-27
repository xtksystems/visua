import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

/** The 3D stack: three.js, react-three-fiber and drei with the packages they bring. */
const THREE = /[\\/]node_modules[\\/](three|@react-three[\\/][^\\/]+|postprocessing|three-stdlib|camera-controls|troika-[^\\/]+|maath|meshline|stats-gl|three-mesh-bvh|@monogrid[\\/]gainmap-js|hls\.js|suspend-react|its-fine|detect-gpu|tunnel-rat|n8ao|@use-gesture[\\/][^\\/]+)[\\/]/;

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
    rolldownOptions: {
      output: {
        // The 3D stack in its own chunk, loaded by the 3D pages only; other packages in
        // "vendor". The vendor group goes first so shared packages (React itself) are not
        // pulled into the 3D chunk as its dependencies: every page, sign-in included, then
        // loaded 1.1 MB of three.js.
        codeSplitting: {
          groups: [
            { name: "vendor", test: (id: string) => /[\\/]node_modules[\\/]/.test(id) && !THREE.test(id), priority: 20 },
            { name: "three", test: THREE, priority: 10 },
          ],
        },
      },
    },
  },
});
