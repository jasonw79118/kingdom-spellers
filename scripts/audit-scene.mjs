// Scene audit: measure the kingdom against the art brief.
//
// The brief ends with ten questions a human should be able to answer "yes" to
// by looking at Greenwood. Questions like "can I identify the castle?" are not
// unit-testable in the usual sense, but almost all of them have measurable
// proxies that fail long before a human would notice:
//
//   1. Is the castle identifiable?      -> is there one structure whose area
//                                           and height clearly dominate?
//   2. Can I find the town centre?      -> is there a focal point with real
//                                           density, and do roads converge on it?
//   3. Is the river natural?            -> does its width vary, and does it
//                                           bend, or is it a straight ribbon?
//   4. Do roads curve between places?   -> how many direction changes per road?
//   5. Are neighbourhoods distinct?     -> is building spacing clustered rather
//                                           than evenly scattered?
//   6. Are >=6 houses visibly different? -> how many distinct build signatures?
//   7. Are trees varied?                -> species count and size spread
//   8. Does it look inhabited?          -> people, animals, prop variety
//   9. Is the grid unrecognisable?      -> does any shape land exactly on the
//                                           cell lattice?
//  10. A kingdom, not a board game?     -> is the coast irregular?
//
// Usage:
//   node scripts/audit-scene.mjs                    # audit .snap/village.svg
//   node scripts/audit-scene.mjs path/to/scene.svg
//
// It renders the captured SVG in headless Edge and measures the real rendered
// geometry — getBBox, not guesswork from the source. Exits non-zero if any
// check fails, so it can gate a commit.

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync, spawn } from "node:child_process";

// ---------------------------------------------------------------------------
// The audit. Runs in the page.
// ---------------------------------------------------------------------------

