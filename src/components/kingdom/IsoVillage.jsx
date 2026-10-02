// The kingdom scene.
//
// This is a COMPOSER. It owns three things and delegates everything else:
//
//   1. what exists      — stageFor(built, total) decides how much settlement is
//                         on the map at all
//   2. where it goes    — an anchor plan, resolved for collisions at render time
//   3. draw order       — every piece sorted on (gx + gy), so depth is correct
//
// The scene never draws a tile. The 15x15 grid exists for placement, collision
// and saving, and is deliberately invisible: land is an irregular coastline,
// roads and rivers are curves, and a building's artwork overhangs its footprint
// so nothing is ever seen to fit inside a cell.
//
// The single most important behaviour here is the progression gate. See
// `stageFor` in ./scene/layout.js — at 0 buildings the map is mostly wild land
// with a fort on the rise, and it fills in as the player builds. The previous
// implementation drew a complete village unconditionally, which meant a child's
// purchases were invisible because the kingdom looked finished before they
// started.

import { useMemo, useState, useEffect } from "react";
import { shade } from "./iso";
import PetArt from "./petArt";
import { KINGDOMS, PLOT, plotState } from "../../game/kingdom";
import { GROUND, MAT, stageTint } from "./scene/palette";
import {
  at, px, rng, hash2, blob, catmull, distToPath, rect, overlaps,
} from "./scene/geometry";
import {
  N, CRUST, coastline, makeLandTest, makeRelief, makeRiver, makeRoads,
  Terrain, River, Roads, Plaza, Bridge,
} from "./scene/terrain";
import { Tree, Shrub, Hedge, Reeds, Rock, Flowers, woodland, speciesFor } from "./scene/flora";
import { Field } from "./scene/fields";
import { SCALE } from "./scene/homes";
import { ShopHouse, ShopShed, houseFootprint, shedFootprint, ShopPlot, hasPlotArt, plotSeed } from "./scene/shop/place";
import {
  Barrel, Crate, Haystack, Cart, Boat, Dock, Well, Stall, Fence, Signpost,
  Bench, Woodpile, Laundry, Banner, Fountain, Statue, Scarecrow, Campfire,
  Sheep, Cow, Pig, Chicken, Dog, Bird, Furrow, Garden,
} from "./scene/props";
import { Crowd } from "./scene/people";
import { IsoBuildingShapes } from "./IsoBuilding";
import {
  ANCHORS, CASTLE_SITE, DISTRICTS, STAGES, MAX_STAGE, stageFor, stageInfo,
} from "./scene/layout";
import "./IsoVillage.css";

const MID = N / 2;

/**
 * How big the older prop art is, in grid units, measured from the drawings
 * rather than guessed.
 *
 * These specs are drawn at whatever size suited the drawing, and only some of
 * them happen to match the plot they stand on. The well is the clearest case: it
 * is authored 1.5x1.5 units, which puts its 96px of ink on a 0.7x0.7 plot and
 * pushes it over the bakery and the market. Measured in the composed scene, its
 * ink came out 96px wide - exactly (1.5+1.5)*32, which confirms the spec rather
 * than assuming it.
 *
 * So the fallback art is fitted to its plot the same way the illustrated kit is.
 * Only entries listed here are scaled; anything not listed is drawn at its
 * authored size, because most of them already fit and rescaling them would only
 * introduce a new thing that could be wrong.
 */
const LEGACY_FOOTPRINT = {
  well: { w: 1.5, d: 1.5 },
};

/** Uniform scale that makes `id` fit its plot. 1 when there is nothing to fit. */
function legacyFit(id, w, d) {
  const fp = LEGACY_FOOTPRINT[id];
  if (!fp) return 1;
  // 1.06 lets the art bleed very slightly past the plot, which is what the rest
  // of the scene does - a building clipped exactly to its cell reads as tiled.
  return Math.min(w / fp.w, d / fp.d) * 1.06;
}

/** Deterministic per-territory randomness, so a kingdom looks the same daily. */
function useSeeded(seed) {
  return useMemo(() => rng(seed), [seed]);
}

// ---------------------------------------------------------------------------
// The anchor plan
// ---------------------------------------------------------------------------

/**
 * Decide everything that stands on the map, and where.
 *
 * Two passes:
 *   * houses and structures are placed first, by priority, so the important
 *     buildings always get their spot and later items yield to them
 *   * vegetation fills whatever is genuinely left over
 *
 * Placement is done here, at render time, rather than hard-coded per territory.
 * That is what lets the same composition work whether 2 or 7 buildings stand:
 * the anchors are reserved up front either way, so a cottage can never appear
 * where the town hall will go.
 */
