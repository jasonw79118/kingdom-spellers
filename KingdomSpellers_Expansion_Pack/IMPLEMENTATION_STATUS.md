# Kingdom Spellers expansion — implementation record

Content version: **2026.10.22-a**. Branch: `feature/greenwood-storybook`.
This is an implemented local milestone. Nothing has been deployed and no
database schema, account, production permission, or cloud record was changed.

## Audit and baseline

Read `START_HERE.md`, the master prompt, phased delivery, all three specs, both
draft catalogs, and the release gates. Inspected all nine reference images and
all six duplicate building candidates. Inspected the existing router, backend
selection, auth boundaries, kingdom handlers, progression, rewards, mastery,
OCR review, definitions, profiles, ranks, and deployment configuration.

The baseline was commit `689fa0a`: 56 game checks and the production build
passed. Existing main-bundle warning: about 722 kB before this expansion.
The original uncommitted `src/lib/localBackend.js` change was backed up under
`.snap/expansion-baseline/` and remains unchanged and excluded from our commits.

Production configuration selects Appwrite; Supabase remains optional, and
`.env.demo` provides separate localStorage preview data. All browser writes in
this work use isolated synthetic demo profiles. Real cloud accounts were not
logged into, reset, copied, or used as test fixtures.

## Delivered behavior

- Replaced Greenwood's flat SVG world with painted empty terrain and separately
  placed supplied sprites. Sky/land/water/paths are a static natural terrain
  layer; contextual paths, construction plots, purchased buildings, shadows,
  earned decorations, selection, and interaction labels are independent layers.
- Fresh profiles have one humble camp and seven real construction sites.
  Full buildings appear only for saved `built`/legacy `true` ownership. A
  selected unowned building appears only in the explicitly labeled preview.
- Individual building hit targets cover the sprite and its label. Labels live
  in a separate layer above decorative art so gardens cannot hide them.
  Pan, scroll, swipe, arrow keys, zoom/reset, and the keyboard village journal
  work at 375, 768, and 1440 pixels with no horizontal page overflow.
- Original clearing/building prices and prosperity remain authoritative inputs
  from `src/game/kingdom.js`. A purchase uses a fresh saved snapshot, not the
  displayed balance. Rapid actions are guarded; retries replay existing state.
- Saved optional levels 2 and 3 add gardens and royal banners; the cottage's
  second level has a genuinely different wing sprite. Other buildings keep
  their recognizable structure and gain cosmetic surroundings. Full structural
  sprite sets for every level are future art production, not falsely claimed.
- Three usable quests: `Words take root`, `A place to call home`, and
  `A village of learners`. Their once-only rewards are a garden, home banner,
  and school lanterns. Two optional purchased decorations are also functional.
- A Greenwood spelling mission takes up to five actual words from the selected
  child's saved list. Existing pronunciation, definitions, tile entry, mastery,
  difficulty and normal gold/XP rules remain. Completing a qualifying mission
  adds its persistent garden; repeating the claim never adds currency.
- Fixed stale multi-word reward balances by reading the current profile and
  saving both coin/XP increments together. Fixed stale feedback passed into
  session advancement. Correctness in the mission summary matches submissions.
- Fixed the existing celebration root animation: it previously faded before
  the content appeared, and reduced-motion's short animation duration hid it
  almost immediately. The component now controls its own visible lifetime.

## Compatibility and architecture decisions

1. **Keep live IDs/economy.** Catalog examples are proposals. Academy art maps
   to `schoolhouse`, guild-hall art to `townhall`, cottage/market retain their
   canonical IDs. Library and spell-tower art is prepared but has no fake live
   purchase ID. No extra unfinished buildings were added to existing completed
   regions. Existing five region names, IDs, unlock costs, ranks and completion
   rules remain; the other four regions retain their working scenes.
2. **Keep one progression source.** Existing plot keys remain string states or
   legacy booleans. New levels/quests/decor live under the additive
   `buildings.__storybook_v1` key in the existing 20,000-character JSON field.
   No new table/column or migration. Other progress fields and unknown keys are
   preserved. Newer metadata versions fail closed for new actions.
