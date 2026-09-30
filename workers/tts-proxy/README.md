# TTS proxy (Cloudflare Worker)

Keeps the ElevenLabs API key **server-side** so it never appears in the app's
public JavaScript bundle.

## Why

The browser can only use voices installed on the device, so on many machines the
app falls back to a robotic computer voice. A cloud neural voice fixes that — but
calling ElevenLabs directly from the page means the key gets inlined into the
bundle, where anyone can read it via View Source and spend the account's monthly
credits.

This worker holds the key as a secret and returns audio. Requests are small and
infrequent because the app caches every clip permanently, so each word is
generated once per device rather than once per replay.

## Deploy

You need a free Cloudflare account.

```bash
npm install -g wrangler      # once
wrangler login               # opens a browser
cd workers/tts-proxy
```

**1. Set the key as a secret** (never in `wrangler.toml` or git):

```bash
wrangler secret put ELEVENLABS_API_KEY
# paste the sk_... value when prompted
```

**2. Deploy:**

```bash
wrangler deploy
```

It prints something like:

```
https://kingdom-spellers-tts.<your-subdomain>.workers.dev
```

**3. Point the app at it.** Either:

- add to `.env` and rebuild:
  ```
  VITE_TTS_PROXY=https://kingdom-spellers-tts.<your-subdomain>.workers.dev
  ```
- or paste it into the app under **Reading voice → Serverless proxy URL**, which
  needs no rebuild and is stored in that browser only.

**4. Rotate the key** on elevenlabs.io. The current one is still in the deployed
bundle from before this worker existed. Once the proxy is live, rebuilding drops
it from the bundle entirely.

## Verify

```bash
curl https://kingdom-spellers-tts.<your-subdomain>.workers.dev/health
# {"ok":true,"configured":true}

curl -o test.mp3 -X POST https://kingdom-spellers-tts.<your-subdomain>.workers.dev/ \
  -H "Content-Type: application/json" \
  -H "Origin: https://jasonw79118.github.io" \
  -d '{"text":"elephant","voice":"EXAVITGu4vr4xnSDxMaL"}'
file test.mp3    # should say MPEG audio
```

`configured: false` means the secret was never set — redo step 1.

## API

| Method | Path      | Purpose                                  |
|--------|-----------|------------------------------------------|
| `POST`  | `/`       | Synthesise speech                        |
| `GET`   | `/health` | Liveness + whether the secret is present |

Request body:

```json
{
  "text": "elephant",          // required, max 400 chars
  "voice": "EXAVITQu4vr4xnSDxMaL", // optional, defaults to Sarah
  "provider": "elevenlabs",    // optional
  "speed": 0.95,               // optional, clamped to 0.7–1.2
  "model": "eleven_flash_v2_5" // optional
}
```

Success returns `200` with `Content-Type: audio/mpeg` and raw MP3 bytes.

## Abuse protection

A public speech endpoint is worth limiting, so the worker enforces:

- **Origin allowlist** — the app's origin plus localhost. CORS stops other web
  pages, though not `curl`, which is why the rest exists.
- **Rate limit** — 60 requests/minute per IP. In-memory, so it is per Cloudflare
  isolate rather than global; treat it as a brake, not a hard guarantee. For a
  strict cap, add a Cloudflare rate-limiting rule in front of the worker.
- **Input caps** — 400 characters max, and control characters rejected, so it
  cannot be repurposed as a general speech service.
- **Voice allowlist** — only voices that work on the free plan. ElevenLabs
  returns `402` for the others, which would just waste requests. An unknown
  voice silently falls back to Sarah.

Responses are marked `immutable` and cacheable for a year, keyed by voice and
speed, so repeated words cost nothing.

## Cost

Cloudflare's free tier allows 100,000 requests/day — far beyond a family's use.
ElevenLabs' free tier allows 10,000 characters/month; the app's whole 699-word
dictionary is about 3,842 characters, generated once each thanks to the cache.