function usePlan({ kingdom, stage, p, coast, relief, river, roads, rand }) {
  return useMemo(() => {
    const isLand = makeLandTest(coast);
    const taken = [];
    const items = [];

    // Reserve every gameplay plot, built or not, so decorative pieces never
    // squat on land the player is about to build on.
    const plotRects = [];
    for (const b of kingdom.buildings) {
      const a = ANCHORS[b.id] || { x: 5, y: 5, w: 1.6, d: 1.4 };
      const r = rect(a.x, a.y, a.w, a.d);
      plotRects.push({ id: b.id, building: b, a, r, built: false });
    }
    // The castle site is reserved even before the castle is bought.
    plotRects.push({
      id: "__castle",
      building: { id: "castle" },
      a: { ...CASTLE_SITE, w: 3.4, d: 2.8 },
      r: rect(CASTLE_SITE.x, CASTLE_SITE.y, 3.4, 2.8),
      built: true,
    });
    for (const pr of plotRects) taken.push(pr.r);

    /** Is this spot clear of everything already placed? */
    const free = (r, margin = 0.22) =>
      isLand(r.cx, r.cy) && !taken.some((t) => overlaps(r, t, margin));

    const add = (r, node, bias, tag) => {
      taken.push(r);
      items.push({ depth: r.cx + r.cy + bias, node, tag });
    };

    // -- roads, as walkable corridors --------------------------------------
    const corridor = (x, y, extra = 0) =>
      distToPath(roads.lane, x, y) < 0.75 + extra ||
      distToPath(roads.castleSpur, x, y) < 0.6 + extra ||
      distToPath(roads.bridgeTrack, x, y) < 0.5 + extra;

    // -- 1. the settlement's houses ----------------------------------------
    // These are the largest decorative mass, so they claim space first. Order
    // matters: the lanes are filled from the centre outward, which is how a
    // real village grows and keeps houses from landing in the fields.
    const housePlan = [
      // village lane, either side of the road
      { x: 6.2, y: 4.5, scale: "cottage", face: 0 },
      { x: 8.6, y: 4.2, scale: "cottage", face: 0 },
      { x: 4.4, y: 7.4, scale: "cottage", face: 0 },
      { x: 8.9, y: 7.5, scale: "cottage", face: 0 },
      { x: 10.9, y: 5.4, scale: "cottage", face: 0 },
      { x: 10.6, y: 3.4, scale: "cottage", face: 0 },
      { x: 5.9, y: 8.6, scale: "cottage", face: 0 },
      { x: 3.5, y: 4.6, scale: "cottage", face: 0 },
      { x: 2.9, y: 6.6, scale: "cottage", face: 0 },
      { x: 7.5, y: 2.9, scale: "cottage", face: 0 },
      { x: 9.9, y: 8.2, scale: "cottage", face: 0 },
      { x: 12.1, y: 6.2, scale: "cottage", face: 0 },
      { x: 2.6, y: 8.6, scale: "cottage", face: 0 },
      { x: 11.8, y: 4.4, scale: "cottage", face: 0 },
      { x: 4.8, y: 2.7, scale: "cottage", face: 0 },
      // Outlying holdings, along the lane as it leaves east and climbs the west
      // shoulder. Without these the whole village crowds the square, and check 6
      // (six visibly different houses) cannot pass on four candidates - which is
      // what happened when the lane was rerouted.
      { x: 12.4, y: 7.9, scale: "cottage", face: 0 },
      { x: 12.9, y: 4.8, scale: "cottage", face: 0 },
      { x: 9.6, y: 3.0, scale: "cottage", face: 0 },
      { x: 3.2, y: 4.0, scale: "cottage", face: 0 },
      { x: 1.6, y: 6.2, scale: "cottage", face: 0 },
      { x: 2.4, y: 8.9, scale: "cottage", face: 0 },
      // a second, tighter row behind the market — a cluster, not a grid
      { x: 7.0, y: 10.4, scale: "cottage", face: 0 },
      { x: 5.4, y: 10.9, scale: "cottage", face: 0 },
      { x: 9.0, y: 10.2, scale: "cottage", face: 0 },
      { x: 11.2, y: 9.0, scale: "cottage", face: 0 },
      { x: 3.4, y: 10.6, scale: "cottage", face: 0 },
      { x: 12.4, y: 8.2, scale: "cottage", face: 0 },
    ];
    const shedPlan = [
      { x: 6.6, y: 4.0 }, { x: 9.3, y: 4.7 }, { x: 4.9, y: 7.9 }, { x: 9.6, y: 7.0 },
      { x: 11.4, y: 5.9 }, { x: 10.2, y: 2.9 }, { x: 2.4, y: 5.6 }, { x: 3.0, y: 9.1 },
      { x: 7.9, y: 8.9 }, { x: 12.6, y: 4.9 }, { x: 8.0, y: 1.8 }, { x: 5.0, y: 9.7 },
    ];

    const wantHouses = stageInfo(stage).cottages;
    let variant = 0;
    let shedVariant = 0;
    for (const h of housePlan) {
      if (items.filter((i) => i.tag === "house").length >= wantHouses) break;
      const s = SCALE.house;
      variant += 1;
      // Reserve what the building will actually occupy, not the nominal space
      // it was offered: a scaled cottage is not the same width as a scaled inn,
      // and a layout that reserves one and draws the other overlaps them. The
      // same variant has to pick both, or the rect and the building disagree.
      const fit = houseFootprint(variant, s.w, s.d);
      const r = rect(h.x, h.y, fit.w, fit.d);
      if (!free(r, 0.16)) continue;
      // A house should front onto a road, not float in a field. Most candidates must
      // be able to see a road, which is what creates real clusters - but it cannot
      // be a hard rule, or the scene's shape is decided by where the roads happen
      // to run. Every third candidate is exempt, so the requirement shapes the
      // layout without being able to empty it: rerouting a lane moves houses
      // around, it does not silently delete them.
      if (!corridor(h.x + fit.w / 2, h.y + fit.d / 2, 0.3) && variant % 3 !== 0) continue;
      add(r, (
        <ShopHouse
          x={h.x} y={h.y} z={relief.at(h.x + fit.w / 2, h.y + fit.d / 2)}
          w={s.w} d={s.d} variant={variant}
        />
      ), 0.7, "house");
    }

    for (const sh of shedPlan) {
      if (items.filter((i) => i.tag === "shed").length >= Math.max(0, Math.round(wantHouses / 3))) break;
      const s = SCALE.shed;
      shedVariant += 1;
      const fit = shedFootprint(shedVariant, s.w, s.d);
      const r = rect(sh.x, sh.y, fit.w, fit.d);
      if (!free(r, 0.1)) continue;
      add(r, (
        <ShopShed
          x={sh.x} y={sh.y} z={relief.at(sh.x + fit.w / 2, sh.y + fit.d / 2)}
          w={s.w} d={s.d} variant={shedVariant}
        />
      ), 0.4, "shed");
    }

    // -- 2. market stalls, in a row around the square ----------------------
    const wantStalls = stageInfo(stage).stalls;
    const stallPlan = [
      { x: 7.1, y: 5.0, tone: "#c1503f" }, { x: 8.4, y: 5.2, tone: "#4a6fa5" },
      { x: 7.0, y: 6.9, tone: "#d98a3c" }, { x: 8.6, y: 7.0, tone: "#7a5a8c" },
      { x: 9.9, y: 6.1, tone: "#3f7f8a" }, { x: 6.1, y: 6.1, tone: "#c1503f" },
      { x: 10.1, y: 5.0, tone: "#4a6fa5" }, { x: 7.9, y: 4.4, tone: "#d98a3c" },
    ];
    for (const st of stallPlan) {
      if (items.filter((i) => i.tag === "stall").length >= wantStalls) break;
      const r = rect(st.x, st.y, 0.9, 0.7);
      if (!free(r, 0.05)) continue;
      add(r, <Stall x={st.x} y={st.y} z={relief.at(st.x, st.y)} awning={st.tone} seed={variant++} />, 0.5, "stall");
    }

    // -- 3. fields, on the outskirts ---------------------------------------
    // These used to be four-cornered polygons sitting on the plot's grid lines,
    // which is the one shape that gives an isometric scene's cell grid away. The
    // scene audit counted exactly eight of them and that was eight failed quads,
    // not a coincidence: the count matched fieldPlan.length.
    //
    // Each field is now an irregular blob bounded by its own hedgerow, with
    // ploughed rows trimmed to that boundary, a gate on the side facing the
    // village, and a crop stage that differs from its neighbours. The crops are
    // staggered on purpose - four standing-gold fields in a row reads as one
    // field repeated, which is what the old "all fields are grain or all green"
    // plan amounted to.
    const wantFields = stageInfo(stage).fields;
    // Positions are fitted around the road network, not the other way round. They
    // used to tile the whole southern band, which left no corridor for the lane
    // and forced the road either to plough through the fields or to hug a
    // straight line. A field needs a gate and somewhere for the track to come
    // from, so the pockets are chosen first and the roads routed between them.
    const fieldPlan = [
      { x: 10.9, y: 1.4, w: 1.5, d: 1.2, dir: "x", crop: "grain" },
      { x: 12.7, y: 2.5, w: 1.2, d: 1.2, dir: "y", crop: "stubble" },
      { x: 9.2, y: 2.4, w: 1.1, d: 1.0, dir: "x", crop: "green" },
      { x: 10.6, y: 11.4, w: 1.5, d: 1.1, dir: "x", crop: "barley" },
      { x: 12.4, y: 9.5, w: 1.2, d: 1.1, dir: "y", crop: "fallow" },
      { x: 1.4, y: 11.2, w: 1.3, d: 1.0, dir: "y", crop: "green" },
      { x: 4.6, y: 12.0, w: 1.1, d: 0.9, dir: "x", crop: "grain" },
      { x: 12.9, y: 7.6, w: 1.1, d: 1.2, dir: "x", crop: "stubble" },
    ];
    for (const f of fieldPlan) {
      if (items.filter((i) => i.tag === "field").length >= wantFields) break;
      const r = rect(f.x, f.y, f.w, f.d);
      if (!free(r, 0.3)) continue;
      // Drape, rather than a single z for the whole field: a field pinned to one
      // height while the hill beneath it rises is one of the ways a scene
      // announces it was assembled.
      const zAt = (gx, gy) => relief.at(gx, gy);
      add(r, (
        <Field
          x={f.x}
          y={f.y}
          w={f.w}
          d={f.d}
          dir={f.dir}
          crop={f.crop}
          zAt={zAt}
          seed={items.length + 1}
          hedge={f.crop === "fallow" ? "#6a8f4a" : "#4e8b4a"}
        />
      ), -0.4, "field");
    }

    // -- 4. gardens behind the cottages ------------------------------------
    const wantBeds = stageInfo(stage).gardenBeds;
    const bedPlan = [
      { x: 5.0, y: 5.0 }, { x: 9.7, y: 4.9 }, { x: 3.7, y: 8.4 }, { x: 10.1, y: 7.2 },
      { x: 6.4, y: 3.4 }, { x: 4.1, y: 3.7 }, { x: 8.0, y: 8.6 }, { x: 12.4, y: 5.3 },
      { x: 2.2, y: 7.5 }, { x: 11.4, y: 3.5 }, { x: 6.2, y: 9.6 }, { x: 9.2, y: 9.0 },
    ];
    for (const b of bedPlan) {
      if (items.filter((i) => i.tag === "bed").length >= wantBeds) break;
      const r = rect(b.x, b.y, 0.9, 0.7);
      if (!free(r, 0.06)) continue;
      add(r, <Garden x={b.x} y={b.y} z={relief.at(b.x, b.y)} seed={items.length} />, 0.1, "bed");
    }

    // -- 5. walls and hedges, defining blocks --------------------------------
    if (stageInfo(stage).walls) {
      for (const [pts, tag] of [
        [[[3.0, 4.2], [4.6, 5.0], [5.2, 6.4]], "hedge"],
        [[[9.9, 4.0], [11.2, 4.6], [11.8, 6.0]], "hedge"],
        [[[2.2, 10.0], [3.6, 10.6], [4.4, 11.6]], "fence"],
      ]) {
        const mid = pts[Math.floor(pts.length / 2)];
        const r = rect(mid[0] - 0.9, mid[1] - 0.9, 1.8, 1.8);
        if (!free(r, -0.3)) continue;
        items.push({ depth: mid[0] + mid[1] - 0.4, node: tag === "hedge" ? <HedgeRun points={pts} z={relief.at(mid[0], mid[1])} color={p.oak} /> : <Fence points={pts} z={relief.at(mid[0], mid[1])} />, tag });
      }
    }

    // -- 6. riverside dressing ----------------------------------------------
    for (let i = 0; i < 26; i += 1) {
      const t = i / 25;
      const idx = Math.round(t * (river.length - 1));
      const [rx, ry] = river[idx];
      const side = i % 2 ? 1 : -1;
      const x = rx + side * 0.9;
      const y = ry + 0.35;
      if (!isLand(x, y)) continue;
      items.push({ depth: x + y - 0.2, node: i % 3 === 0 ? <Reeds x={x} y={y} seed={i} /> : <Rock x={x} y={y} s={0.6 + rand() * 0.5} color={p.rockDark} seed={i} />, tag: "bank" });
    }

    // -- 7. woodland, in CLUSTERS outside the settlement --------------------
    // The old scene scattered trees evenly, which is why the map read as
    // "clusters of green circles" and the trees overwhelmed the buildings.
    // Woodland now grows where nothing has been built, in ragged belts, and
    // the village keeps only small planted trees, hedges and gardens.
    const woodFraction = stageInfo(stage).woodland;
    // Every species appears in every wood, deliberately. A wood seeded from a
    // short kind list ("oak, oak, pine") can roll nothing but those two, and then
    // the map's tree variety is decided by a coin toss rather than by the art -
    // which is how the audit was reporting three species on one kingdom and four
    // on another. Listing all four in each seed makes the mix deliberate.
    const woodSeeds = [
      { cx: 12.0, cy: 3.0, radius: 2.4, count: 16, kinds: ["oak", "oak", "pine", "birch", "young"] },
      { cx: 1.4, cy: 4.4, radius: 1.9, count: 11, kinds: ["oak", "pine", "birch", "young"] },
      { cx: 2.2, cy: 12.4, radius: 1.7, count: 9, kinds: ["pine", "oak", "young", "birch"] },
      { cx: 13.0, cy: 11.4, radius: 1.8, count: 10, kinds: ["oak", "birch", "pine", "young"] },
      { cx: 13.4, cy: 6.0, radius: 1.5, count: 7, kinds: ["pine", "oak", "birch", "young"] },
      { cx: 6.0, cy: 0.9, radius: 1.6, count: 8, kinds: ["pine", "oak", "young", "birch"] },
      { cx: 9.4, cy: 13.2, radius: 1.5, count: 7, kinds: ["oak", "birch", "pine", "young"] },
    ];
    for (const w of woodSeeds) {
      const n = Math.round(w.count * woodFraction);
      for (const t of woodland({ cx: w.cx, cy: w.cy, radius: w.radius, count: n, rand, p, seed: w.cx * 31, kinds: w.kinds })) {
        const r = rect(t.x - 0.3, t.y - 0.3, 0.6, 0.6);
        if (!free(r, -0.05)) continue;
        items.push({ depth: t.x + t.y, node: <Tree x={t.x} y={t.y} z={relief.at(t.x, t.y)} s={t.s} kind={t.kind} p={p} seed={t.seed} />, tag: "tree" });
      }
    }

    // -- 8. undergrowth and flowers in what's left -------------------------
    const wantProps = stageInfo(stage).props;
    const scatterBudget = wantProps;
    let placed = 0;
    for (let i = 0; i < 900 && placed < scatterBudget; i += 1) {
      const x = 0.4 + rand() * (N - 0.8);
      const y = 0.4 + rand() * (N - 0.8);
      if (distToPath(river, x, y) < 0.7) continue;
      const r = rect(x - 0.22, y - 0.22, 0.44, 0.44);
      if (!free(r, 0)) continue;
      const roll = rand();
      let node;
      let tag = "scatter";
      if (roll < 0.3) { node = <Shrub x={x} y={y} z={relief.at(x, y)} s={0.7 + rand() * 0.5} color={p.oak} seed={i} />; tag = "shrub"; }
      else if (roll < 0.56) { node = <Tree x={x} y={y} z={relief.at(x, y)} s={0.42 + rand() * 0.2} kind={speciesFor(rand)} p={p} seed={i} />; tag = "sapling"; }
      else if (roll < 0.78) { node = <Flowers x={x} y={y} z={relief.at(x, y)} s={0.8 + rand() * 0.5} color={["#ffd76a", "#ff9ec4", "#ffffff", "#c8a8ff"][Math.floor(rand() * 4)]} seed={i} />; }
      else { node = <Rock x={x} y={y} s={0.5 + rand() * 0.4} color={p.rock} seed={i} />; }
      add(r, node, 0, tag);
      placed += 1;
    }

    // -- 9. named props: the things a village actually has -----------------
    // Each prop lists several candidate spots and takes the first that is clear.
    //
    // A single hard-coded coordinate per prop means the village's props are
    // positioned against a layout that no longer exists: rerouting the lane moved
    // the houses, and `free()` then rejected a cart, two barrels, a crate, two
    // benches, two laundry lines, a campfire and a statue without a word. That is
    // the worst possible failure for artwork — it disappears quietly, so the scene
    // just looks emptier and nothing reports why. A candidate list makes placement
    // robust to the layout changing underneath it, which it always will.
    const propPlan = [
      { kind: "cart", s: 1, loaded: true, spots: [[5.4, 6.9], [6.1, 6.6], [4.7, 7.2], [6.6, 6.3]] },
      { kind: "cart", s: 0.9, loaded: false, spots: [[9.6, 6.4], [10.2, 6.1], [9.1, 6.7], [10.7, 6.4]] },
      { kind: "barrel", s: 1, spots: [[6.3, 8.0], [5.7, 7.6], [6.8, 7.4], [5.2, 7.8]] },
      { kind: "barrel", s: 0.85, spots: [[6.7, 8.1], [7.1, 7.6], [6.1, 7.3], [5.5, 8.2]] },
      { kind: "crate", s: 1, stack: 2, spots: [[8.9, 5.9], [8.4, 5.5], [9.4, 5.5], [8.0, 6.1]] },
      // Haystacks stand in the field margins: field A (10.9,1.4) and D (10.6,11.4).
      { kind: "hay", s: 0.9, spots: [[12.4, 1.9], [12.0, 2.6], [12.6, 1.2], [11.6, 2.8]] },
      { kind: "hay", s: 0.8, spots: [[9.5, 12.6], [9.1, 11.9], [9.9, 13.2], [8.7, 12.9]] },
      { kind: "woodpile", s: 1, spots: [[4.4, 5.1], [4.0, 5.6], [3.6, 4.7], [4.9, 5.5]] },
      { kind: "woodpile", s: 0.9, spots: [[10.9, 3.9], [11.4, 4.3], [10.4, 4.4], [11.9, 3.6]] },
      { kind: "signpost", s: 1, spots: [[5.1, 6.4], [5.6, 6.2], [4.6, 6.6], [6.1, 6.1]] },
      { kind: "signpost", s: 0.9, spots: [[9.2, 5.4], [8.7, 5.0], [9.7, 5.0], [8.2, 5.7]] },
      // Benches face the square, on its western and northern sides.
      { kind: "bench", s: 1, spots: [[6.5, 6.9], [6.3, 6.3], [7.0, 7.3], [6.0, 7.5]] },
      { kind: "bench", s: 0.9, spots: [[8.6, 5.9], [8.1, 6.2], [9.1, 6.3], [7.9, 5.5]] },
      { kind: "laundry", s: 1, spots: [[3.0, 5.5], [2.6, 5.9], [3.5, 5.1], [2.2, 5.2]] },
      { kind: "laundry", s: 0.9, spots: [[9.9, 5.1], [10.4, 5.5], [9.4, 4.7], [10.9, 5.1]] },
      // Scarecrows stand among the crops they guard.
      { kind: "scarecrow", s: 1, spots: [[11.2, 11.9], [10.9, 11.6], [11.5, 12.2]] },
      { kind: "scarecrow", s: 0.9, spots: [[4.9, 12.3], [5.3, 12.6], [4.5, 11.8]] },
      { kind: "campfire", s: 1, spots: [[4.3, 9.6], [3.9, 10.0], [4.8, 9.9], [3.5, 9.3]] },
      { kind: "boat", s: 1, angle: 12, spots: [[4.0, 7.9], [3.6, 8.2], [4.5, 8.3]] },
      { kind: "boat", s: 0.9, angle: -8, spots: [[10.8, 9.3], [11.2, 9.6], [10.4, 9.6]] },
      { kind: "statue", s: 1, spots: [[7.4, 4.5], [7.0, 4.9], [6.6, 4.3], [7.9, 4.9]] },
      { kind: "banner", s: 1, color: "#c1503f,✦", spots: [[4.5, 4.0], [4.0, 4.4], [5.0, 4.4], [3.6, 3.7]] },
      { kind: "banner", s: 0.95, color: "#4a6fa5,⚜", spots: [[8.8, 7.9], [8.4, 8.2], [9.3, 8.2], [8.0, 7.6]] },
    ];
    // The budget is spent one kind at a time, round-robin.
    //
    // This list was previously consumed in array order, so a budget of 7 took the
    // first seven entries - cart, cart, barrel, barrel, crate, hay, hay - and the
    // remaining six kinds were never drawn at all. Variety was being decided by
    // list position, and the audit reported 7 prop kinds on a scene that has 13
    // kinds available. Interleaving means a small budget buys breadth rather than
    // a third cart, which is also the better-looking outcome: a village reads as
    // inhabited by the range of things in it, not the quantity of one thing.
    const byKind = new Map();
    for (const pr of propPlan) {
      if (!byKind.has(pr.kind)) byKind.set(pr.kind, []);
      byKind.get(pr.kind).push(pr);
    }
    const propOrder = [];
    for (let round = 0; propOrder.length < propPlan.length; round += 1) {
      let added = false;
      for (const list of byKind.values()) {
        if (list[round]) { propOrder.push(list[round]); added = true; }
      }
      if (!added) break;
    }
    const propCount = Math.round(wantProps / 1.6);
    let propPlaced = 0;
    for (const pr of propOrder) {
      if (propPlaced >= propCount) break;
      // Take the first clear candidate spot.
      let spot = null;
      for (const [sx, sy] of pr.spots) {
        const rr = rect(sx - 0.3, sy - 0.3, 0.6, 0.6);
        if (free(rr, -0.05)) { spot = [sx, sy, rr]; break; }
      }
      if (!spot) continue;
      const [sx, sy, r] = spot;
      const z = relief.at(sx, sy);
      // `spots` is placement bookkeeping and is not part of the prop's appearance, so
      // it is dropped from the spread rather than passed into every component.
      const a = { ...pr, x: sx, y: sy };
      delete a.spots;
      const node = pr.kind === "cart" ? <Cart {...a} z={z} />
        : pr.kind === "barrel" ? <Barrel {...a} z={z} />
        : pr.kind === "crate" ? <Crate {...a} z={z} />
        : pr.kind === "hay" ? <Haystack {...a} z={z} />
        : pr.kind === "woodpile" ? <Woodpile {...a} z={z} />
        : pr.kind === "signpost" ? <Signpost {...a} z={z} />
        : pr.kind === "bench" ? <Bench {...a} z={z} />
        : pr.kind === "laundry" ? <Laundry {...a} z={z} />
        : pr.kind === "scarecrow" ? <Scarecrow {...a} z={z} />
        : pr.kind === "campfire" ? <Campfire {...a} z={z} />
        : pr.kind === "boat" ? <Boat {...a} z={z} />
        : pr.kind === "statue" ? <Statue {...a} z={z} />
        : <Banner {...a} z={z} />;
      add(r, node, 0.2, "prop");
      propPlaced += 1;
    }

    // -- 10. livestock, in the field margins --------------------------------
    const wantStock = stageInfo(stage).livestock;
    const stockPlan = [
      { kind: "sheep", x: 3.0, y: 12.0, s: 1 }, { kind: "sheep", x: 3.7, y: 12.4, s: 0.9 },
      { kind: "sheep", x: 10.9, y: 11.9, s: 1 }, { kind: "cow", x: 11.7, y: 11.4, s: 1 },
      { kind: "cow", x: 2.2, y: 10.2, s: 0.95 }, { kind: "chicken", x: 6.8, y: 7.2, s: 1 },
      { kind: "chicken", x: 7.1, y: 7.5, s: 0.9 }, { kind: "chicken", x: 6.5, y: 7.6, s: 0.95 },
      { kind: "pig", x: 8.4, y: 11.4, s: 1 }, { kind: "dog", x: 7.8, y: 6.5, s: 0.9 },
      { kind: "dog", x: 4.6, y: 6.6, s: 0.85 }, { kind: "bird", x: 5.6, y: 5.4, s: 1 },
    ];
    let stockPlaced = 0;
    for (const s of stockPlan) {
      if (stockPlaced >= wantStock) break;
      const r = rect(s.x - 0.2, s.y - 0.2, 0.4, 0.4);
      if (!free(r, -0.15)) continue;
      const z = relief.at(s.x, s.y);
      const Cmp = { sheep: Sheep, cow: Cow, pig: Pig, dog: Dog, chicken: Chicken, bird: Bird }[s.kind];
      add(r, <Cmp x={s.x} y={s.y} z={z} s={s.s} />, 0.3, "stock");
      stockPlaced += 1;
    }

    items.sort((a, b) => a.depth - b.depth);
    return { items, plotRects, isLand };
  }, [kingdom, stage, p, coast, relief, river, roads, rand]);
}

