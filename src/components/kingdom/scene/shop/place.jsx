// Placing the illustrated buildings on the kingdom grid.
//
// The five buildings in buildings.jsx are drawn at their own natural size - a
// cottage really is 2.3 grid units across, and a manor really is 2.4 - which is
// correct when you are judging architecture in isolation and useless when you
// are composing a village, where the same cottage has to sit among eleven
// others without touching any of them.
//
// So this module is the join between the two. It declares the real footprint of
// every asset, and scales an asset to whatever space the caller has. Scaling is
// uniform on purpose: a non-uniform scale would stretch the roof pitch and the
// timber spacing, and a cottage with a shallow roof stops being a cottage.
//
// Nothing here knows about game state. It converts "a building at this grid
// position, at this ground height, in this much room" into geometry. That
// separation is deliberate - it is the reason the art can change without any
// chance of changing what the player owns.

import { at, px } from "../geometry";
import { Cottage, Blacksmith, Inn, Manor, FarmBuilding } from "./buildings";
import { Castle } from "./castle";

/**
 * Asset metadata. `w`/`d` include every part that sticks out past the walls -
 * cross-wings, lean-tos, the forge bay - so a footprint is the true ground
 * occupied, not the nominal block.
 */
export const SHOP = {
  cottage: { w: 2.27, d: 2.03, h: 1.5, draw: Cottage },
  blacksmith: { w: 1.92, d: 1.0, h: 1.9, draw: Blacksmith },
  inn: { w: 2.31, d: 1.63, h: 1.8, draw: Inn },
  manor: { w: 2.4, d: 1.75, h: 1.92, draw: Manor },
  farm: { w: 2.82, d: 1.35, h: 1.46, draw: FarmBuilding },

  /**
   * The castle. `w`/`d` are the walled enclosure, not everything the asset
   * draws: the gatehouse block projects a further 0.42 past the curtain on the
   * gate side, and the drawbridge and moat reach 0.92 beyond that.
   *
   * Those are allowed to bleed past the footprint deliberately. A castle whose
   * moat stops exactly at its plot boundary reads as a diagram; the moat and
   * the lowered drawbridge are the two things that make it look founded on
   * ground rather than placed on it. The walled enclosure is what reserves
   * space, and it is what stops the castle growing into its neighbours.
   */
  castle: { w: 3.6, d: 3.42, h: 2.9, draw: Castle },
};

/**
 * Which illustrated building stands in for each plot the player can buy.
 *
 * A child who buys the town hall should get a manor and a banner. The mapping
 * is not exact for every plot - there is no illustrated bakery in the set - so
 * each entry is the closest thing the kit actually has, chosen because it is
 * the right *kind* of building rather than merely a similar size.
 *
 * `null` means the illustrated set has nothing appropriate and the older
 * prop art stays. A well is not a building; replacing it with a small cottage
 * would be worse than the thing it currently is.
 */
export const PLOT_ART = {
  cottage: "cottage",
  bakery: "blacksmith",
  market: "inn",
  schoolhouse: "cottage",
  townhall: "manor",
  well: null,

  // Every territory's castle gets the illustrated castle. Each one reads the
  // same kit, but PLOT_ART is keyed by plot and each plot has a different
  // `variant`, so the banner colour differs per territory rather than all five
  // castles flying identical cloth.
  greenwoodcastle: "castle",
  rivercastle: "castle",
  highlandcastle: "castle",
  crystalcastle: "castle",
  dragoncastle: "castle",
};

/**
 * The ambient village pool. Weighted towards cottages, because a medieval
 * village is mostly cottages, with the two trades appearing where they would
 * really appear. Order matters only in that it is deterministic: the same
 * variant always gives the same building, so the village is stable across
 * renders and the audit measures the same scene every run.
 */
const HOUSE_POOL = [
  "cottage", "cottage", "inn", "cottage",
  "blacksmith", "cottage", "cottage", "manor",
  "cottage", "farm", "cottage", "inn",
];

/**
 * The outbuilding pool.
 *
 * Deliberately excludes the barn. A barn is 2.8 units wide - the widest asset in
 * the set - so squeezing one into a shed's 0.8-unit slot scales it to 0.28 and
 * leaves a flat sliver with no roof pitch and no lean-to. A smithy or a
 * smallholding reads correctly at that size; a barn never will, and when it
 * stops reading as a barn it is worse than the plain shed it replaced.
 */
const SHED_POOL = ["blacksmith", "cottage", "blacksmith", "cottage"];

/**
 * Fit an asset into a w-by-d space, and report what it ended up occupying.
 *
 * `variant` selects the building; the caller can then use the returned `w`,
 * `d` and `h` for collision and depth sorting, which is the point - a layout
 * pass that reserves space for a cottage and then draws a manor is a layout
 * pass with overlapping buildings.
 */
