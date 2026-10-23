# Kingdom Spellers game sounds - 2026-10-23

Implemented on feature/game-sounds. This audio update is local; the previously approved NPC/academy release remains live. No deployment, schema, account, currency, mastery-rule or backend permission changes. The existing uncommitted localBackend.js edit is preserved and excluded from the feature commit.

## Delivered sounds and triggers

Twelve original Web Audio cues: correct spelling, gentle retry, money, clearing, building, upgrade, quest, mastery, rank, region, decorating and placement. These are short synthesized bell/chime/wood-like tones with smooth attack and release envelopes, not licensed clips or spoken praise. No external service, audio download, microphone permission, background music, API key or new dependency is needed.

Practice plays its correctness and optional coin tail only after attempt/reward saves succeed. Coin sounds require an actual saved positive gold amount. Mastery replaces the normal success melody when a saved record crosses the existing learning threshold. Royal Tests never get coin sounds. Race mode preserves its existing correct-word pronunciation; incorrect race answers get the gentle retry tone. Clear/build/upgrade/decor/place/quest hooks run after confirmed mutations, and result.replay is silent. Rank and region cues use existing actual milestones. Reopening a scene or reward card never plays a new sound: effects are invoked by successful actions rather than render effects.

## Controls and speech priority

Top-bar Sounds on/off opens device sound settings, a keyboard-accessible volume slider and a preview. Defaults are enabled at 40 percent, with an additional bounded master gain. Preferences use ks2_game_sound in localStorage, remain separate from pronunciation preferences, survive reload and synchronize across tabs. Blocked storage preserves session controls. Effects mute leaves spoken words available.

AudioContext is created/resumed only after user pointer/keyboard interaction. Unsupported or suspended audio is silently skipped; gameplay never awaits effects or queues blocked autoplay. Rapid calls are bounded; a new cue replaces the old one. Muting, hidden tabs, route changes and sign-out stop active effects. Speech immediately takes focus and stops effects, including already scheduled coin tails. Pending cloud speech and delayed local utterances use request generations so cancelled or older requests cannot play later or release a newer word's focus. No speech/provider selection or cloud credentials were changed.

## Verification

176 passing checks: 9 sound unit/policy tests, 36 sound browser tests, 56 core learning/economy checks, 37 NPC browser checks and 38 village/mission browser checks. Real OfflineAudioContext renders verify nonzero PCM and bounded peaks for all 12 cues. Browser instrumentation observes actual Web Audio sources for correct/wrong/coin/build/clear events, double-click clearing, mute/reload, volume, tab synchronization, speech priority/cancellation, failed attempt/reward saves and phone header containment. Actual reward balances are checked independently. Browsers use synthetic isolated demo data, not live children/accounts.

Root and /kingdom-spellers/ builds, configured private-value exclusion, CNAME and asset-link verification pass. No lint task exists. Existing large JavaScript bundle warning remains. The final app remains usable when Web Audio is unavailable. Automated PCM verification does not substitute for listening on each target device; hear the effects locally using the Preview sound button and real game actions.

Commands: npm run test:sounds; npm run test:sounds:browser; npm test; npm run test:npcs:browser; npm run test:expansion:browser. Browser checks require Playwright/Edge; set QA_URL=http://127.0.0.1:3110 and PLAYWRIGHT_MODULE to an existing installation if needed. Local preview: npm run dev:demo -- --host 127.0.0.1 --port 3110 --strictPort. Evidence is in qa/sound-evidence (PCM results, browser results and phone screenshot; regression subfolders contain NPC/village evidence).

## Added or modified source

- src/lib/soundEffects.js: original cue catalog, synthesis, preferences, autoplay/focus policy and cleanup.
- src/components/SoundControl.jsx and SoundControl.css: persistent effects control and responsive header.
- src/components/Layout.jsx: mounts the sound control and user-gesture lifecycle.
- src/lib/speech.js: pronunciation focus and cancellation generation checks.
- src/pages/PlayPage.jsx: confirmed spelling/mastery/coin and quest sounds.
- src/pages/KingdomPage.jsx: confirmed clearing/building/decor/placement/upgrade/rank/region sounds.
- src/pages/RacePage.jsx: gentle wrong-answer feedback while preserving correct-word speech.
- scripts/sounds.test.mjs and scripts/verify-sounds-browser.mjs: policy, PCM and integration coverage.
- package.json: sound test commands.
- qa/sound-evidence/: machine-readable results and screenshots.
- handoff.txt and design/SOUND_EFFECTS.md: delivery record and implementation decisions.

Cloud expansion transactions retain their existing installation gate. This update adds presentation only and does not activate cloud decoration purchases, migrations or the prepared transaction function.
