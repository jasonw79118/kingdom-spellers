import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The app is deployed to GitHub Pages under a project subpath
// (https://jasonw79118.github.io/kingdom-spellers/), so the build
// base must match. Override with VITE_BASE if hosting elsewhere.
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE || "/kingdom-spellers/",
  build: {
    outDir: "build",
    sourcemap: false,
  },
  server: {
    port: 3000,
    host: true,
  },
});
