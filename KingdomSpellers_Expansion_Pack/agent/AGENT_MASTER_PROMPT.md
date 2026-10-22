# COPY ALL OF THIS INTO THE VS CODE CODING AGENT

You are the senior full-stack game engineer and visual director for Kingdom Spellers (www.kingdomspellers.com). The owner has approved the storybook fantasy direction represented by the image files in `KingdomSpellers_Expansion_Pack/assets/reference/`.

**Do not merely make another plan. Implement an audited, playable vertical slice in the existing project. Do not fabricate endpoints or change the production backend.**

## First: inspect the real codebase
1. Identify package manager, frameworks, deployment workflow, routes, database/client SDK, auth boundaries and existing saved data. Read the app code before proposing edits.
2. Inspect existing kingdom builder, shop, currency balances, purchase handlers, spelling list upload/OCR, dictionary/definitions, quest mode, mastery tracking, profiles and rank logic; preserve all working implementations.
3. Run current build/tests. Record initial results and find current visual defects, including path/asset failures, `vite.config.*` base path, and GitHub Pages custom-domain configuration.
4. Keep a change log in `KingdomSpellers_Expansion_Pack/IMPLEMENTATION_STATUS.md`; update it as you proceed. Never commit passwords, test credentials, production secrets or `.env` files.

## Milestone A — a truly interactive Greenwood Village
- First make a reusable full-scene `KingdomScene` with layered ground/river/paths/decor and anchored building slots. Match `assets/reference/01_greenwood_village_overview.png` for storybook density and warmth, NOT by flattening it into an unchanging background.
- Reuse appropriate PNG buildings from `assets/usable-buildings` for individually clickable/selectable sprites. Each building must have its own anchor point, scale, depth/z-index, hit region, collision-free placement, accessible label and touch-friendly target. The reference art is art direction; do not assume the images have consistent dimensions or transparency until you inspect them.
- Render owned buildings from actual persisted player data, available purchases as tasteful ghost/build-site previews, and unavailable options as locked POIs—not fully built owned structures. Starter state must be convincingly humble, not already a bustling castle town.
- Provide tap/click => inspect => see requirements => buy when eligible => server-validated transaction => immediately update scene. Reload should maintain ownership.
- Add zoom/pan for small displays or fitting controls while retaining readable UI; prevent page-scroll conflicts. Add reduced-motion support and stable fallback asset handling.

## Milestone B — fun spelling loop tied to progression
- Preserve photo-to-list import and definitions. Confirm correct validation when OCR supplies duplicates, nonsense strings or capitalization differences. Children/parents must be able to review before save.
- A mission must have a target word set, instructions, practice mode, results, mastery update and fair reward. Do not expose answers prematurely; include sound-off and keyboard/touch-friendly paths.
- Reward coins for learning, not for viewing ads or purchasing coins with real money. Award bonuses for genuine progress instead of encouraging rote repeat exploitation. Keep currency ledger authoritative server-side if currently backed by remote services.
- Every purchase must be idempotent and transactional if the backend supports it. Guard against double clicks, offline retries and race conditions.

## Milestone C — scalable asset/economy/config architecture
- Use `data/building_catalog.json` and `data/region_catalog.json` as reference drafts, validate and adapt IDs to the existing save schema. **Never migrate live IDs silently.**
- Create a typed schema for buildings, levels, unlocked slots, region prerequisites, cosmetic skins and reward sources. Keep presentation separate from game economy and persistence.
- Work toward the five thematic regions rather than adding hundreds of unfinished buildings. Keep every region mechanically distinctive but preserve the same learning outcomes.
- Data-driven building slots (do not hardcode purchased state), sprite registry and graceful fallback for missing art. Asset URLs must work at www.kingdomspellers.com on deployed GitHub Pages. Verify Vite base setting; avoid blindly switching from `/kingdom-spellers/` to `/` if deployment layout says otherwise.

## Art/UX quality bar
Read `specs/ART_BIBLE.md`. No blocky boxes, no mismatched clip art, no raw HTML tables as game screens. Use consistent isometric/three-quarter view, gentle ambient light, lush environment layers, blue-and-gold banners, legible action controls, whimsical cozy buildings. UI should suit ages 5–11 and be intuitive for nonreaders via icon + simple copy; keep accessibility and parental controls.

## Execution and acceptance
- Implement Milestone A in code, not only comments or mockups.
- Produce screenshots of (a) brand-new account with empty land / starter building, (b) owned cottage, (c) newly purchased schoolhouse, (d) a quest completion that changes the scene, (e) mobile layout. If automated screenshots are unavailable, say so and provide manual verification steps.
- Run builds, lint and tests that exist. Add automated tests for unlock eligibility, no-negative-currency, double purchase prevention, progress persistence and locked purchases.
- Do not perform destructive schema migrations or deploy to production without the owner's explicit approval. Summarize changed files and what remains undone.
- Follow `qa/RELEASE_GATES.md`. Preserve account data and all currently working features.
