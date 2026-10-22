# Visual art bible

## Visual north star
`assets/reference/01_greenwood_village_overview.png` is the visual north star. Colorful hand-painted cozy medieval village, three-quarter game-camera view, rich timber-and-stone construction, blue/gold crests, winding paths, gardens, trees, water, lantern light. Avoid flat black outlines, uninspired rectangular boxes and inconsistent perspective.

## Layer composition
A scene is built in this order: static sky/horizon (optional); landscape terrain; water and shoreline; roads/ground cover; undergrowth; lower trees/fences; owned interactive buildings; tall trees/foreground props; highlights and selection FX; UI overlays. Buildings should cast contact shadows. Use consistent ground anchor at each structure's lowest point.

## Placement and sprite rules
Each building receives its own slot coordinate normalized to 0..1 scene dimensions; sizes are per-building. To avoid scene crowding, prioritize main village arc and leave blank buildable plots. Use a hardcoded slot layout only as a *layout blueprint*; actual ownership is persisted state. Never show every supplied building as owned to a new player.

## Art deliverables by production phase
- Phase 1: working layered terrain/paths/river (new art production required), cottage, academy, library, marketplace, town hall, tower, simple site markers, install and pop animation.
- Phase 2: three level states per major building (foundation, standard, grand) and 6+ decor types (fences, trees, lamps, banners, flowerbeds, bridge). **The existing PNGs depict one concept each**, not all these variants.
- Phase 3: five distinct region scene sets: Greenwood Forest (village), Suncrest Plains (farmland), Stonehelm Mountains (stone mining), Emberreach (volcanic fantasy), Tidemoor (coast and harbor). Names are proposed; defer to existing canonical region names if different.
- Phase 4: male and female avatar base variants, customizable skin/hair/face/clothes without paywall, five rank silhouettes from Esquire to King/Queen. The composite board is a visual reference; it is NOT cut-out production sprites.

## Optimization
Preferred formats: WebP/AVIF for decor art with tested fallback PNG. Generate thumbnail variants for shop inventory, avoid loading all regions at once. Keep overlays accessible, meet contrast requirements, provide reduced-motion mode and avoid flickering effects. No third-party copyrighted game assets.
