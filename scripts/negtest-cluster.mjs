// Negative test for check #5, the neighbourhood-clustering gate.
//
// Check #5 asks "are neighbourhoods distinct?" — buildings must bunch into
// neighbourhoods rather than sit at even spacing, which reads as a board game.
//
// The gate used to be `cv >= 0.5`, where cv was the coefficient of variation of
// nearest-neighbour distances. Measured on the real scene it turned out that a
// village of three tight clumps scores LOWER (0.03) than the uniform grid the
// check exists to reject (0.00): a clump gives every building a nearly
// identical neighbour distance, so the variance collapses. A gate that cannot
// be passed by the layout it was written to accept measures nothing.
//
// The replacement is Clark-Evans R: observed mean nearest-neighbour distance
// over the mean expected if the same buildings were scattered at random across
// the same land. R < 1 bunched, R = 1 random, R > 1 spread out.
//
// This file proves the replacement separates the two cases. A gate that has
// never been shown to fail is not a gate.

/** Clark-Evans R, computed exactly as the audit does. */
function clarkEvans(points, frame) {
  const nn = points.map((p, i) => {
    let best = Infinity;
    points.forEach((o, j) => {
      if (i !== j) best = Math.min(best, Math.hypot(p.x - o.x, p.y - o.y));
    });
    return best;
  });
  const mean = nn.reduce((s, v) => s + v, 0) / Math.max(1, nn.length);
  const area = frame.w * frame.h;
  const expected = 0.5 * Math.sqrt(area / Math.max(1, points.length));
  return { mean, expected, R: mean / expected };
}

/** Tight frame around a layout, the way the scene's land bounds the village. */
const tightFrame = (pts) => {
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
  const pad = 120; // the settlement does not touch the land edge
  const x0 = Math.min(...xs) - pad, x1 = Math.max(...xs) + pad;
  const y0 = Math.min(...ys) - pad, y1 = Math.max(...ys) + pad;
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
};

const N = 17;
let seed = 7;
const rnd = () => {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
};

// 1. A uniform grid — the "board game" the check exists to reject.
const grid = [];
for (let i = 0; i < N; i += 1) grid.push({ x: (i % 5) * 100, y: Math.floor(i / 5) * 90 });

// 2. Three clumps with wide gaps — a village. Jittered, because a real village
// is not a sub-grid.
const clumps = [];
[[0, 0], [520, 60], [240, 330]].forEach(([ox, oy], c) => {
  const k = c === 0 ? 6 : c === 1 ? 6 : 5;
  for (let i = 0; i < k; i += 1) {
    clumps.push({
      x: ox + (i % 3) * 66 + (rnd() - 0.5) * 46,
      y: oy + Math.floor(i / 3) * 58 + (rnd() - 0.5) * 40,
    });
  }
});

// 3. The real Greenwood scene, correctly measured in root space.
const real = [
  { x: -144.6, y: 129.2 }, { x: 84.5, y: 137.5 }, { x: 149.8, y: 174.3 },
  { x: -196.8, y: 164.7 }, { x: -94.7, y: 201 }, { x: 236.4, y: 174.8 },
  { x: -30.7, y: 273.1 }, { x: 249.2, y: 280.6 }, { x: -106.2, y: 286.2 },
  { x: 191.4, y: 295.7 }, { x: -35.8, y: 315.2 }, { x: 137, y: 318.1 },
  { x: 37, y: -5.6 }, { x: -51.8, y: 137.5 }, { x: 12.8, y: 211.4 },
  { x: -45.3, y: 218 }, { x: 74.8, y: 224.3 },
];
// The scene's own land box, from the audit's integrity block.
const realFrame = { x: -369, y: -70, w: 751, h: 528 };

const rows = [
  ["uniform grid", grid, tightFrame(grid), "should FAIL — the board game", false],
  ["three clumps", clumps, tightFrame(clumps), "should PASS — a village", true],
  ["Greenwood now", real, realFrame, "the real scene, correctly measured", null],
];

console.log("\n  Does Clark-Evans R separate a village from a scatter?");
console.log("  (gate: R < 1.0 — less than random spacing means clustering)\n");
console.log("  layout             mean NN   random NN     R   verdict");
console.log("  " + "-".repeat(62));
let ok = true;
for (const [name, pts, frame, note, want] of rows) {
  const s = clarkEvans(pts, frame);
  const pass = s.R < 1.0;
  const verdict = pass ? "pass" : "FAIL";
  if (want !== null && pass !== want) ok = false;
  console.log(`  ${name.padEnd(17)} ${s.mean.toFixed(1).padStart(7)}   ${s.expected.toFixed(1).padStart(9)}  ${s.R.toFixed(2).padStart(5)}   ${verdict.padEnd(5)}  ${note}`);
}

console.log("");
console.log(ok
  ? "  The gate separates them: a uniform grid fails, a clumped village passes."
  : "  The gate does NOT separate them — it is not usable.");
console.log("");
process.exit(ok ? 0 : 1);
