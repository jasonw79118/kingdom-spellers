# NPC, academy, rewards and decoration implementation

Implemented on feature/academy-npcs. Website deployed with owner approval on 2026-10-23; cloud transaction function remains uninstalled. Original localBackend.js working changes are preserved and excluded from commits. Reviewed all 14 images in this pack and all 15 images in the earlier expansion pack, including duplicate supplied building sprites. Composite crops are references only. Generated clean individual NPCs, academy interior, chest and decoration sprites using built-in image generation; production files live in public/assets/storybook with PNG alternatives. No new service, secret, database collection or schema migration.

Six fictional guides use a shared model and presentation. Eli teaches pronunciation beside the academy spelling parchment. Grace opens the existing three quest missions; Bram inspects the real cottage and links to the existing avatar editor; Lyra opens the existing list editor; Finn introduces existing Royal Tests and their pet-race prerequisite; Isolde directs the existing rank ladder. Guide availability does not claim that their buildings are already owned. No fake equipment economy or unimplemented activity.

Rewards are visual views of confirmed existing saves. Word correctness does not itself grant a second reward. Mastery uses the existing four-attempt learning-rule threshold, not a concept-sheet claim or single correct answer. Current achievement badges derive from each child's saved mastery and quest records; reload cannot pay them out. Failed saves show an error instead of claiming an earned coin amount. Royal Tests retain zero rewards. Reduced motion disables reward animation; a stop control is available.

Decoration purchases keep existing IDs/prices and add a 25-gold fountain requiring the well and 15-gold reading lanterns requiring the schoolhouse. These are optional cosmetics, not XP/prosperity sources. Relocation is free, validates ownership, and accepts only named safe anchors, never arbitrary coordinates or building IDs. Metadata stays under buildings.__storybook_v1, retaining old and unknown fields. The same reducer is used by local transactions and the prepared, uninstalled Appwrite transaction function. Cloud expansion gate is preserved; no direct client fallback is added.

Avatar configuration and options remain fully editable and saved exactly as before. A parchment/gold portrait surround, per-instance skin/hair/cloth gradients, larger warm eyes, and gold garment trim improve presentation. The existing modular SVG avatar renderer is retained: a full painted modular avatar system is not falsely represented by one static generated character. The new painted NPCs are a closer match to the supplied references; modular avatar repainting remains an art limitation.


## Verification completed 2026-10-23

- `npm test`: 56 learning/economy checks.
- `npm run test:expansion`: 21 reducer and injected Appwrite transaction contract tests.
- `npm run test:npcs`: 9 achievement, decoration ownership, collision and free-transaction checks.
- `npm run test:greenwood`: 31 original browser regressions.
- `npm run test:expansion:browser`: 38 broader village/mission browser checks.
- `npm run test:npcs:browser`: 37 NPC/academy browser checks.
- Total: **192 passing checks**. Both root and `/kingdom-spellers/` builds passed; release verification passed for asset links, CNAME and configured private-value exclusion. No lint task exists. The pre-existing >500kB JavaScript warning remains.

Tests use isolated synthetic local profiles, not live accounts. Transaction contracts use a fake database; no live Appwrite function installation or production payment/write test occurred. Offline attempts pause without awarding coins or advancing. Storage quota failure preserves the old decoration position; double purchase charges once. A four-attempt saved mastery threshold is tested independently of the backend's older display label. Mastery badges describe current saved learning strength and can return to learning after mistakes; they are not permanent historical trophies or currency grants. Original backend-file SHA-256 matches .snap/expansion-baseline/localBackend.js.

## Visual evidence and preview

Before: `qa/spelling-evidence/spelling-desktop.png`, `spelling-768.png`, `spelling-375.png` (previous deployed spelling UI). After: `qa/npc-evidence/05-academy-1440.png`, `05-academy-768.png`, `05-academy-375.png`. Other evidence includes all guides, library guide, saved decorations, mastery, gentle retry, completion, mobile guide selection and avatar polish. `results.json`, `expansion-regression/results.json` and `legacy-regression/results.json` record actual test names. Synthetic fixture balances/building ownership are stated in the browser script; these are not app starting gifts.

Preview: `npm run dev:demo -- --host 127.0.0.1 --port 3110 --strictPort`, then http://127.0.0.1:3110/ . Use disposable local demo profiles. Browser scripts require Playwright and Edge; QA_URL defaults to localhost (set it to :3110 for the older Greenwood suite), and PLAYWRIGHT_MODULE may point to an existing installation. Unit tests run without browser dependencies. Website published on 2026-10-23 following explicit owner approval.

## Remaining limits

The existing Appwrite transaction function remains prepared but uninstalled/unconfigured. New cloud upgrade, quest-claim, decor and move actions stay disabled until the owner approves function activation and real cloud validation. Existing cloud practice and legacy building integration are preserved. Existing practice coins/mastery are separate backend writes; ambiguous errors pause instead of silently retrying a payout. This change does not claim to harden the entire legacy cloud economy or change its database permissions.

Artwork is ready for all six NPCs, academy, chest, fountain and lanterns. No required sprite is missing for this slice. Extra reference props such as bridges, benches, fences, trees and paths are not additional inventory items; existing scenery and earned gardens/banners remain. No new shop for equipment, scary boss fight or unimplemented mini-game is advertised as playable. Painted modular avatar parts remain a future art task; all existing editable options are retained with improved SVG rendering. Guides appear in a village council/journal and relevant existing screens; all six are not animated wandering map entities.


## Website deployment - 2026-10-23

Owner requested push live. Published the tested production build to gh-pages commit `6a4f321`; implementation source `e8bbb58` is pushed on feature/academy-npcs. Verified HTTPS 200, the exact index-BsYdl6Vu.js and index-B-iQdYKJ.css release references, and HTTP 200 for academy, six NPCs, chest, fountain and lantern WebP assets at www.kingdomspellers.com. No function deployment, migration or cloud transaction activation occurred. The original localBackend.js edit remains uncommitted and preserved.