/** A hedge run between several points. */
function HedgeRun({ points, z, color }) {
  return (
    <g>
      {points.map(([hx, hy], i) => (
        <Hedge key={i} x={hx} y={hy} len={1.5} angle={0.78} z={z} color={color} />
      ))}
    </g>
  );
}

// ---------------------------------------------------------------------------
// Villager traffic
// ---------------------------------------------------------------------------

/** Who walks where, and how fast. Deterministic, so the crowd never flickers. */
function useWalkers(stage, roads) {
  return useMemo(() => {
    const want = stageInfo(stage).people;
    if (!want) return [];
    const out = [];
    const lanes = [roads.lane, roads.lane, roads.castleSpur, roads.bridgeTrack, roads.bridgeTrack, roads.lane];
    for (let i = 0; i < want; i += 1) {
      const path = lanes[i % lanes.length];
      out.push({
        path,
        speed: 0.05 + ((i * 37) % 11) * 0.006,
        offset: ((i * 53) % 100) / 100,
        seed: i * 13 + 3,
        s: 0.95 + ((i * 17) % 5) * 0.05,
        carry: i % 4 === 0 ? "basket" : i % 4 === 1 ? "sack" : null,
      });
    }
    return out;
  }, [stage, roads]);
}

/**
 * A single shared clock. One state value drives every villager, so the crowd
 * moves as one system and React re-renders once rather than once per person.
 */