const AUDIT = String.raw`
(function () {
  const svg = document.querySelector("svg");
  if (!svg) return { fatal: "no svg in document" };
  const vb = svg.viewBox.baseVal;
  const q = (sel) => Array.from(svg.querySelectorAll(sel));
  const num = (el, a) => parseFloat(el.getAttribute(a));
  const box = (el) => { try { return el.getBBox(); } catch (e) { return null; } };
  const area = (b) => b.width * b.height;

  // --- integrity: nothing may be NaN, nothing may be clipped ----------------
  const attrs = ["points", "d", "cx", "cy", "x", "y", "r", "rx", "ry", "width", "height"];
  const nanShapes = [];
  for (const el of svg.querySelectorAll("*")) {
    for (const a of attrs) {
      const v = el.getAttribute(a);
      if (v && (v.includes("NaN") || v.includes("Infinity"))) {
        nanShapes.push({ tag: el.tagName, attr: a, value: v.slice(0, 70) });
      }
    }
  }

  // Content extent, ignoring the sky rect and anything inside a clip path.
  const sky = svg.querySelector("rect");
  const drawn = q("polygon, ellipse, circle, path, rect").filter(
    (e) => e !== sky && !e.closest("clipPath") && !e.closest("defs")
  );
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const el of drawn) {
    const b = box(el);
    if (!b || (!b.width && !b.height)) continue;
    if (b.x < minX) minX = b.x;
    if (b.x + b.width > maxX) maxX = b.x + b.width;
    if (b.y < minY) minY = b.y;
    if (b.y + b.height > maxY) maxY = b.y + b.height;
  }

  // --- 9. the grid must be invisible ---------------------------------------
  // Inverse-project a screen point back to grid space, then ask the real
  // question: is this shape an axis-parallel rectangle in grid space?
  //
  // An earlier version of this check only looked for quads spanning exactly one
  // whole cell. That was far too narrow, and it produced a false pass: the
  // kingdom's fields are 1.7 x 1.3 rectangles with decimal corners, so they
  // never matched, and the check reported "0 cell-aligned quads" on a scene
  // containing eight hard-edged grid rectangles. A field drawn from
  // (f.x, f.y) to (f.x + w, f.y) to (f.x + w, f.y + d) is axis-parallel whether
  // or not those numbers happen to be whole.
  //
  // Two further guards keep this honest. Only shapes drawn directly in scene
  // space are considered: anything inside a transformed ancestor is a building
  // part or a scaled asset, and inverse-projecting it through an unknown
  // transform is meaningless. And a floor on area stops a sliver of scenery
  // registering as a tile.
  const inv = (sx, sy) => ({ gx: (sx / 32 + sy / 16) / 2, gy: (sy / 16 - sx / 32) / 2 });
  const axisAligned = (v) => Math.abs(v - Math.round(v)) < 0.02;
  const inSceneSpace = (el) => {
    for (let n = el.parentElement; n && n.tagName !== "svg"; n = n.parentElement) {
      const t = n.getAttribute && n.getAttribute("transform");
      if (t && /translate|scale|rotate|matrix/.test(t)) return false;
    }
    return true;
  };
  const cellQuads = [];
  for (const el of q("polygon")) {
    const raw = (el.getAttribute("points") || "").trim();
    if (!raw) continue;
    if (!inSceneSpace(el)) continue;
    const pts = raw.split(/\s+/).slice(0, 4).map((p) => p.split(",").map(Number));
    if (pts.length !== 4 || pts.some((p) => p.length !== 2 || p.some((v) => !isFinite(v)))) continue;
    const g = pts.map(([sx, sy]) => inv(sx, sy));
    // A rectangle in grid space: corners pair up into two values per axis,
    // and each edge runs along one axis only.
    const xs = [...new Set(g.map((p) => p.gx.toFixed(2)))];
    const ys = [...new Set(g.map((p) => p.gy.toFixed(2)))];
    if (xs.length !== 2 || ys.length !== 2) continue;
    const w = Math.abs(+xs[1] - +xs[0]);
    const d = Math.abs(+ys[1] - +ys[0]);
    if (w * d < 0.25) continue; // too small to read as a drawn field
    cellQuads.push({ w: +w.toFixed(2), d: +d.toFixed(2), raw: raw.slice(0, 60) });
  }

  // --- 1. the castle --------------------------------------------------------
  const purchased = q('[data-subrole="purchased"]');
  const houses = q('[data-subrole="house"]');
  const sheds = q('[data-subrole="shed"]');
  const keeps = q('[data-subrole="keep"]');
  const allBuildings = purchased.concat(houses, sheds, keeps);
  const castle = purchased.find((e) => /castle/i.test(e.getAttribute("data-id") || ""));
  const buildingBoxes = allBuildings
    .map((e) => ({ e, b: box(e), id: e.getAttribute("data-id"), sub: e.getAttribute("data-subrole") }))
    .filter((o) => o.b);
  const areas = buildingBoxes.map((o) => area(o.b)).sort((a, b) => a - b);
  const medianArea = areas.length ? areas[Math.floor(areas.length / 2)] : 0;
  const castleArea = castle ? area(box(castle)) : 0;
  const castleTop = castle ? box(castle).y : Infinity;
  const tallestOther = allBuildings
    .filter((e) => e !== castle)
    .reduce((m, e) => { const b = box(e); return b ? Math.min(m, b.y) : m; }, Infinity);
  // Where the castle sits vertically within the land, 0 = back, 1 = front.
  const castleDepth = castle ? (box(castle).y + box(castle).height - minY) / Math.max(1, maxY - minY) : 1;

  // ribbon() emits [ ...left, ...right.reversed() ], so the two edges are the
  // first and second halves, with the second read back to front.
  const ribbonEdges = (el) => {
    const raw = (el.getAttribute("points") || "").trim();
    const pairs = raw.split(/\s+/).map((p) => p.split(",").map(Number));
    const n = pairs.length / 2;
    return { left: pairs.slice(0, n), right: pairs.slice(n).reverse() };
  };
  const centrelineOf = (el) => {
    const { left, right } = ribbonEdges(el);
    const m = Math.min(left.length, right.length);
    return Array.from({ length: m }, (_, i) => [
      (left[i][0] + right[i][0]) / 2,
      (left[i][1] + right[i][1]) / 2,
    ]);
  };

  // --- 2. the town centre ---------------------------------------------------
  const plaza = svg.querySelector('[data-role="plaza"]');
  const centre = plaza
    ? { gx: num(plaza, "data-gx"), gy: num(plaza, "data-gy") }
    : null;
  // Roads, as their centreline direction changes.
  const roads = q('[data-role="road"]');
  const roadInfo = roads.map((r) => {
    const polys = Array.from(r.querySelectorAll("polygon"));
    const centre2 = centrelineOf(polys[1] || polys[0]);
    // Total turning: the sum of heading change along the whole centreline.
    //
    // This replaced a "count of samples whose heading changed by >8deg"
    // statistic, and the replacement was not cosmetic. That count is a function
    // of how densely the centreline happens to be sampled: per-sample heading
    // change falls as 1/N, so a road with three obvious bends and 190deg of
    // total turning scores zero once it is sampled more finely than about 40
    // points, while a genuinely straight road also scores zero. The gate
    // required >=2, so it was unreachable for any well-sampled road - raising
    // the artwork could never have passed it, and a check that cannot fail is
    // worthless.
    //
    // Total turning is density-independent (measured 190.1deg at 12 samples and
    // 199.6deg at 200 for the same curve) and separates the cases that matter:
    // straight 0deg, the kingdom's current near-straight roads 9-33deg, and a
    // properly winding lane over 45deg.
    let total = 0;
    for (let i = 2; i < centre2.length; i += 1) {
      const a1 = Math.atan2(centre2[i - 1][1] - centre2[i - 2][1], centre2[i - 1][0] - centre2[i - 2][0]);
      const a2 = Math.atan2(centre2[i][1] - centre2[i - 1][1], centre2[i][0] - centre2[i - 1][0]);
      total += Math.abs(((a2 - a1 + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
    }
    // bendRatio: how far the worst point strays from the straight line joining
    // its two ends, as a fraction of that line's length. A straight road is 0 by
    // definition and no amount of resampling changes it. It catches a
    // different failure from total turning: a road that wanders a lot but never
    // goes anywhere, and a road that curves gently but doubles back on itself.
    const chord0 = centre2[0];
    const chord1 = centre2[centre2.length - 1];
    const chx = chord1[0] - chord0[0];
    const chy = chord1[1] - chord0[1];
    const chordLen = Math.hypot(chx, chy) || 1;
    let deviation = 0;
    for (const [x, y] of centre2) {
      deviation = Math.max(deviation, Math.abs(chx * (y - chord0[1]) - chy * (x - chord0[0])) / chordLen);
    }
    return {
      name: r.getAttribute("data-road"),
      samples: centre2.length,
      totalTurningDeg: +(total * 180 / Math.PI).toFixed(1),
      bendRatio: +(deviation / chordLen).toFixed(4),
      centreline: centre2,
    };
  });
  // How many road centrelines pass within 1.2 grid units of the centre?
  const toGrid = (sx, sy) => inv(sx, sy);
  const roadsNearCentre = centre
    ? roadInfo.filter((r) =>
        r.centreline.some((p) => {
          const g = toGrid(p[0], p[1]);
          return Math.hypot(g.gx - centre.gx, g.gy - centre.gy) < 2.4;
        })
      ).length
    : 0;

  // --- 3. the river ---------------------------------------------------------
  const river = svg.querySelector('[data-role="river"]');
  let riverInfo = null;
  if (river) {
    const water = Array.from(river.querySelectorAll("polygon"))[2];
    const { left, right } = ribbonEdges(water);
    const m = Math.min(left.length, right.length);
    const widths = [];
    const mid = [];
    for (let i = 0; i < m; i += 1) {
      widths.push(Math.hypot(left[i][0] - right[i][0], left[i][1] - right[i][1]));
      mid.push([(left[i][0] + right[i][0]) / 2, (left[i][1] + right[i][1]) / 2]);
    }
    let turning = 0;
    for (let i = 2; i < mid.length; i += 1) {
      const a1 = Math.atan2(mid[i - 1][1] - mid[i - 2][1], mid[i - 1][0] - mid[i - 2][0]);
      const a2 = Math.atan2(mid[i][1] - mid[i - 1][1], mid[i][0] - mid[i - 1][0]);
      turning += Math.abs(((a2 - a1 + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
    }
    const maxW = Math.max(...widths);
    const minW = Math.min(...widths.slice(1, -1));
    riverInfo = {
      vertices: left.length * 2,
      widthMin: +minW.toFixed(1),
      widthMax: +maxW.toFixed(1),
      widthRatio: +(maxW / Math.max(1, minW)).toFixed(2),
      totalTurningDeg: +((turning * 180) / Math.PI).toFixed(0),
    };
  }

  // --- 5. clustering: neighbourhoods, not even scatter ----------------------
  const centresB = buildingBoxes.map((o) => ({ x: o.b.x + o.b.width / 2, y: o.b.y + o.b.height / 2 }));
  const nn = [];
  for (let i = 0; i < centresB.length; i += 1) {
    let best = Infinity;
    for (let j = 0; j < centresB.length; j += 1) {
      if (i === j) continue;
      best = Math.min(best, Math.hypot(centresB[i].x - centresB[j].x, centresB[i].y - centresB[j].y));
    }
    if (isFinite(best)) nn.push(best);
  }
  const mean = nn.reduce((s, v) => s + v, 0) / Math.max(1, nn.length);
  const sd = Math.sqrt(nn.reduce((s, v) => s + (v - mean) ** 2, 0) / Math.max(1, nn.length));
  const pairs = [];
  for (let i = 0; i < centresB.length; i += 1) {
    for (let j = i + 1; j < centresB.length; j += 1) {
      const d = Math.hypot(centresB[i].x - centresB[j].x, centresB[i].y - centresB[j].y);
      if (d < 120) pairs.push(d);
    }
  }
  const closePairs = pairs.filter((d) => d < 90).length;
  // How many separate clusters of >= 3 buildings touching?
  const deg = new Array(centresB.length).fill(0);
  for (let i = 0; i < centresB.length; i += 1) {
    for (let j = 0; j < centresB.length; j += 1) {
      if (i !== j && Math.hypot(centresB[i].x - centresB[j].x, centresB[i].y - centresB[j].y) < 130) deg[i] += 1;
    }
  }
  const clusters = deg.filter((d) => d >= 2).length;

  // --- 6. house variety -----------------------------------------------------
  const sig = new Map();
  for (const h of houses) {
    const k = [num(h, "data-variant"), num(h, "data-w"), num(h, "data-d"), num(h, "data-h")].join("|");
    sig.set(k, (sig.get(k) || 0) + 1);
  }
  const sigCounts = Array.from(sig.values());
  const dominantShare = sigCounts.length ? Math.max(...sigCounts) / houses.length : 0;

  // --- 7. tree variety ------------------------------------------------------
  const trees = q('[data-role="tree"]');
  const kinds = {};
  const sizes = [];
  for (const t of trees) {
    const k = t.getAttribute("data-kind") || "?";
    kinds[k] = (kinds[k] || 0) + 1;
    sizes.push(num(t, "data-s"));
  }
  sizes.sort((a, b) => a - b);
  const frac = (pred) => (sizes.filter(pred).length / Math.max(1, sizes.length));
  const treesInfo = {
    total: trees.length,
    kinds: Object.keys(kinds).length,
    kindCounts: kinds,
    bigShare: +frac((s) => s >= 0.9).toFixed(3),
    smallShare: +frac((s) => s <= 0.58).toFixed(3),
    medianS: +((sizes[Math.floor(sizes.length / 2)] || 0)).toFixed(2),
  };

  // --- 8. inhabitants -------------------------------------------------------
  const propKinds = {};
  for (const p of q('[data-role="prop"]')) {
    const k = p.getAttribute("data-prop");
    propKinds[k] = (propKinds[k] || 0) + 1;
  }
  const animalKinds = {};
  for (const a of q('[data-role="animal"]')) {
    const k = a.getAttribute("data-animal");
    animalKinds[k] = (animalKinds[k] || 0) + 1;
  }
  const people = q('[data-role="villager"]').length;

  // --- 10. a kingdom, not a board ------------------------------------------
  const terrain = svg.querySelector('[data-role="terrain"]');
  const coast = terrain ? terrain.querySelectorAll("polygon")[0] : null;
  let coastInfo = { vertices: 0, irregularity: 0, widthRatio: 1 };
  if (coast) {
    const raw = (coast.getAttribute("points") || "").trim();
    const pairs = raw.split(/\s+/).map((p) => p.split(",").map(Number));
    const b = box(coast);
    // Irregularity: how far the outline strays from its own bounding box, as a
    // fraction. A diamond or rectangle scores ~0; a coastline scores high.
    let inside = 0;
    for (const [x, y] of pairs) {
      const fx = Math.min(x - b.x, b.x + b.width - x) / (b.width / 2);
      const fy = Math.min(y - b.y, b.y + b.height - y) / (b.height / 2);
      inside += Math.min(fx, fy);
    }
    coastInfo = {
      vertices: pairs.length,
      irregularity: +(inside / pairs.length).toFixed(3),
      widthRatio: +(b.width / b.height).toFixed(2),
    };
  }
  const hills = q('[data-role="hill"]').map((h) => num(h, "data-h"));

  // --- milestone checklist --------------------------------------------------
  const has = {
    castle: !!castle,
    bridge: !!svg.querySelector('[data-role="bridge"]'),
    plaza: !!plaza,
    fountain: !!svg.querySelector('[data-prop="fountain"]'),
    well: !!svg.querySelector('[data-prop="well"]'),
    stalls: q('[data-prop="stall"]').length,
    carts: q('[data-prop="cart"]').length,
    barrels: q('[data-prop="barrel"]').length,
    haystacks: q('[data-prop="haystack"]').length,
    fences: q('[data-role="fence"]').length,
    banners: q('[data-prop="banner"]').length,
    gardens: q('[data-role="garden"]').length,
    fields: q('[data-role="furrow"]').length,
    signs: q('[data-prop="signpost"]').length,
    benches: q('[data-prop="bench"]').length,
    laundry: q('[data-prop="laundry"]').length,
    scarecrows: q('[data-prop="scarecrow"]').length,
    boats: q('[data-prop="boat"]').length,
    statues: q('[data-prop="statue"]').length,
    campfires: q('[data-prop="campfire"]').length,
    woodpiles: q('[data-prop="woodpile"]').length,
    crates: q('[data-prop="crate"]').length,
    reeds: q('[data-prop="reeds"]').length || q('[data-role="reeds"]').length,
  };

  return {
    integrity: {
      nanShapes: nanShapes.slice(0, 6),
      nanCount: nanShapes.length,
      contentBox: [+minX.toFixed(0), +minY.toFixed(0), +maxX.toFixed(0), +maxY.toFixed(0)],
      viewBox: [vb.x, vb.y, vb.width, vb.height],
      fitsHorizontally: minX >= vb.x - 0.5 && maxX <= vb.x + vb.width + 0.5,
      fitsVertically: minY >= vb.y - 0.5 && maxY <= vb.y + vb.height + 0.5,
      fillsFrameH: +(((maxX - minX) / vb.width) * 100).toFixed(1),
      fillsFrameV: +(((maxY - minY) / vb.height) * 100).toFixed(1),
      shapeCount: svg.querySelectorAll("*").length,
    },
    grid: { visibleCellQuads: cellQuads.length, examples: cellQuads.slice(0, 3) },
    castle: {
      present: !!castle,
      id: castle ? castle.getAttribute("data-id") : null,
      areaRatioVsMedian: medianArea ? +(castleArea / medianArea).toFixed(2) : 0,
      topClearsOthersBy: isFinite(tallestOther) ? +(tallestOther - castleTop).toFixed(0) : 0,
      depthInFrame: +castleDepth.toFixed(2),
      buildingCount: buildingBoxes.length,
    },
    centre: {
      hasPlaza: !!plaza,
      buildingsWithin2Radius: centre
        ? allBuildings.filter((e) => {
            const b = box(e);
            const p = box(plaza);
            return Math.hypot(b.x + b.width / 2 - (p.x + p.width / 2), b.y + b.height / 2 - (p.y + p.height / 2)) < 150;
          }).length
        : 0,
      roadsConverging: roadsNearCentre,
    },
    river: riverInfo,
    roads: roadInfo.map((r) => ({
      name: r.name, samples: r.samples,
      totalTurningDeg: r.totalTurningDeg, bendRatio: r.bendRatio,
    })),
    clustering: {
      meanNN: +mean.toFixed(1),
      cv: +((sd / Math.max(1, mean)) || 0).toFixed(2),
      closePairs: closePairs,
      clustersOf3Plus: clusters,
    },
    houses: {
      count: houses.length,
      distinct: sig.size,
      dominantShare: +dominantShare.toFixed(2),
      signatures: Array.from(sig.entries()),
    },
    trees: treesInfo,
    life: {
      villagers: people,
      animals: Object.values(animalKinds).reduce((s, v) => s + v, 0),
      animalKinds,
      propKinds: Object.keys(propKinds).length,
      propCounts: propKinds,
      shrubs: q('[data-role="shrub"]').length,
      flowers: q('[data-role="flowers"]').length,
      rocks: q('[data-role="rock"]').length,
    },
    coast: coastInfo,
    hills: { count: hills.length, maxHeight: +(hills.sort((a, b) => b - a)[0] || 0).toFixed(2) },
    has,
  };
})()
`;

