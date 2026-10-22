# Expansion implementation status ? 2026-10-22

## Audit and baseline

- Working branch: `feature/greenwood-storybook`; starting commit `689fa0a`.
- Existing `src/lib/localBackend.js` user edit is preserved and backed up in `.snap/expansion-baseline`.
- Reviewed START_HERE, master prompt, phased delivery, all three specifications, both proposal catalogs, release gates, and all nine reference artworks; duplicate usable sprites verified RGBA with real alpha.
- Framework remains React/Vite, HashRouter, GitHub Pages custom domain; production selects Appwrite, optional Supabase and credential-free demo remain separate.
- Baseline: 56 game checks pass and production build passes (existing large-bundle warning).
- Original accounts, cloud data, IDs, prices, rank thresholds and territory completion semantics are retained. No deployment or schema migrations.

## Decisions / work in progress

1. Replace flat Greenwood SVG scene with layered painted terrain, independent supplied building PNG/WebP sprites, contact shadows, owned-state rendering, accessible interactive slots and separate earned decor.
2. Catalog proposals are not the live economy. `academy` art maps to saved `schoolhouse`, guild-hall art to `townhall`; library/tower remain planned content without inventing purchased IDs. Keep all five canonical regions and existing rank rules.
3. Missing terrain/well/castle/upgrade/garden/camp art uses built-in image generation, saved as project assets; original pack PNGs remain untouched. WebP, PNG fallback and 160px thumbnails are generated for real assets. Terrain contains no buildings.
4. Add only a versioned `__storybook_v1` value inside the existing buildings JSON. All old plot keys remain unchanged; no new database field or destructive migration. Old `true`/cleared/built saves still work.
5. Optional upgrades: levels 2/3 cost half/base canonical build cost respectively, add cosmetic gardens/banners (cottage gains a new wing); no additional prosperity/XP or replacement currency. These are explicit new rules derived from the current economy, not the pack's placeholder prices.
6. New transactions use fresh snapshots and shared rule validation. Demo writes are serialized with Web Locks and compensated on failed storage writes. A real authenticated Appwrite Function is prepared, not deployed. Existing cloud building actions retain compatibility until owner-approved function installation. New cloud-only expansion actions fail closed when not configured. Existing direct client write permissions remain a production-hardening release gate.
7. Spelling missions use parent-managed words and normal reward/mastery logic; mission completion can award a once-only cosmetic garden from verified correct-word history. No extra currency bonus or reward for repeating a claim.

Next: finish scene/mission integration, test purchase/replay/upgrade/locked rules and transaction rollback, capture empty/cottage/school/quest/mobile evidence, and update this document with actual outcomes.