3. **Explicit optional upgrade pricing.** Level 2 costs half the existing base
   build price, rounded up; level 3 costs the base price. Flower border is 10
   gold, village banners 14, derived from current canonical clear costs. These
   are new optional rules, not changes to old costs. They grant no extra XP,
   prosperity or replacement currency, and require an already owned landmark.
   Cloud activation and these optional additions remain part of owner review.
4. **Separate presentation.** `KingdomScene` accepts region/slot/asset inputs;
   sprites use bottom anchors, ground-depth sorting, normalized CSS coordinates
   derived from a 1280×780 blueprint, contact shadows and collision-free logical
   footprints. The registry uses Vite's `BASE_URL`, not a hardcoded domain.
   PNG fallback, WebP and thumbnails keep art separate from save IDs/economy.
5. **Typed content contracts.** `kingdomContent.d.ts` defines regions, slots,
   sprites, levels, cosmetic state, quest templates, reward sources and action
   unions. Shared pure rules run in the local adapter and prepared cloud
   function. All five canonical regions are registered. Future Word Explorer
   and Spelling Tower entries are explicitly planned, not advertised as playable.
6. **Preserve learning and privacy.** No definition generation or OCR changes.
   Parent review remains required before OCR words save, definitions remain
   editable, list IDs/routes/profile history are retained, and no social/chat
   or public child identifiers were introduced. Existing gold/XP rules remain;
   quests grant a finite cosmetic once, not repeatable bonus currency.
7. **Cloud actions are real but not installed.** `server/kingdom-function.mjs`
   authenticates the invoking JWT, checks player ownership, rejects submitted
   prices/rewards, reads saved progress, stages progress plus bounded debit in
   one transaction, and commits/rolls back. It uses the installed Node SDK's
   existing Databases transaction methods. No fabricated endpoint or function
   ID exists. `VITE_KINGDOM_FUNCTION_ID` is optional and defaults to unset.
8. **Compatibility before activation.** Until an owner-approved function is
   installed/configured, existing cloud clear/build behavior remains available.
   New cloud upgrades, decoration buys and reward claims fail closed rather
   than use unsafe client-side spending. The complete new loop is playable in
   demo mode. The legacy cloud purchase path and practice rewards still have
   their inherited client-write trust assumptions; they are not claimed to be
   server-authoritative. Review permissions and reward writes before promoting
   the function as an anti-tamper economy.
9. **Safe local saves.** Web Locks serialize tabs against the same original
   profile/progress keys. Synchronous writes restore the prior values if a
   storage exception occurs. This is a tested demo adapter, not a claim about
   crash/power-loss durability or cloud transactions.
10. **No automatic deployment.** `npm run package:kingdom` produces a review-only
    allowlisted bundle containing four source files and a minimal package file.
    No `.env`, credentials, art, child data, upload or permission mutation.

## Evidence and test results

- `npm test`: **56 passed** (existing economy/mastery/practice regression).
- `npm run test:expansion`: **21 passed** (rules, three upgrade levels, duplicates, negative funds, locked regions, ownership, finite quests, metadata compatibility, geometry, OCR and transaction contract failures).
- `npm run test:greenwood`: **31 passed** (existing real-browser regression).
- `npm run test:expansion:browser`: **36 passed** (actual purchases/upgrades, fallback assets, multi-word rewards, mission garden, refresh, quota rollback, two tabs, responsive layouts and isolated children).
- Root production build and explicit project-path build: **passed**. Generated JS/CSS links, CNAME and configured private-value exclusion: **passed**.
- `npm run package:kingdom`: review-only allowlisted function bundle prepared. No deployment.
- No lint script is defined. Existing >500 kB warning remains: main JS about **725 kB / 221 kB gzip**, close to the baseline; no new fatal browser errors or missing artwork responses.