// ---------------------------------------------------------------------------
// Checks. Each is a measurable proxy for one of the brief's ten questions.
// ---------------------------------------------------------------------------

function buildChecks(r) {
  if (r.fatal) return [];
  const i = r.integrity;
  return [
    {
      n: 1,
      q: "Can I identify the castle?",
      why: "one structure must dominate in area and height, and sit at the back",
      pass: r.castle.present && r.castle.areaRatioVsMedian >= 2.2 && r.castle.topClearsOthersBy >= 40 && r.castle.depthInFrame <= 0.45,
      got: `id=${r.castle.id} area×${r.castle.areaRatioVsMedian} vs median, +${r.castle.topClearsOthersBy}px taller, depth ${r.castle.depthInFrame}`,
    },
    {
      n: 2,
      q: "Can I locate the town centre?",
      why: "a square with real density that roads converge on",
      pass: r.centre.hasPlaza && r.centre.buildingsWithin2Radius >= 5 && r.centre.roadsConverging >= 3,
      got: `plaza=${r.centre.hasPlaza}, ${r.centre.buildingsWithin2Radius} buildings close, ${r.centre.roadsConverging} roads converge`,
    },
    {
      n: 3,
      q: "Is the river natural?",
      why: "it must bend, and its width must swell and pinch",
      pass: !!r.river && r.river.widthRatio >= 1.5 && r.river.totalTurningDeg >= 120 && r.river.vertices >= 40,
      got: r.river ? `width ${r.river.widthMin}→${r.river.widthMax}px (×${r.river.widthRatio}), ${r.river.totalTurningDeg}° of bend, ${r.river.vertices} points` : "no river",
    },
    {
      n: 4,
      q: "Do roads curve between destinations?",
      // 45deg of total turning: a road that crosses the map in a straight line
      // turns ~0deg, the kingdom's current roads turn 9-33deg and read as
      // straight, and a lane that visibly winds turns well over 45. The 0.07
      // bendRatio floor catches the complementary failure - a road whose
      // total turning looks adequate but which never leaves its own chord.
      // Both are density-independent, verified by resampling the same curve at
      // 12 and 200 points.
      why: "no road may be a straight line or a straight grid line",
      pass: r.roads.length >= 3 && r.roads.every((x) => x.totalTurningDeg >= 45 && x.bendRatio >= 0.07),
      got: r.roads.map((x) => `${x.name}:${x.totalTurningDeg}deg/bend ${x.bendRatio}`).join(", "),
    },
    {
      n: 5,
      q: "Are neighbourhoods distinct?",
      why: "buildings must cluster; even spacing reads as a board",
      pass: r.clustering.cv >= 0.5 && r.clustering.clustersOf3Plus >= 2,
      got: `spacing cv ${r.clustering.cv}, ${r.clustering.clustersOf3Plus} clusters, ${r.clustering.closePairs} close pairs`,
    },
    {
      n: 6,
      q: "Are at least 6 houses visibly different?",
      why: "different roof form, footprint, storeys — not recolours",
      pass: r.houses.count >= 6 && r.houses.distinct >= 6 && r.houses.dominantShare <= 0.35,
      got: `${r.houses.count} houses, ${r.houses.distinct} distinct builds, most common is ${Math.round(r.houses.dominantShare * 100)}%`,
    },
    {
      n: 7,
      q: "Are trees varied?",
      why: "7+ kinds in the brief, and big trees must be rare",
      pass: r.trees.kinds >= 4 && r.trees.bigShare <= 0.22 && r.trees.smallShare >= 0.2,
      got: `${r.trees.total} trees, ${r.trees.kinds} kinds (${Object.keys(r.trees.kindCounts).join("/")}), big ${Math.round(r.trees.bigShare * 100)}%, small ${Math.round(r.trees.smallShare * 100)}%`,
    },
    {
      n: 8,
      q: "Does it look inhabited?",
      why: "people, animals and a wide spread of props",
      pass: r.life.villagers >= 3 && r.life.animals >= 4 && r.life.propKinds >= 10,
      got: `${r.life.villagers} villagers, ${r.life.animals} animals (${Object.keys(r.life.animalKinds).join("/")}), ${r.life.propKinds} prop kinds, ${r.life.shrubs} shrubs, ${r.life.flowers} flowers`,
    },
    {
      n: 9,
      q: "Is the grid unrecognisable?",
      why: "not one shape may land on the cell lattice",
      pass: r.grid.visibleCellQuads === 0,
      got: `${r.grid.visibleCellQuads} cell-aligned quads`,
    },
    {
      n: 10,
      q: "Does it look like a kingdom, not a board game?",
      why: "an irregular coastline and real relief, not a rectangle of tiles",
      pass: r.coast.vertices >= 40 && r.coast.irregularity >= 0.04 && r.hills.maxHeight >= 0.5,
      got: `coast ${r.coast.vertices} pts, irregularity ${r.coast.irregularity}, ${r.hills.count} hills up to ${r.hills.maxHeight}`,
    },
  ];
}

