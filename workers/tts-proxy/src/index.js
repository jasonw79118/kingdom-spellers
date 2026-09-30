// Serverless text-to-speech proxy for Kingdom Spellers.
//
// Why this exists: the browser's Web Speech API can only use voices installed on
// the device, so on many machines the app falls back to a robotic voice. A cloud
// neural voice fixes that, but calling ElevenLabs straight from the page means
// shipping the API key inside the public JavaScript bundle, where anyone can read
// it and spend the account's monthly credits.
//
// This worker holds the key as a server-side secret and hands back audio. The key
// never reaches the browser.
//
// Requests are small and infrequent — the app caches every clip permanently, so
// each word is generated once per device, not once per replay.
//
// Contract:
//   POST /        { "text": "elephant", "voice": "<id>", "speed": 0.95, "provider": "elevenlabs" }
//   GET  /health  -> { "ok": true }
//   Success: 200, Content-Type: audio/mpeg, raw MP3 body
//
// See README.md in this folder for deployment.

const DEFAULT_VOICE = "EXAVITQu4vr4xnSDxMaL"; // Sarah — warm, clear female (US)

// Only voices confirmed to work on the free plan. ElevenLabs returns 402 for the
// rest ("Free users cannot use library voices via the API"), so allowing them
// through would just burn requests on guaranteed failures.
const ALLOWED_VOICES = new Set([
  "EXAVITQu4vr4xnSDxMaL", // Sarah
  "pNInz6obpgDQGcFmaJgB", // Elli
  "XrExE9yKIg1WjnnlVkGX", // Lily
  "Xb7hH8MSUJpSbSDYk0k2", // Alice
  "IKne3meq5aSn9XLyUdCD", // Charlotte
  "nPczCjzI2devNBz1zQrb", // Brian
  "VR6AewLTigWG4xSOukaG", // Arnold
  "onwK4e9ZLuTAKqWW03F9", // Daniel
]);

// Spelling words and short definitions only. Keeps one request cheap and makes
// the worker useless for turning it into a general-purpose speech service.
const MAX_CHARS = 400;

const MODELS = new Set(["eleven_flash_v2_5", "eleven_multilingual_v2", "eleven_turbo_v2_5"]);

// Origins allowed to call this. CORS stops other web pages from using it, but a
// determined caller can still hit the URL directly — hence the rate limit and
// input caps as well.
const ALLOWED_ORIGINS = new Set([
  "https://jasonw79118.github.io",
  "http://localhost:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001",
]);

// ---------------------------------------------------------------------------
// Rate limiting (best effort, per isolate)
// ---------------------------------------------------------------------------
// Simple in-memory window counter. Cloudflare isolates this per location rather
// than globally, so treat it as a brake against casual abuse, not a hard limit.
// For a strict global cap, put a Cloudflare rate-limiting rule in front of this.
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 60;
const hits = new Map();

function rateLimited(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  list.push(now);
  hits.set(ip, list);

  // Opportunistic cleanup so the map cannot grow without bound.
  if (hits.size > 5000) {
    for (const [k, v] of hits) {
      if (!v.length || now - v[v.length - 1] > WINDOW_MS) hits.delete(k);
    }
  }
  return list.length > MAX_PER_WINDOW;
}

function json(body, status, origin) {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  };
  if (origin) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers.Vary = "Origin";
  }
  return new Response(JSON.stringify(body), { status, headers });
}

function isOriginAllowed(request) {
  const origin = request.headers.get("Origin");
  // Same-origin / server-to-server calls send no Origin header. Those are
  // allowed through and still subject to the rate limit and input caps.
  if (!origin) return true;
  return ALLOWED_ORIGINS.has(origin);
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin");
    const allowed = isOriginAllowed(request);

    // Preflight, for browsers calling this cross-origin.
    if (request.method === "OPTIONS") {
      if (!allowed) return new Response("Forbidden", { status: 403 });
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": origin,
          "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Max-Age": "86400",
          Vary: "Origin",
        },
      });
    }

    if (request.method === "GET") {
      if (new URL(request.url).pathname === "/health") {
        return json(
          { ok: true, configured: Boolean(env.ELEVENLABS_API_KEY) },
          200,
          allowed ? origin : null
        );
      }
      return json({ error: "Not found. POST to / to synthesise speech." }, 404, allowed ? origin : null);
    }

    if (request.method !== "POST") {
      return json({ error: "Use POST." }, 405, allowed ? origin : null);
    }

    if (!allowed) {
      return json({ error: "Origin not allowed." }, 403, null);
    }

    if (!env.ELEVENLABS_API_KEY) {
      return json(
        { error: "Server not configured. Set the ELEVENLABS_API_KEY secret." },
        500,
        origin
      );
    }

    const ip =
      request.headers.get("CF-Connecting-IP") ||
      request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ||
      "unknown";
    if (rateLimited(ip)) {
      return json(
        { error: "Too many requests. Wait a minute and try again." },
        429,
        origin
      );
    }

    // --- validate ---------------------------------------------------------
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Body must be JSON." }, 400, origin);
    }

    const text = typeof body.text === "string" ? body.text.trim() : "";
    if (!text) return json({ error: "Missing text." }, 400, origin);
    if (text.length > MAX_CHARS) {
      return json({ error: `Text too long (max ${MAX_CHARS} characters).` }, 400, origin);
    }
    // Reject control characters; they have no place in a spelling word.
    if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(text)) {
      return json({ error: "Unsupported characters in text." }, 400, origin);
    }

    const provider = body.provider === "google" ? "google" : "elevenlabs";
    const voice = ALLOWED_VOICES.has(body.voice) ? body.voice : DEFAULT_VOICE;

    let speed = Number(body.speed);
    if (!Number.isFinite(speed)) speed = 0.95;
    speed = Math.max(0.7, Math.min(1.2, speed));

    const model = MODELS.has(body.model) ? body.model : "eleven_flash_v2_5";

    // --- call the provider ------------------------------------------------
    let upstream;
    try {
      upstream = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voice)}`,
        {
          method: "POST",
          headers: {
            "xi-api-key": env.ELEVENLABS_API_KEY,
            "Content-Type": "application/json",
            Accept: "audio/mpeg",
          },
          body: JSON.stringify({
            text,
            model_id: model,
            voice_settings: {
              stability: 0.7,
              similarity_boost: 0.8,
              style: 0,
              use_speaker_boost: true,
              speed,
            },
          }),
        }
      );
    } catch {
      return json({ error: "Could not reach the speech service." }, 502, origin);
    }

    if (!upstream.ok) {
      let detail = `Speech service error ${upstream.status}`;
      try {
        const info = await upstream.json();
        const d = info?.detail;
        detail = (typeof d === "string" ? d : d?.message) || detail;
      } catch { /* not json */ }

      if (upstream.status === 401) {
        console.error("Upstream rejected the key — check the ELEVENLABS_API_KEY secret.");
      }
      // Pass through the status so the client can distinguish quota (402) from
      // a bad request (400) from rate limiting (429).
      return json(
        { error: detail, status: upstream.status },
        upstream.status === 401 ? 500 : upstream.status,
        origin
      );
    }

    // Raw audio out. Smaller than base64 and the client can play it directly.
    return new Response(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": upstream.headers.get("Content-Length") || "",
        // Safe to cache: the response depends only on text/voice/speed.
        "Cache-Control": "public, max-age=31536000, immutable",
        "Access-Control-Allow-Origin": origin,
        Vary: "Origin",
      },
    });
  },
};
