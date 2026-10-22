# Greenwood Village: stage-one review

Implemented on `feature/greenwood-storybook`; this upgrade is not deployed.

The scene is integrated at the existing `/kingdom/:playerId` route and uses
the existing backend, saved IDs, prices, ranks, and per-child progression.
The 56 baseline game checks and 31 browser integration checks pass.

## Visual evidence

These are captures of the functioning app using synthetic demo profiles.
Scene crops hide the fixed top/bottom navigation solely during capture.
Full-page captures retain the app chrome. Empty views and the completed view
are separate saved test scenarios; the completed view is not a fresh account.

- [Before: desktop](evidence/before-1440.png)
- [After: empty desktop village](evidence/greenwood-empty-1440.png)
- [After: empty phone village](evidence/greenwood-empty-375.png)
- [After: empty tablet village](evidence/greenwood-empty-768.png)
- [After: seven purchased buildings](evidence/greenwood-complete-1440.png)
- [Purchase selection on phone](evidence/after-purchased-mobile.png)
- [Browser check results](evidence/results.json)

## Stage-one acceptance

- [x] Modest starting shelter; no unpurchased full buildings on the map.
- [x] Real clearing/building costs, prosperity, owned/affordable/locked states.
- [x] Saved purchases and legacy boolean values survive refresh.
- [x] Stable ground anchors and depth order for seven distinct structures.
- [x] Semantic map buttons, complete journal, pan, zoom, keyboard navigation.
- [x] 375/768/1440 layouts without page overflow; 44px plot hit targets.
- [x] Reduced motion and loading/error/retry behavior.
- [x] Existing child practice route, rewards and Royal Test behavior checked.
- [x] Root and old project-path asset generation, CNAME and secret-value scan.
- [x] Bottom-left version stamp; README and handoff updated.
- [ ] Owner visual acceptance and real Appwrite account/data validation.
- [ ] Physical mobile camera, pronunciation and touch-device manual checks.

Read [handoff.txt](../handoff.txt) for exact commands, changed files, and known
limits, including the inherited lack of a server transaction across coin and
progress writes. No cloud-data, OCR, or multi-device claims are inferred from
isolated demo tests. The supplied full acceptance checklist remains the gate
for later sprints and production release.