const STRUCT = (r) => [
  { n: "S1", q: "No NaN or Infinity in any geometry attribute", pass: r.integrity.nanCount === 0, got: `${r.integrity.nanCount} bad ${r.integrity.nanCount === 1 ? "attribute" : "attributes"}` },
  { n: "S2", q: "Nothing is clipped by the viewBox", pass: r.integrity.fitsHorizontally && r.integrity.fitsVertically, got: `content ${r.integrity.contentBox.join(",")} inside viewBox ${r.integrity.viewBox.join(",")}` },
  { n: "S3", q: "The scene fills the frame", pass: r.integrity.fillsFrameH >= 85 && r.integrity.fillsFrameV >= 80, got: `${r.integrity.fillsFrameH}% wide, ${r.integrity.fillsFrameV}% tall, ${r.integrity.shapeCount} nodes` },
];

// ---------------------------------------------------------------------------
// Runner: render the captured SVG in headless Edge, measure it via CDP.
// ---------------------------------------------------------------------------

const svgPath = path.resolve(process.argv[2] || ".snap/village.svg");
if (!fs.existsSync(svgPath)) {
  console.error(`No scene at ${svgPath}. Capture one first (load the kingdom page, then POST the SVG to /__snap).`);
  process.exit(1);
}
const svg = fs.readFileSync(svgPath, "utf8");

