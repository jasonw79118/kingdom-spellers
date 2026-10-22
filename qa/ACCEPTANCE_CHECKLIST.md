# Release acceptance checklist

## Do not break
- [ ] Existing parent accounts login and logout
- [ ] Child profiles retain previous kingdom XP, rank, currency, word lists, mastered words and purchases
- [ ] Demo/localStorage remains usable without keys; real backend sync tested separately
- [ ] Existing photo word-list import reviewed and approved by parent
- [ ] No backend secrets, passwords, tokens or student data committed

## Sprint 0
- [ ] www.kingdomspellers.com and apex redirect correctly over HTTPS
- [ ] Homepage loads actual app; no blank screen or failed JS/CSS assets
- [ ] Vite `base` works for chosen production target; old project URL redirects or loads appropriately
- [ ] Console free of uncaught errors and fatal warnings

## Sprint 1 Greenwood
- [ ] Initial non-purchased world is visibly sparse and believable
- [ ] Building lot selection explains cost and prerequisite from existing state
- [ ] Only purchased buildings appear fully built and survive refresh/login
- [ ] Buildings use common ground projection, not a collage of unrelated icons
- [ ] Zoom/pan/navigation accessible to mouse, touch and keyboard
- [ ] 375px phone, 768px tablet, 1440px desktop tested
- [ ] Low-motion accessibility honored

## Gameplay
- [ ] Spelling answer evaluated consistently and repeat attempts don't duplicate rewards
- [ ] Progress/membership transitions are stored and child-specific
- [ ] Word definition/source and pronunciation have graceful fallback
- [ ] Parent approves OCR and word meanings
- [ ] Region unlocks, avatar ranks and inventory preserve existing saved IDs

## Handoff evidence
- [ ] README updated, implementation files enumerated
- [ ] Build/test/lint scripts executed with outcomes recorded
- [ ] Before/after visual captures attached if tool capable
- [ ] Bottom-left version stamp updated
- [ ] Outstanding manual tests and known issues written in handoff.txt
