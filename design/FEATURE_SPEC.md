# Product and feature specification

## Play loop
Parent adds/approves words (manual or photo) → Child chooses list → Adventure quest offers 4-10 age-appropriate words → child hears/sees contextual prompts → types or assembles letters → gets constructive feedback → XP/currency + mastery update → unlocks building repair or purchase → kingdom changes persist → next quest.

## Spelling mechanics
- Study and Challenge modes (study supports word reveal; challenge does not show answer before response).
- Word usage sentence that is factual, simple, child-safe and editable by parent; dictionary provenance where present.
- At least three practice modalities: type the word, assemble scrambled letter tiles, listen and spell; don't use voice transcription as a substitute for spelling.
- Incorrect attempts get hints and retries, no public embarrassment; mastery uses spaced review intervals. Expose review queue with logic and parent-visible status.
- Handle repeated words, punctuation, apostrophes, homophones and language fallback; do not silently modify parent spelling list.
- Explain coins/XP reward rules and cap exploits from refreshing/repeating quests.

## Builder
- Reuse current territory and purchase model; no duplicate source of truth.
- Stable coordinate schema per building slot; building sprite layers always match paths and ground plane.
- Persist purchase state server-side where current backend allows; avoid optimistic double charges and race conditions. Demo backend remains functional.
- Buildings should respond to quest resources already earned; no new spend currency without migration and product approval.
- Press building: display title, description, requirements, real price, ownership and upgrade options, then confirm purchase.

## Regions and ranks
- A world-map journey with locked/unlocked/visited states, one clear active region, unique biome palette and landmarks; preserve existing 5 territory definitions if present.
- New regions purchased using original rules. Rank ascension tied to verified milestones and stored status, not arbitrary UI-local calculations.
- Character customization: skin tones, hair, accessories, role-neutral options; cosmetic unlocking must not affect literacy.

## Parent/child experience
- Parent dashboard: word-list creation, camera/photo import with OCR review, approve/edit definitions, assign list to child, see completion/mastery/accuracy trends and prioritize problem words.
- Prevent child from navigating into parent settings without parental gate. No social or chat features by default.
- Strong empty/loading/retry/error states; offline demo mode must be clearly distinguished from cloud-persisted production accounts.

## Accessibility and performance
- Keyboard support with visible focus, labels, instructions, semantic buttons, optional captions, text contrast, reduced motion, audio-off fallback.
- 375px through large desktop, tablet portrait/landscape, no clipped building labels or overlay HUD.
- Minimize bundle size; lazy-load regions. SVG decorative layers should not produce hundreds of inaccessible focus nodes.