const EDGE = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
].find((p) => fs.existsSync(p));
if (!EDGE) {
  console.error("No Chromium browser found.");
  process.exit(1);
}

const profile = fs.mkdtempSync(path.join(os.tmpdir(), "ks-audit-"));
const page = path.join(profile, "scene.html");
fs.writeFileSync(page, `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:#fff}svg{display:block}</style>${svg}`, "utf8");

const proc = spawn(EDGE, [
  "--headless=new",
  "--disable-gpu",
  "--hide-scrollbars",
  "--no-first-run",
  "--remote-debugging-port=0",
  `--user-data-dir=${profile}`,
  "--window-size=1600,1200",
  `file:///${page.replace(/\\/g, "/")}`,
], { stdio: ["ignore", "ignore", "pipe"] });

// Tearing down a headless browser's profile on Windows races the process exit:
// the profile is still locked for a moment after the kill, and rmSync throws
// EBUSY on DevToolsActivePort. That is noise, not an audit result, so it must
// never be allowed to propagate - a cleanup failure that aborts the run means a
// gate that silently stops gating.
const cleanup = () => {
  try { proc.kill(); } catch { /* already gone */ }
  for (let i = 0; i < 5; i += 1) {
    try {
      fs.rmSync(profile, { recursive: true, force: true, maxRetries: 4, retryDelay: 200 });
      return;
    } catch {
      if (i === 4) {
        // Leave the directory. It is a temp profile in the OS temp folder; a
        // stale one is harmless, a crashed audit is not.
        console.warn(`  note: could not remove ${profile}; it will be left in the temp folder`);
      }
    }
  }
};

