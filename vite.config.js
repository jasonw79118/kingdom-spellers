import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";

/**
 * Dev-only: let the running app dump the village SVG to disk so it can be
 * rasterised and looked at. This middleware is registered with `apply: "serve"`
 * so it is not part of the production bundle in any way.
 */
function snapshotEndpoint() {
  return {
    name: "ks-snapshot-endpoint",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use("/__snap", (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          return res.end("POST only");
        }
        let body = "";
        req.on("data", (c) => {
          body += c;
        });
        req.on("end", () => {
          const name = (req.url || "/scene.svg").replace(/[^a-z0-9._-]/gi, "") || "scene.svg";
          const dir = path.resolve(".snap");
          fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(path.join(dir, name), body, "utf8");
          res.setHeader("content-type", "text/plain");
          res.end(path.join(dir, name));
        });
      });
    },
  };
}

// The custom domain serves the app at the root.
// Override with VITE_BASE for a GitHub Pages project-subpath deployment.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_BASE");
  return {
    plugins: [react(), snapshotEndpoint()],
    base: env.VITE_BASE || "/",
    build: {
      outDir: "build",
      sourcemap: false,
    },
    server: {
      port: 3000,
      host: true,
    },
  };
});