export function fitShop(pool, targetW, targetD, variant) {
  const id = pool[Math.abs(variant) % pool.length];
  const fp = SHOP[id];
  const scale = Math.min(targetW / fp.w, targetD / fp.d);
  return {
    id,
    scale,
    w: fp.w * scale,
    d: fp.d * scale,
    h: fp.h * scale,
    fp,
  };
}

/**
 * Draw an asset at a grid position and ground height.
 *
 * Three nested transforms, in this order for a reason: the ground lift must
 * happen in screen space or the terrain would scale the height along with the
 * building; the position translate must happen in grid space; and the scale
 * must be innermost so it shrinks the building about its own footprint origin
 * rather than about the map origin.
 */
function Placed({ fit, x, y, z, seed, lit }) {
  const Draw = fit.fp.draw;
  const o = at(x, y, 0);
  return (
    <g transform={`translate(0 ${-px(z)})`}>
      <g transform={`translate(${o.x} ${o.y})`}>
        <g transform={`scale(${fit.scale})`}>
          <Draw x={0} y={0} seed={seed} lit={lit} />
        </g>
      </g>
    </g>
  );
}

/**
 * A house in the village fabric.
 *
 * `w` and `d` are the space available; the building is scaled to fit and the
 * caller reads back `footprint()` for what it actually took. Emits the same
 * data-role and data-variant attributes the scene audit reads, so the audit
 * keeps measuring the village rather than quietly measuring nothing.
 */
export function ShopHouse({ x, y, z, w, d, variant = 0, lit = true }) {
  const fit = fitShop(HOUSE_POOL, w, d, variant);
  return (
    <g
      data-role="building"
      data-subrole="house"
      data-id={fit.id}
      data-variant={variant}
      data-w={fit.w.toFixed(2)}
      data-d={fit.d.toFixed(2)}
      data-h={fit.h.toFixed(2)}
    >
      <Placed fit={fit} x={x} y={y} z={z} seed={variant * 7 + 3} lit={lit} />
    </g>
  );
}

/** The footprint a ShopHouse or ShopShed will occupy, for collision tests. */
export function houseFootprint(variant, w, d) {
  return fitShop(HOUSE_POOL, w, d, variant);
}

export function shedFootprint(variant, w, d) {
  return fitShop(SHED_POOL, w, d, variant);
}

/** A barn, workshop or outbuilding. Smaller and lower than a house. */
export function ShopShed({ x, y, z, w, d, variant = 0, lit = true }) {
  const fit = fitShop(SHED_POOL, w, d, variant);
  return (
    <g
      data-role="building"
      data-subrole="shed"
      data-id={fit.id}
      data-variant={variant}
      data-w={fit.w.toFixed(2)}
      data-d={fit.d.toFixed(2)}
      data-h={fit.h.toFixed(2)}
    >
      <Placed fit={fit} x={x} y={y} z={z} seed={variant * 5 + 11} lit={lit} />
    </g>
  );
}

/**
 * A building the player has actually bought.
 *
 * `w` and `d` are the plot's gameplay footprint, and the asset is scaled to fit
 * inside it. This is not a cosmetic decision. At natural size the cottage is
 * 2.27 units across while its plot is 1.6, and the town hall sits close enough
 * to the cottage that the two interpenetrate by 0.67 x 1.15 - the manor would
 * be standing inside the cottage's back wall. Fitting to the plot removes every
 * such overlap while shrinking the art by at most a third, and the manor
 * lands at exactly 1.0 because its plot was already drawn to fit it.
 *
 * Fitting inward also means the illustrated building can never grow into space
 * the placement pass reserved for something else, which is what keeps a
 * player's purchases from growing into the village around them.
 */
export function ShopPlot({ id, w, d, seed = 0, lit = true }) {
  const assetId = PLOT_ART[id];
  if (!assetId) return null;
  const fp = SHOP[assetId];
  const Draw = fp.draw;
  const scale = Math.min(w / fp.w, d / fp.d);
  return (
    <g data-asset={assetId} data-role="building" data-scale={scale.toFixed(3)}>
      <g transform={`scale(${scale})`}>
        <Draw x={0} y={0} seed={seed} lit={lit} variant={seed} />
      </g>
    </g>
  );
}

/** True when the illustrated set has something for this plot. */
export function hasPlotArt(id) {
  return PLOT_ART[id] != null;
}

/**
 * A stable seed per plot.
 *
 * Derived from the plot id, so a player's town hall looks the same every time
 * they open their kingdom and the same on every device - but two adjacent plots
 * do not get identical timber, tile courses and shutter states, which is what
 * stops a village looking copy-pasted.
 */
export function plotSeed(id) {
  let h = 2166136261;
  for (let i = 0; i < id.length; i += 1) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % 997;
}