async function endpoint() {
  const portFile = path.join(profile, "DevToolsActivePort");
  for (let i = 0; i < 150; i += 1) {
    // Edge holds DevToolsActivePort open exclusively while it starts, so both the
    // existence check and the read can lose a race with it. Both throw here, and
    // both mean "not ready yet" - which is what the loop is for. Treating an
    // unreadable port file as fatal makes the audit fail intermittently for a
    // reason that has nothing to do with the artwork.
    try {
      const lines = fs.readFileSync(portFile, "utf8").split("\n");
      if (lines.length >= 2 && lines[0].trim()) {
        return `ws://127.0.0.1:${lines[0].trim()}${lines[1].trim()}`;
      }
    } catch {
      // locked or not written yet - keep polling
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error("Edge never reported a debugging port");
}

function cdp(ws) {
  let id = 0;
  const pending = new Map();
  ws.addEventListener("message", (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message));
      else resolve(msg.result);
    }
  });
  return (method, params = {}, sessionId) =>
    new Promise((resolve, reject) => {
      id += 1;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
}

let code = 1;
try {
  const ws = new WebSocket(await endpoint());
  await new Promise((res, rej) => {
    ws.addEventListener("open", res, { once: true });
    ws.addEventListener("error", rej, { once: true });
  });
  const send = cdp(ws);
  const { targetId } = await send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
  await send("Page.enable", {}, sessionId);
  await send("Runtime.enable", {}, sessionId);
  await send("Page.navigate", { url: `file:///${page.replace(/\\/g, "/")}` }, sessionId);
  // give the SVG a moment to lay out so getBBox is meaningful
  await new Promise((r) => setTimeout(r, 1200));
  const res = await send("Runtime.evaluate", { expression: AUDIT, returnByValue: true }, sessionId);
  if (res.exceptionDetails) throw new Error(res.exceptionDetails.text || "audit threw");
  const report = res.result.value;

  if (report.fatal) {
    console.error(`Audit could not run: ${report.fatal}`);
  } else {
    const checks = [...buildChecks(report)];
    const all = [...checks.map((c) => ({ ...c, kind: "brief" })), ...STRUCT(report).map((c) => ({ ...c, kind: "struct" }))];
    console.log(`\n  Scene audit — ${path.basename(svgPath)}\n`);
    for (const c of all) {
      const mark = c.pass ? "  ok  " : "  FAIL";
      const tag = c.n.toString().padStart(3);
      console.log(`${mark}  ${tag}  ${c.q}`);
      console.log(`        ${c.got}`);
    }
    const failed = all.filter((c) => !c.pass);
    console.log(`\n  ${all.length - failed.length}/${all.length} passed`);
    if (failed.length) console.log(`  Failing: ${failed.map((c) => (c.n < 20 ? `#${c.n}` : c.n)).join(", ")}`);

    console.log("\n  Milestone contents");
    const present = Object.entries(report.has).filter(([, v]) => v !== false && v !== 0);
    const absent = Object.entries(report.has).filter(([, v]) => v === false || v === 0);
    console.log(`    present: ${present.map(([k, v]) => `${k}${typeof v === "number" && v > 1 ? `×${v}` : ""}`).join(", ")}`);
    if (absent.length) console.log(`    absent:  ${absent.map(([k]) => k).join(", ")}`);

    console.log("\n  Raw\n");
    console.log(JSON.stringify(report, null, 2));
    fs.writeFileSync(path.join(path.dirname(svgPath), "audit.json"), JSON.stringify(report, null, 2));
    code = failed.length ? 1 : 0;
  }
  ws.close();
} catch (err) {
  console.error(`Audit failed: ${err.message}`);
} finally {
  cleanup();
}
process.exit(code);
