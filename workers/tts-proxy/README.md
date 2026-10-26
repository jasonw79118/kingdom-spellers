# Shared Kingdom Spellers reading voice

Production endpoint: https://kingdom-spellers-tts.jasonw79118.workers.dev

The public endpoint is set in the repository's .env.production so every production browser uses the same service. ElevenLabs credentials belong only in the worker's encrypted ELEVENLABS_API_KEY secret. Local demo mode does not load .env.production. Parent accounts and spelling history are unaffected.

To configure or rotate the server-side key, run from this directory:

    npx wrangler secret put ELEVENLABS_API_KEY

Paste the key into that command's private input, never into chat, source files, command-line arguments or VITE_ configuration. Existing desktop-only Reading voice credentials are not copied automatically to the server. Never commit a real credential.

Health check (reveals only whether a secret is configured):

    curl https://kingdom-spellers-tts.jasonw79118.workers.dev/health

After configuration, verify a real short-word MP3 response, then verify Hear word and game effects on an iPhone before and after backgrounding Safari. A healthy endpoint with configured=true does not by itself prove valid provider credentials or remaining credits.

Deploy worker code with:

    npx wrangler deploy

The worker accepts ElevenLabs requests for short words/definitions, validates input and allowed voices, bounds upstream time, applies a best-effort per-IP rate limit, and returns raw MP3 with CORS for the existing website domains. It rejects unrelated browser origins and Google requests. The client retains its local-voice fallback when cloud delivery fails. No database migration is involved.

Run `npm run test:tts-proxy` from the project root for input validation, custom-domain CORS, missing credentials, upstream isolation and safe failure tests. The local one-time key-entry helper binds only to 127.0.0.1, uses a random access token and same-origin checks, never persists the key, and sends it through stdin to Wrangler's encrypted-secret command. Its code and status live in ignored scratch directories and are not part of the public website.
