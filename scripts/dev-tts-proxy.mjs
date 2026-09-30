// Local dev adapter: serves workers/tts-proxy on http://localhost:8787 so the
// client can be tested against the real worker logic without deploying.
//
//   node scripts/dev-tts-proxy.mjs
//
// Not part of the app build. The real deployment is `wrangler deploy` from
// workers/tts-proxy (see its README).

import { createServer } from "node:http";
import { readFileSync } from "node:fs";

const worker = (await import("../workers/tts-proxy/src/index.js")).default;

// Read the key from the environment, falling back to .env. Prefer the
// environment so the key never has to be written to a file:
//
//   ELEVENLABS_API_KEY=sk_... node scripts/dev-tts-proxy.mjs
const env = {};
try {
  for (const line of readFileSync(new URL("../.env", import.meta.url), "utf8").split("\n")) {
    const m = /^\s*([A-Z_][A-Z0-9_]*)=(.*)$/.exec(line);
    if (m) env[m[1]] = m[2].trim();
  }
} catch { /* .env optional */ }

const KEY = process.env.ELEVENLABS_API_KEY || env.ELEVENLABS_API_KEY || env.VITE_ELEVENLABS_API_KEY || "";
const envForWorker = { ELEVENLABS_API_KEY: KEY };

// localhost is not in the worker's allowlist on purpose, so map it here the way
// a real deployment's origin would arrive.
const server = createServer(async (req, res) => {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const body = Buffer.concat(chunks);

  const origin = req.headers.origin === "http://localhost:3000"
    ? "http://localhost:3000"
    : req.headers.origin;

  const request = new Request(`http://localhost:8787${req.url}`, {
    method: req.method,
    headers: { ...req.headers, origin, host: "localhost:8787" },
    body: ["GET", "HEAD"].includes(req.method) ? undefined : body,
  });

  const response = await worker.fetch(request, envForWorker);
  res.writeHead(response.status, Object.fromEntries(response.headers));
  if (response.body) {
    const buf = Buffer.from(await response.arrayBuffer());
    res.end(buf);
  } else {
    res.end();
  }
});

server.listen(8787, () => {
  console.log(`TTS proxy (dev) on http://localhost:8787 — key ${KEY ? "loaded" : "MISSING"}`);
});
