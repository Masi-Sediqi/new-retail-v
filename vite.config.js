import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "./",
  cacheDir: "node_modules/.vite-afghan-power",
  plugins: [react()],
  build: {
    sourcemap: false
  }
});