function useVillageClock(running) {
  const [clock, setClock] = useState(0);
  useEffect(() => {
    if (!running) return undefined;
    let raf = 0;
    let last = performance.now();
    const tick = (now) => {
      const dt = (now - last) / 1000;
      last = now;
      setClock((c) => (c + dt * 0.1) % 1000);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running]);
  return clock;
}

// ---------------------------------------------------------------------------
// The composer
// ---------------------------------------------------------------------------

export default function IsoVillage({
  kingdomId, built = {}, onSelectPlot, companion, buildMode = false, rank = 0, animate = true,
}) {
  const kingdom = useMemo(() => KINGDOMS.find((k) => k.id === kingdomId) || KINGDOMS[0], [kingdomId]);
  const p = GROUND[kingdom.theme] || GROUND.forest;

  const builtCount = kingdom.buildings.filter((b) => plotState(built, b.id) === PLOT.BUILT).length;
  const totalCount = kingdom.buildings.length;
  const stage = stageFor(builtCount, totalCount);
  const info = stageInfo(stage);

  const rand = useSeeded(kingdom.id * 7919 + 13);
  const coast = useMemo(() => coastline(kingdom.id * 13 + 5), [kingdom.id]);
  const relief = useMemo(() => makeRelief(p, kingdom.id * 17 + 3), [p, kingdom.id]);
  const river = useMemo(() => makeRiver(kingdom.id), [kingdom.id]);
  const roads = useMemo(() => makeRoads(), []);

  const plan = usePlan({ kingdom, stage, p, coast, relief, river, roads, rand });
  const walkers = useWalkers(stage, roads);
  const clock = useVillageClock(animate && walkers.length > 0);

  // The built buildings, drawn on top of the settlement with a bias so a
  // player's own purchases always read as the nearest, most prominent thing.
  const builtItems = useMemo(() => {
    const out = [];
    for (const b of kingdom.buildings) {
      if (plotState(built, b.id) !== PLOT.BUILT) continue;
      const a = ANCHORS[b.id] || { x: 5, y: 5, w: 1.6, d: 1.4 };
      const z = relief.at(a.x + a.w / 2, a.y + a.d / 2);
      // Where the illustrated kit has something for this plot it is used, and
      // the older prop art is kept for the plots it has nothing for - a well
      // and a castle are not the same kind of thing as a cottage, and swapping
      // them for a small house would be a downgrade dressed as an upgrade.
      // The plot's own w/d are passed in so the art is fitted to the space the
      // gameplay already reserved, rather than overhanging into its neighbours.
      const art = hasPlotArt(b.id)
        ? <ShopPlot id={b.id} w={a.w} d={a.d} seed={plotSeed(b.id)} lit />
        : <IsoBuildingShapes id={b.id} scale={legacyFit(b.id, a.w, a.d)} />;
      out.push({
        depth: a.x + a.w / 2 + a.y + a.d / 2 + 1.4,
        node: (
          <g
            data-role="building"
            data-subrole="purchased"
            data-id={b.id}
            data-gx={a.x.toFixed(2)}
            data-gy={a.y.toFixed(2)}
            transform={`translate(${at(a.x, a.y, px(z)).x} ${at(a.x, a.y, px(z)).y})`}
          >
            {art}
          </g>
        ),
      });
    }
    out.sort((a, b) => a.depth - b.depth);
    return out;
  }, [kingdom, built, relief]);

  // Build Mode: legal placement areas, footprint highlights, and nothing else.
  // Outside Build Mode these are entirely absent, so the grid is never visible.
  const plotOverlays = useMemo(() => {
    if (!buildMode) return [];
    const out = [];
    for (const b of kingdom.buildings) {
      if (plotState(built, b.id) === PLOT.BUILT) continue;
      const a = ANCHORS[b.id] || { x: 5, y: 5, w: 1.6, d: 1.4 };
      const state = plotState(built, b.id);
      const corners = [[a.x, a.y], [a.x + a.w, a.y], [a.x + a.w, a.y + a.d], [a.x, a.y + a.d], [a.x, a.y]];
      out.push({
        depth: a.x + a.y + 0.9,
        node: (
          <g
            className="iso-plot"
            data-role="plot"
            data-id={b.id}
            data-state={state}
            onClick={onSelectPlot ? () => onSelectPlot(b) : undefined}
            style={{ cursor: onSelectPlot ? "pointer" : "default" }}
            role={onSelectPlot ? "button" : undefined}
            aria-label={`${state === PLOT.WILD ? "Wild land" : "Cleared land"} — ${b.name}`}
          >
            <polygon
              points={corners.map(([cx, cy]) => `${at(cx, cy).x},${at(cx, cy).y + 3}`).join(" ")}
              fill={state === PLOT.WILD ? "#3f6b3a" : "#c9b48c"}
              opacity={0.42}
            />
            <polygon
              points={corners.map(([cx, cy]) => `${at(cx, cy).x},${at(cx, cy).y}`).join(" ")}
              fill="none"
              stroke={state === PLOT.WILD ? "#e8dcc0" : "#ffe9a8"}
              strokeWidth={2}
              strokeDasharray={state === PLOT.WILD ? "7 5" : undefined}
            />
            {state === PLOT.WILD && (
              <g>
                <Tree x={a.x + 0.2} y={a.y + 0.2} s={0.6} kind="oak" p={p} seed={3} />
                <Tree x={a.x + a.w - 0.35} y={a.y + a.d - 0.4} s={0.5} kind="pine" p={p} seed={7} />
                <Shrub x={a.x + a.w * 0.5} y={a.y + 0.35} s={0.8} color={p.oak} seed={5} />
              </g>
            )}
            {state !== PLOT.WILD && <Rock x={a.x + a.w * 0.5} y={a.y + a.d * 0.5} s={0.7} color={p.rock} seed={9} />}
          </g>
        ),
      });
    }
    out.sort((a, b) => a.depth - b.depth);
    return out;
  }, [buildMode, kingdom, built, onSelectPlot, p]);

  // The bridge is placed once the settlement reaches the river.
  const bridgeItems = useMemo(() => {
    if (stage < 1) return [];
    return [{ depth: 7.4 + 9.0, node: <Bridge x={6.7} y={7.6} p={p} span={2.6} /> }];
  }, [stage, p]);

  // Sky: a warm wash that strengthens as the kingdom flourishes, so a developed
  // region literally looks brighter than a wild one.
  const glow = stageTint(kingdom.theme, stage);

  // The viewBox is derived from the actual coastline rather than a magic
  // constant, so the land fills the frame instead of floating in it. The castle
  // mound sits above the land, hence the extra headroom, and the crust hangs
  // below it, hence the footroom.
  const vb = useMemo(() => {
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const [gx, gy] of coast) {
      const s = at(gx, gy);
      if (s.x < minX) minX = s.x;
      if (s.x > maxX) maxX = s.x;
      if (s.y < minY) minY = s.y;
      if (s.y > maxY) maxY = s.y;
    }
    // Trees and buildings on the shore overhang the coast, so the side padding
    // covers a canopy's worth of screen, not a hairline.
    const padX = 62;
    const padTop = 224;   // the keep stands on the high ground and towers over it
    const padBottom = CRUST + 22;
    return `${Math.round(minX - padX)} ${Math.round(minY - padTop)} ${Math.round(maxX - minX + padX * 2)} ${Math.round(maxY - minY + padTop + padBottom)}`;
  }, [coast]);

  // Rivers and roads run past the coast, so they are clipped to the land. A
  // river that floats in the sky beside the island is the single most obvious
  // tell that a scene is a diagram rather than a place.
  const coastClip = useMemo(() => {
    const pts = [...coast, coast[0]].map(([gx, gy]) => {
      const s = at(gx, gy);
      return `${Math.round(s.x * 10) / 10},${Math.round(s.y * 10) / 10}`;
    });
    return `M${pts.join("L")}Z`;
  }, [coast]);

  return (
    <div className="iso-wrap">
      <svg viewBox={vb} width="100%" style={{ display: "block" }} role="img"
        aria-label={`${kingdom.name}. ${info.name}. ${builtCount} of ${totalCount} buildings built.`}
        className="iso-svg"
      >
        <defs>
          <radialGradient id={`ks-sky-${kingdom.theme}`} cx="0.5" cy="0.24" r="0.9">
            <stop offset="0%" stopColor={shade(glow, 0.5)} />
            <stop offset="55%" stopColor={glow} />
            <stop offset="100%" stopColor={shade(p.grassLight, -0.06)} />
          </radialGradient>
          <linearGradient id={`ks-water-${kingdom.theme}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={p.waterLight} />
            <stop offset="100%" stopColor={p.waterDeep} />
          </linearGradient>
          <filter id="ks-soft" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
          <clipPath id={`ks-land-${kingdom.theme}`}>
            <path d={coastClip} />
          </clipPath>
        </defs>

        <rect x={-900} y={-600} width={1800} height={1200} fill={`url(#ks-sky-${kingdom.theme})`} />

        <Terrain p={p} coast={coast} relief={relief} mid={MID} seed={kingdom.id * 7 + 29} />
        {/* Water and roads are clipped to the coastline: they enter and leave the
            map at the shore instead of running off into the sky. */}
        <g clipPath={`url(#ks-land-${kingdom.theme})`}>
          <River p={p} path={river} />
          <Roads p={p} roads={roads} paved={info.roadPaved} />
        </g>
        {stage >= 2 && <Plaza x={7.6} y={6.3} p={p} r={1.9} />}
        {stage >= 2 && <Fountain x={7.6} y={6.3} p={p} s={1} />}

        {plan.items.map((it, i) => <g key={i}>{it.node}</g>)}
        {bridgeItems.map((it, i) => <g key={`br${i}`}>{it.node}</g>)}
        {plotOverlays.map((it, i) => <g key={`po${i}`}>{it.node}</g>)}
        {builtItems.map((it, i) => <g key={`bi${i}`}>{it.node}</g>)}

        {walkers.length > 0 && <Crowd walkers={walkers} clock={clock} />}

        {companion && (
          <g
            className="iso-companion"
            transform={`translate(${at(5.0, 7.4, 14).x} ${at(5.0, 7.4, 14).y})`}
          >
            <PetArt id={companion} size={52} label="Your companion" />
          </g>
        )}
      </svg>

      <div className="iso-caption">
        <strong>{kingdom.name}</strong>
        <span className="iso-stage">{info.name}</span>
        <span className="iso-count">{builtCount}/{totalCount} built</span>
      </div>
    </div>
  );
}
