# Painted player avatars - 2026-10-23

Implemented locally on feature/painted-avatars. This replaces the prior avatar art limitation recorded in the NPC handoff; the currently deployed game remains unchanged until deployment is approved. No database migration, account reset, backend rewrite or production account write.

## Reference and production assets

Reviewed the supplied KingdomSpellers_NPC_Rewards_Decor_Pack avatar customization sheet and the full expansion board. These are concept references, not transparent ready-made layers. Built-in image_gen produced twelve clean individual painted assets: two character bases, five hairstyles, one tintable cape, two shields and two crowns. Full prompt set, selected generated source paths, cleanup prompts, alpha crop bounds and output dimensions are in AVATAR_ART_MANIFEST.json. Production files are public/assets/avatars/painted-v1/*.webp plus transparent PNG alternatives. Reference sheets and original generated outputs are unchanged. Visible alpha bounds are cropped and art resized/compressed for delivery. All twelve WebPs total 1,185,936 bytes; users download only their chosen reusable layers, with browser caching across profiles.

## Modular composition and compatibility

Avatar.jsx composes real painted textures in an SVG stage, with unique per-instance filter IDs. Both bases support all five existing hair styles. Gray painted hair, coat and cape textures are tinted from the existing saved colors. Skin uses a shared luminance transfer to retain light/shadow, dark detail and white highlights without the red shift seen in an early per-channel draft. Foreground/background ordering keeps capes behind the body, hair around the face, and equipment above the correct layer. Named body/hair anchors and skin/coat clipping paths live in avatarAssets.js, separate from persisted choices. The editor displays the whole character; compact cards use a framed head/shoulders portrait with saved shield/companion accents. Pet art remains the shared pet renderer used elsewhere in the game, rather than a separate conflicting identity.

All existing IDs and fields are preserved: boy/girl, six skin colors, five hair styles, seven hair colors, six tunic colors, three optional capes, two optional shields, two optional crowns and five optional companions. No new static portrait ID replaces customization. Valid saved custom hexadecimal colors are honored. normalizeAvatar is render-only, copies input, validates missing/malformed values safely and preserves unknown future fields. The existing profile form/API saves the actual configuration; opening the page does not rewrite it. Appearance stays free as in the existing editor and does not alter coins, XP, ranks, tests, buildings or mastery. No new equipment ownership or unlock economy is invented.

Layer loading falls back from WebP to PNG. If a required layer also fails as PNG, the former configurable SVG renderer remains available as LegacyAvatar.jsx, retaining the same selected choices rather than showing a missing-image box or a default unrelated child. Missing art recovery is tested; a reload retries painted assets. The old avatar options/default exports remain available from Avatar.jsx for existing imports.

## Editor and game integration

The wardrobe uses an illustrated dressing-room background from the existing academy art, a large full-body preview, human-readable color names, 44px color swatches, labelled native selectors, and clearly stated save behavior. Unsaved changes remain local until Save Changes; other children are not modified. The layout stacks on phones without horizontal overflow. No hover-only customization is required. The shared renderer updates dashboard cards, profile cards, practice setup, kingdom and progress views. The active academy also displays the selected child's portrait beside the real gold counter; narrow screens keep both clear of the spelling controls. Pronunciation, audio focus and gameplay remain unchanged.

## Verification and evidence

196 checks pass: 56 core learning/economy checks, 6 avatar compatibility/palette unit tests, 23 avatar browser checks, 37 NPC browser regressions, 36 sound browser checks and 38 expansion/village browser checks. Browser data is isolated synthetic local demo state. Tests cover all styles and skins, save/reload, invalid/missing values, custom colors, future fields, switching children, no coin/XP/progress changes, 375/768 layouts, touch targets, academy integration, PNG fallback and total image failure. The NPC test's old count-of-selects assertion was updated to check actual hair and skin controls because colors are now accessible swatches; the new avatar suite checks the complete saved configuration.

Root and /kingdom-spellers/ production builds and release asset/CNAME/private-value checks pass. No lint task exists. The pre-existing large JavaScript chunk warning remains. Original src/lib/localBackend.js SHA-256 matches .snap/expansion-baseline/localBackend.js; that user edit is not committed by this feature. Cloud expansion function installation and its existing gates are unchanged.

Before: qa/npc-evidence/avatar-polish.png (previous real renderer). After: qa/avatar-evidence/01-wardrobe-desktop.png, 02-wardrobe-375.png, 02-wardrobe-768.png, 03-all-styles-and-skins.png, 04-new-look-preview.png, 05-kingdom-portrait.png and 06-academy-player-portrait.png. The gallery is the real Avatar component rendered with labelled synthetic combinations, not a static mockup. scripts/avatar-gallery.jsx is a local QA harness, not an app route or production feature. Regression evidence/results are in the corresponding qa/avatar-evidence subfolders.

Run npm run dev:demo -- --host 127.0.0.1 --port 3110 --strictPort, then open http://127.0.0.1:3110/ and edit a disposable player. Rules: npm run test:avatars and npm test. Browser: npm run test:avatars:browser, test:npcs:browser, test:sounds:browser and test:expansion:browser. Set QA_URL and PLAYWRIGHT_MODULE for the local environment if needed.

## Deliberate limits

These are layered painted 2D illustrations, not a 3D avatar creator or animated wandering hero system. Existing companions retain their shared artwork. All required player layers are ready; no full concept sheet is used as a sprite. This feature is not deployed, and it makes no cloud transaction, permission or schema changes.
