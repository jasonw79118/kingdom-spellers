# TASK: Upgrade existing Kingdom Spellers to a polished storybook kingdom adventure

You are working in the EXISTING repository rooted at this folder. The owner has approved the direction documented in `design/VISION.md`, `design/FEATURE_SPEC.md`, and `qa/ACCEPTANCE_CHECKLIST.md`. Treat these as product requirements, not inspiration. Implement changes in the existing app rather than constructing an isolated prototype.

## Non-negotiable first steps
1. Read README, package.json, vite.config.js, app routing, current builder components, purchases and progression logic, `src/lib/backend.js`, existing tests, and deployment workflow.
2. Establish a git baseline (working tree status and branch) and record existing functionality. Do not erase or reset local changes. Create a feature branch if safe.
3. Identify the **actual current** active backend at runtime: Appwrite, Supabase or demo/localStorage. The README documents all three; NEVER assume one. Preserve data and credentials; do not expose them in terminal logs or source.
4. Inventory current territory IDs, player ranks, purchase costs, save schema, image assets, available routes, and existing camera/OCR functionality. Reuse existing source of truth. Do NOT create parallel account/progression state.
5. Run available build/tests first and record failures from baseline.

## Sprint 0: deployment and reliability
- Audit custom-domain (`www.kingdomspellers.com`) asset paths. GitHub Pages project path and custom domain root may need different Vite `base`. Existing README says `/kingdom-spellers/`; inspect current `vite.config.js` for any `VITE_BASE` override and current action/build pipeline.
- Make production build support root domain `/` WITHOUT breaking local dev or any old project-path deploy. Prefer explicit env/build target and verify generated asset links; keep HashRouter if appropriate.
- Check loading, layout and console errors on mobile and desktop. No external secrets in Vite client bundle.

## Sprint 1: ONE showcase playable kingdom — Greenwood Village
- Build a rich illustrated storybook landscape with coherent perspective, rounded hills, detailed timber-and-stone buildings, cottage gardens, winding paths, layered tree canopies, river/bridge where appropriate, shadows and atmospheric depth.
- Assets in `public/nextlevel/*.svg` are moodboards and staging references, NOT finished individual sprites. Improve/recreate them as scalable component and asset layers while matching their cohesive, warm style. Do not simply place a giant flattened image as the interactive world.
- Initial kingdom MUST look intentionally modest because player has purchased nothing: grass clearing, dirt path, one small shabby starting structure, placeholders as tasteful construction plots, no purchased buildings shown prematurely.
- As buildings are bought, progressively reveal actual structures, contextual pathways and props. Buildings have clear locked/available/purchased states, prices from existing logic and semantic accessible click targets.
- Zoom/pan where needed, tap-friendly hitboxes, stable sorting/occlusion, responsive layouts (375px mobile, tablet, desktop), no horizontal overflow. Reduced-motion option.
- Deliver screen snapshots or local visual artifacts for before/after review.

## Sprint 2: spelling loop connected to restoration
- Preserve existing spelling lists, photo import, human correction and word mastery. Do not paywall or penalize children's incorrect attempts.
- Clear loop: Choose List → Practice/Quest → Receive feedback → Earn existing XP/resources → Restore an eligible item → See visible world improvement → Repeat.
- Offer pronunciation, contextual meaning, syllable hints, practice/retry, mastery review and an accessible keyboard-first spelling entry.
- Any dictionary/definition generation MUST allow parent review and edits; avoid fabricated definitions. OCR must be parent-reviewed before adding words.

## Sprint 3: avatars, region travel, parent controls
- Extend existing avatar cosmetics and rank mapping only after verifying saved values. Ranks are narrative presentation, not a destructive migration; default plan Esquire → Knight → Baron/Baroness → Prince/Princess → King/Queen, but map to existing ranks if different.
- Introduce region map showing real saved territory unlocks, purchase status and clear prerequisites. Do not give unowned territories free upgrades.
- Parent can create/manage child lists, approve scans, view words by mastery, track practice and switch children without leaking data between profiles. Handle underage accounts safely: no public child names, no unrestricted chat or leaderboard, avoid unnecessary personal data.

## Quality and handoff
- Work incrementally and commit changes sensibly. Preserve all existing user accounts, lists, XP, purchases, cloud sync, costs, and route URLs. Never reset database or overwrite migration history.
- At end of each sprint run build/tests/lint if available, test 375px / 768px / 1440px, handle loading/error/empty states, and verify real integration. No mock screenshots masquerading as functional UI.
- Update README and handoff.txt with exact changed files, commands, unresolved issues, manual QA and deployed URL (if deployed). Display version stamp bottom-left on app.
- Do NOT hardcode test credentials or ask for credentials in agent prompt. Use local secrets/secure login only if authorized.
- If requirements conflict with working implementation, document tradeoff and choose backward-compatible behavior.

## BEGIN NOW
Read `READ_ME_FIRST.md`, the four spec/checklist files, then inspect the repository. Start Sprint 0 and Sprint 1. Produce one working, attractive Greenwood Village vertical slice before copying artwork/behavior to other territories. Do not stop at making a plan; implement source changes with test evidence.
