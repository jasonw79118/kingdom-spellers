# Shared Kingdom Spellers reading voice

Production endpoint: https://kingdom-spellers-tts.jasonw79118.workers.dev

The public endpoint is set in the repository's .env.production so every production browser uses the same service. ElevenLabs credentials belong only in the worker's encrypted ELEVENLABS_API_KEY secret. Local demo mode does not load .env.production. Parent accounts and spelling history are unaffected.

The worker now binds the existing account-level Secrets Store entry `Elevenlabs_API_Key` through the runtime binding `ELEVENLABS_API_KEY`. The store ID and name are declared in wrangler.toml; the value stays in Cloudflare. Secrets Store bindings require asynchronous `.get()` resolution, which the worker performs before calling ElevenLabs. Legacy plain-string secrets remain supported for local development.

To rotate or correct the credential, update the VALUE of the existing `Elevenlabs_API_Key` entry in Cloudflare Secrets Store, retaining its Workers scope and name. Use the full API key from ElevenLabs, starting with `sk_`, not a key identifier or display name. Do not create a Worker secret with the same binding name while the Secrets Store binding is active. Never put the credential into VITE_ variables, source files or chat.

Health check (reveals only whether a secret is configured):

    curl https://kingdom-spellers-tts.jasonw79118.workers.dev/health

After configuration, verify a real short-word MP3 response, then verify Hear word and game effects on an iPhone before and after backgrounding Safari. A healthy endpoint with configured=true does not by itself prove valid provider credentials or remaining credits.

Deploy worker code with:

    npx wrangler deploy

The worker accepts ElevenLabs requests for short words/definitions, validates input and allowed voices, bounds upstream time, applies a best-effort per-IP rate limit, and returns raw MP3 with CORS for the existing website domains. It rejects unrelated browser origins and Google requests. The client retains its local-voice fallback when cloud delivery fails. No database migration is involved.

Run `npm run test:tts-proxy` from the project root for input validation, custom-domain CORS, missing credentials, upstream isolation and safe failure tests. The earlier one-time key-entry helper has been stopped and is superseded by the existing Secrets Store binding. Update that stored secret directly; no local paste page is required.
