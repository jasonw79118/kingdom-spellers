# Mobile audio, hairstyles and evolving dragons

Implementation reviewed October 26, 2026. Generated artwork created October 24.

## What changed

The wardrobe adds Neat crop, Swept quiff and Short coils for either avatar base. All previous hairstyle IDs and saved colors remain valid. Each new style uses its own generated grayscale painted hair layer, recolored by the existing renderer. Essential-art failure still falls back to the previous SVG renderer; new short hairstyles use its short-hair fallback rather than becoming bald.

Companions and race pets now use painted dragons. Existing saved IDs cat, dog, fox, rabbit and dragon are retained as Moss, Ember, Sun, Frost and Emerald visual identities, with existing race speeds, wins and ownership flags preserved. The shared renderer uses hue variants of one species and three distinct painted growth forms. Old animal SVG definitions remain in source for compatibility; they are no longer the registry's active companion art.

The kingdom includes a Dragon Den with free adoption, feeding, a growth bar and clearly labeled form previews. Three persisted correct attempts earn one snack. Feeding consumes one snack and updates avatar.dragon.feeds: 0-4 is Hatchling, 5-14 Young dragon, 15+ Guardian. Existing correct spelling history counts, including repeated correct spellings and test records represented in mastery. No new gold or XP is awarded, removed or recalculated. Growth never decays with time; there is no death, sickness, neglect penalty or time-based obligation. Fully grown dragons can still be fed. Selecting another dragon color preserves growth.

## Persistence and integration decisions

Growth uses the existing avatar JSON field, so no database table, attribute or destructive migration is needed. Feeding re-reads the owner-scoped player and mastery before an avatar-only profile update, rejects missing players and unearned snacks, and updates the UI only after save success. A synchronous component lock prevents duplicate taps. Wardrobe saves re-read and preserve current growth so an older open editor cannot roll it back. Other avatar fields, players, kingdom purchases and history remain intact. The companion shows its real growth form in portraits, village scenes and the player's race art.

The existing profile JSON API is not a server-authoritative or transactional economy. This is cosmetic progress: no currency writes occur. Simultaneous edits on different devices still have the existing profile API's last-write behavior; the implementation does not promise cross-device transaction isolation. No function deployment or database changes were performed.

Cloud mastery now paginates through all owner-filtered records, using Appwrite's object argument API, Query.limit and cursorAfter. The installed SDK's fourth listDocuments argument is transactionId, not a numeric limit. The affected profile-list read was corrected to use Query.limit(100). Other unrelated backend methods were left outside this change.

## Audio decisions

Cloud speech previously created a fresh HTMLAudioElement after awaiting its download and ignored rejected play promises. It now decodes clips into AudioBufferSources on a shared AudioContext created/resumed during interaction, and waits for asynchronous resumption even for cached words. Speech connects independently of effects gain/mute. Request-generation checks prevent cancelled downloads or decodes from speaking later. End and cancellation release speech focus. A failed decode routes through the existing device-voice fallback instead of swallowing playback failure. Device speech starts synchronously in the gesture rather than a setTimeout. Cloud requests have bounded network timeouts. Voice caches and provider/voice/rate keys remain unchanged.

Effects activation now covers pointerdown, pointerup, touchend, click and keyboard input. Closed contexts are recreated, and suspended/interrupted contexts are resumed. The preview waits for resume and reports blocked playback. Where available, navigator.audioSession.type is set to playback from interaction so Safari does not treat requested Web Audio as ambient audio silenced by the ring switch. Hidden pages stop speech/effects and release that session to auto. No microphone permissions are requested. Existing mute, volume, speech priority and cue patterns remain intact.