Screenshots are captures of the functioning React app and actual demo purchases,
not flattened mockups. The fresh screenshots use the real zero-coin/zero-test starting state. After
those captures, only the isolated purchase fixture is credited for a quick
review sequence; app defaults remain unchanged.
Scene-only crops hide fixed navigation solely during capture. Full-page quest
results retain actual app chrome. External font requests are blocked during QA; deliberate fallback/font request failures are distinguished from uncaught application errors.

- [Previous SVG world](../qa/evidence/greenwood-empty-1440.png)
- [Fresh painted meadow](../qa/expansion-evidence/01-fresh-meadow-desktop.png)
- [Purchased cottage](../qa/expansion-evidence/03-owned-cottage.png)
- [Saved upgraded cottage](../qa/expansion-evidence/04-upgraded-cottage.png)
- [Newly purchased school](../qa/expansion-evidence/05-new-schoolhouse.png)
- [Quest completion](../qa/expansion-evidence/06-quest-complete.png)
- [Garden added to the real village](../qa/expansion-evidence/07-quest-garden-in-world.png)
- [375px grown village](../qa/expansion-evidence/08-mobile-grown-village.png)
- [Machine-readable browser checks](../qa/expansion-evidence/results.json)

## Run and review

```powershell
npm run dev:demo -- --host 127.0.0.1 --port 3110 --strictPort
npm test
npm run test:expansion
npm run build
npm run build -- --base=/kingdom-spellers/ --outDir .snap/project-build
npm run verify:release
npm run package:kingdom
```

For browser checks, install optional Playwright without saving dependency or
lockfile changes, or set `PLAYWRIGHT_MODULE` to an existing installation's
`file:///.../index.mjs`. With the demo server running:

```powershell
$env:QA_URL='http://127.0.0.1:3110'
npm run test:expansion:browser
$env:QA_OUTPUT='.snap/expansion-regression'
npm run test:greenwood
```

`http://127.0.0.1:3110/` is a separate demo preview. Create a disposable local
parent/profile to interact manually; test fixtures are not production accounts.

## Still gated / future phases

- Owner visual approval of Greenwood before additional-region production.
- Actual authenticated Appwrite function installation, staging conflict tests,
  invocation scopes, and direct-write permission review require approval.
  Contract tests use a fake transaction service; no live transaction was run.
- Existing real parents/children, historical progress/mastery, cross-device
  sync, audio on real devices and camera permissions still need owner-controlled
  validation. Supabase's existing flow is preserved but not newly exercised.
- Physical touchscreen/keyboard/screen-reader QA and deployment HTTPS/deep-link
  checks are release gates, not inferred from isolated browser tests.
- Further structural upgrade art, more educational modes, parental gating,
  avatar expansions and other-region artwork follow later approved milestones.
  No production rollout, destructive migration or automatic economy migration.

## Changed implementation paths

`src/components/kingdom/{KingdomScene.jsx,GreenwoodVillage.jsx,StorybookScene.css,assetRegistry.js}`;
`src/game/{greenwood.js,expansion.js,kingdomContent.d.ts}`;
`src/lib/kingdomActions.js`; `src/pages/{KingdomPage.jsx,PlayPage.jsx}`;
`src/components/Layout.jsx`; `src/index.css`; `server/{kingdom-function.mjs,kingdom-service.mjs}`;
`scripts/{expansion.test.mjs,verify-expansion-browser.mjs,verify-greenwood.mjs,package-kingdom-function.mjs}`;
`package.json`; `public/assets/kingdom/greenwood/*`; README/handoff/review evidence
and this pack's audit records. Existing backend adapters and database schemas
were not modified.

Art provenance and exact prompt templates: [ART_PROVENANCE.md](ART_PROVENANCE.md).
Original pack images remain untouched. Their alpha audit is in
[ASSET_INVENTORY.json](ASSET_INVENTORY.json).

References checked against the installed SDK:
[Appwrite transactions](https://appwrite.io/docs/products/databases/documentsdb/transactions)
and [authenticated function requests](https://appwrite.io/docs/products/functions/develop).