References: [WebKit silent-switch issue](https://bugs.webkit.org/show_bug.cgi?id=251532), [Audio Session specification](https://www.w3.org/TR/audio-session/), [Chrome autoplay policy](https://developer.chrome.com/blog/autoplay).

## Shared ElevenLabs configuration remains required

The current repository deployment configuration has VITE_TTS_PROXY empty and no configured ElevenLabs key. A key or proxy saved through Reading voice on a desktop belongs to that browser and does not transfer to a phone. The UI now explains device-voice fallback. The playback fixes cannot create missing provider credentials, and no live ElevenLabs request or paid synthesis was made during this implementation.

The existing workers/tts-proxy implementation is the prepared shared service. To enable ElevenLabs for all devices, deploy it with an ElevenLabs key stored as a server secret, then set its HTTPS endpoint as VITE_TTS_PROXY and rebuild. Its origin allowlist already includes both kingdomspellers.com hostnames. Do not put a shared secret in VITE_ variables or ask parents to paste keys into each child's device. Read workers/tts-proxy/README.md for deployment commands. No voice service or website was deployed by this implementation task.

## Validation and limits

Pure checks cover food accounting, evolution, malformed/legacy saves, exhausted food and cloud pagination. Browser checks cover both Chromium mobile emulation and Windows WebKit for adoption/growth UI, persisted feeding, no currency/history/other-child changes, real art paths and responsive layout. Chromium checks use a delayed synthetic WAV response, real AudioContext decoding/source playback, effects after speech, effects mute independence, stale-download cancellation and asynchronous resume with a cached clip. All 12 effects also render real unclipped PCM in the existing sound suite. No real parent or child records are used.

The installed Windows WebKit build reports both AudioContext and webkitAudioContext unavailable. WebKit UI checks pass, but it cannot validate physical audio output or iPhone Safari's ring switch. An actual iPhone test remains required: hear a normal/slow word, preview effects, spell a correct/wrong word, lock/unlock or switch apps, return and tap again, test the ring switch, and verify a shared cloud voice after its service is configured. Mocked WAV requests do not verify live ElevenLabs delivery, credentials, credit availability or pronunciation quality.

Commands: npm test; npm run test:avatars; npm run test:sounds; npm run test:dragons; npm run test:avatars:browser; npm run test:sounds:browser; npm run test:dragons:browser; npm run build; npm run verify:release; git diff --check.

Artwork: public/assets/avatars/painted-v1/hair-{crop,quiff,coils}.{png,webp} and public/assets/dragons/{hatchling,young,guardian}.{png,webp}. Full prompts, generated-image source paths and file mappings are in DRAGON_HAIR_ART_MANIFEST.json. These six assets used the built-in image_gen tool. PNG alpha is preserved; WebP siblings are format conversions.

## Settings access follow-up

Enabled the previously disabled dashboard Settings action and added a protected /settings route containing the existing VoicePicker. A header Settings link makes the page reachable during lessons and on mobile. Browser verification passed for navigation, voice-control rendering, direct-route reload and 375px layout; production build passed. No deployment was performed.

## Shared voice deployment follow-up - October 26

User confirmed ElevenLabs was configured only with a desktop-browser key and authorized moving it server-side. Deployed Cloudflare worker kingdom-spellers-tts at https://kingdom-spellers-tts.jasonw79118.workers.dev, initial version a1f30b49-47b5-4d10-96a9-4517b09f0a66. Public health returned ok=true, configured=false before private key entry. Added a public-only .env.production connection; no API key enters the app build. Worker validation/CORS/provider-isolation tests pass. The private local helper requires the user to enter the existing ElevenLabs key, then stores it as a Cloudflare encrypted secret, tests one word, builds and validates the site, publishes gh-pages, pushes the source branch and checks the custom domain. Actual credential validation and site deployment remain pending that private input; consult .snap/voice-setup-status.json for subsequent completion. The helper never stores or prints the API key.

## Live website verification - October 26

Published the authorized site update to gh-pages commit 81166f5 and pushed feature/dragon-companions-mobile-audio. Verified HTTPS 200 at www.kingdomspellers.com with the current /assets/index-CJsnJK0O.js bundle; checked Settings routing, Feed dragon, Short coils and the shared worker URL in live JavaScript, plus HTTPS 200 for hatchling and short-coils art. Build and release privacy/link checks passed. No database changes were made; the user's pre-existing localBackend.js edit remains uncommitted.

The shared voice endpoint reports configured=false: the user has not entered an ElevenLabs key into Cloudflare yet. Cloud speech therefore cannot be claimed working live; device-voice fallback remains available. The private one-time setup helper was stopped before this manual deployment to avoid concurrent publishing, so its earlier local setup link is no longer active. Server-key setup and a physical iPhone listening test remain outstanding.

## Managed voice settings correction

User reported that a key saved in Kingdom Spellers Settings was ignored. Confirmed the worker still had configured=false: the production VITE_TTS_PROXY overrides browser connection settings. The old UI incorrectly offered a browser key form and could claim cloud playback after device fallback. Managed production builds now hide that ignored form, offer Test shared voice, verify server secret configuration before synthesis, and report the actual provider returned by playback. Explicit voice selection clears a stale fallback breaker. Managed service selection follows the deployed provider rather than an incompatible per-device service preference. Existing browser credentials are preserved, not erased or transmitted.

Five production-configured mobile browser checks passed with synthetic account responses and speech: ignored key field absent, missing server secret detected without synthesis, accurate fallback message, successful connection clears fallback and reports real cloud playback, and phone layout/no browser errors. Production build and release checks passed. Live key validation remains pending private user input; no real key was read or copied by the agent. The local key-entry helper will test the real server voice and publish this correction after successful secret entry.
