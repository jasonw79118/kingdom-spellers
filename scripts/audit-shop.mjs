// Building art audit: measure the five showroom buildings against the brief.
//
// The brief's acceptance check is seven questions a human answers by looking:
//
//   1. Do they look like detailed medieval buildings?
//   2. Do roofs have multiple sections?
//   3. Is timber framing visible?
//   4. Are silhouettes varied?
//   5. Do buildings have attached details and props?
//   6. Do they look illustrated rather than generated from rectangles?
//   7. Would these belong in the target village image?
//
// Questions 1 and 7 are judgements, and no metric settles them. But each has
// measurable proxies that fail long before a person would notice, and each can
// be made to fail on purpose:
//
//   roof sections   -> count distinct roof masses (main roof, cross-gable,
//                      lean-to, tower cap), not tile polygons
//   timber framing  -> count beams whose colour is a brown timber value
//   silhouette      -> hull complexity of the whole building, and how different
//                      the five buildings are from EACH OTHER
//   openings        -> windows and doors, and their shutter states
//   detail props    -> independent dressing objects
//   illustrated     -> distinct colours, and crucially the fraction of large
//                      flat fills. A prototype is mostly big flat quads; an
//                      illustration is mostly small ones.
//   varies with seed-> every metric is re-measured at several seeds, so a
//                      building that only works at seed 3 fails
//
// Usage:
//   node scripts/audit-shop.mjs            # needs the dev server on :3000
//
// Exits non-zero if any check fails, so it can gate a commit.

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync, spawn } from "node:child_process";

// ---------------------------------------------------------------------------
// The audit. Runs in the page, over every .shop-svg on the showroom route.
// ---------------------------------------------------------------------------

const AUDIT = String.raw`
(function () {
  const cards = Array.from(document.querySelectorAll(".shop-svg"));
  if (!cards.length) return { fatal: "no .shop-svg found - is this the showroom route?" };

  const out = [];

  cards.forEach((svg, i) => {
    const name = (document.querySelectorAll(".shop-card h3")[i] || {}).textContent || ("card" + i);
    const b = svg.querySelector('[data-role="building"]');
    if (!b) { out.push({ name, fatal: "no building group" }); return; }

    const all = Array.from(b.querySelectorAll("*"));
    const polys = Array.from(b.querySelectorAll("polygon,path,circle,ellipse,rect"));

    // --- integrity -------------------------------------------------------
    const nan = [];
    for (const el of all) {
      for (const a of ["points","d","cx","cy","x","y","r","rx","ry","width","height"]) {
        const v = el.getAttribute(a);
        if (v && (v.includes("NaN") || v.includes("Infinity"))) {
          nan.push({ tag: el.tagName, attr: a, value: v.slice(0, 60) });
        }
      }
    }

    // --- roles -----------------------------------------------------------
    const roles = {};
    for (const g of b.querySelectorAll("[data-role]")) {
      const r = g.getAttribute("data-role");
      roles[r] = (roles[r] || 0) + 1;
    }

    // --- roof sections ---------------------------------------------------
    // A "section" is a distinct roof mass, not a tile. Each has its own ridge
    // or rake, and enough polygons to be a roof rather than a gable triangle.
    const roofSel = '[data-role="roof"],[data-role="thatch-roof"],[data-role="leanto"],' +
                    '[data-role="cross-gable"],[data-role="tower"]';
    const roofMasses = Array.from(b.querySelectorAll(roofSel))
      .filter((g) => g.querySelectorAll("polygon").length > 10).length;
    const roofGroups = Array.from(b.querySelectorAll(roofSel))
      .filter((g) => g.querySelectorAll("polygon").length > 4).length;

    // --- timber framing --------------------------------------------------
    // Brown, mid-tone, r > g >= b. Stone is grey-brown and much lighter; plaster
    // is near-white. This isolates the beam colour families.
    let beams = 0;
    const beamWall = [];
    for (const w of b.querySelectorAll('[data-role="wall"]')) {
      let n = 0;
      for (const p of w.querySelectorAll("polygon")) {
        const f = p.getAttribute("fill") || "";
        if (!/^#[0-9a-f]{6}$/i.test(f)) continue;
        const v = parseInt(f.slice(1), 16);
        const r = (v >> 16) & 255, g = (v >> 8) & 255, bl = v & 255;
        if (r > g && g >= bl && r >= 70 && r <= 185) { beams += 1; n += 1; }
      }
      if (n) beamWall.push({ pattern: w.getAttribute("data-pattern"), beams: n });
    }

    // --- openings --------------------------------------------------------
    const winKinds = ["open", "one", "closed", "none"];
    const shutters = {};
    for (const w of b.querySelectorAll('[data-role="window"]')) {
      const s = w.getAttribute("data-shutters") || "?";
      shutters[s] = (shutters[s] || 0) + 1;
    }
    const windows = b.querySelectorAll('[data-role="window"]').length +
                    b.querySelectorAll('[data-role="narrow-window"]').length;
    const doors = b.querySelectorAll('[data-role="door"]').length;
    const shutterVariety = winKinds.filter((k) => shutters[k] && k !== "none").length;

    // --- dressing props --------------------------------------------------
    const propRoles = ["barrel","crate","woodpile","sign","signboard","hearth","anvil",
      "haystack","cart","fence","scarecrow","flowers","weeds","steps","portcullis",
      "banner","courtyard","bench","balcony","jetty","chimney","cowl","quench",
      "porch","thatch-ridge","vent","tower","dormer"];
    const props = {};
    let propTotal = 0;
    for (const r of propRoles) {
      const n = b.querySelectorAll('[data-role="' + r + '"]').length;
      if (n) { props[r] = n; propTotal += n; }
    }
    const propKinds = Object.keys(props).length;

    // --- "illustrated, not rectangles" -----------------------------------
    // The decisive proxy. In a prototype most ink sits in a handful of huge
    // flat quads. In an illustration ink is spread across many small shapes and
    // many distinct colours. Measure both the size distribution and how much of
    // the total shape count sits in the largest few percent.
    const areas = [];
    const colours = new Set();
    for (const p of polys) {
      const f = p.getAttribute("fill");
      if (f) colours.add(f);
      if (p.tagName === "polygon") {
        // The contact shadow is one flat quad by design - it is a soft ground
        // stain, not ink on the building. Counting it would let a cheap
        // rectangle pass as "drawn detail", so it is excluded from the ink
        // measure. It is still counted in shapes.
        if (p.closest('[data-role="shadow"]')) continue;
        const pts = (p.getAttribute("points") || "").trim().split(/\s+/).map((s) => s.split(",").map(Number));
        let a = 0;
        for (let k = 0; k < pts.length; k++) {
          const p1 = pts[k], p2 = pts[(k + 1) % pts.length];
          if (p1.length < 2 || p2.length < 2 || isNaN(p1[0]) || isNaN(p2[0])) continue;
          a += p1[0] * p2[1] - p2[0] * p1[1];
        }
        areas.push(Math.abs(a / 2));
      }
    }
    areas.sort((x, y) => y - x);
    const totalArea = areas.reduce((s, a) => s + a, 0) || 1;
    // Share of ink held by the 10 biggest shapes.
    const top10 = areas.slice(0, 10).reduce((s, a) => s + a, 0);
    const concentration = top10 / totalArea;
    const medianArea = areas.length ? areas[Math.floor(areas.length / 2)] : 0;

    // --- silhouette ------------------------------------------------------
    // Two things: how complex the outline is, and - across the set - how
    // different the five outlines are from each other. The second is the one
    // that matters, and it is measured as a real shape comparison rather than
    // guessed at from bounding boxes, because two buildings can share an aspect
    // ratio and still be nothing alike.
    const bb = (function () { try { return b.getBBox(); } catch (e) { return null; } })();
    let silhouetteVerts = 0;
    for (const p of b.querySelectorAll("polygon")) {
      const pts = (p.getAttribute("points") || "").trim().split(/\s+/);
      for (const s of pts) {
        const [x, y] = s.split(",").map(Number);
        if (!isNaN(x) && !isNaN(y)) silhouetteVerts += 1;
      }
    }

    // Occupancy mask of the architecture, on a 20x20 grid over its own bounding
    // box. The contact shadow is excluded: it is the same lozenge under all
    // five and would make every pair look alike.
    let mask = null;
    if (bb && bb.width > 0 && bb.height > 0) {
      const GRID = 20;
      const arch = Array.from(b.querySelectorAll("polygon")).filter(
        (p) => !p.closest('[data-role="shadow"]'),
      );
      const rings = arch.map((p) =>
        (p.getAttribute("points") || "")
          .trim()
          .split(/\s+/)
          .map((s) => s.split(",").map(Number))
          .filter((q) => q.length >= 2 && !isNaN(q[0]) && !isNaN(q[1])),
      );
      mask = new Uint8Array(GRID * GRID);
      for (let gy = 0; gy < GRID; gy += 1) {
        for (let gx = 0; gx < GRID; gx += 1) {
          const px = bb.x + ((gx + 0.5) * bb.width) / GRID;
          const py = bb.y + ((gy + 0.5) * bb.height) / GRID;
          let hit = false;
          for (let k = 0; k < rings.length && !hit; k += 1) {
            const ring = rings[k];
            if (ring.length < 3) continue;
            let inside = false;
            for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
              const [xi, yi] = ring[i];
              const [xj, yj] = ring[j];
              if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
                inside = !inside;
              }
            }
            if (inside) hit = true;
          }
          if (hit) mask[gy * GRID + gx] = 1;
        }
      }
    }

    // Massing aspect: the architecture alone, with the ground shadow out of it.
    const abb = (function () {
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const p of b.querySelectorAll("polygon")) {
        if (p.closest('[data-role="shadow"]')) continue;
        for (const s of (p.getAttribute("points") || "").trim().split(/\s+/)) {
          const [x, y] = s.split(",").map(Number);
          if (isNaN(x) || isNaN(y)) continue;
          if (x < x0) x0 = x; if (x > x1) x1 = x;
          if (y < y0) y0 = y; if (y > y1) y1 = y;
        }
      }
      return x1 > x0 ? { width: x1 - x0, height: y1 - y0 } : null;
    })();

    // --- framing ---------------------------------------------------------
    const vb = svg.viewBox.baseVal;
    let fillW = 0, fillH = 0;
    if (bb && bb.width && bb.height) {
      const tr = svg.querySelector("g[transform]");
      const sc = tr ? parseFloat(tr.getAttribute("transform").split("scale(")[1]) : 1;
      fillW = Math.round((bb.width * sc) / vb.width * 100);
      fillH = Math.round((bb.height * sc) / vb.height * 100);
    }

    out.push({
      name, shapes: polys.length, nan: nan.length, nanSample: nan.slice(0, 3),
      roles, roofMasses, roofGroups,
      beams, beamWall,
      windows, doors, shutters, shutterVariety,
      props, propTotal, propKinds,
      colours: colours.size, concentration: +concentration.toFixed(3),
      medianArea: Math.round(medianArea), largestArea: Math.round(areas[0] || 0),
      silhouetteVerts, fillW, fillH,
      mask: mask ? Array.from(mask) : null,
      aspect: abb && abb.height ? +(abb.width / abb.height).toFixed(2) : 0,
    });
  });

  return { out };
})()
`;

// ---------------------------------------------------------------------------
// Thresholds. Tuned against the measured baseline, not guessed.
// ---------------------------------------------------------------------------

const CHECKS = [
  {
    id: "integrity",
    label: "no NaN or Infinity in any geometry",
    test: (b) => b.nan === 0,
    detail: (b) => (b.nan ? `${b.nan} bad shapes` : "clean"),
  },
  {
    id: "detail-density",
    label: "illustrated, not rectangles: >=600 shapes",
    test: (b) => b.shapes >= 600,
    detail: (b) => `${b.shapes} shapes`,
  },
  {
    id: "ink-spread",
    label: "ink is spread across many shapes, not a few big fills",
    // >0.5 means half the ink sits in the 10 largest shapes: a prototype look.
    test: (b) => b.concentration < 0.34,
    detail: (b) => `top-10 shapes hold ${(b.concentration * 100).toFixed(0)}% of ink`,
  },
  {
    id: "colour-variety",
    label: ">=40 distinct colours (no large single-tone surfaces)",
    test: (b) => b.colours >= 40,
    detail: (b) => `${b.colours} colours`,
  },
  {
    id: "timber-frame",
    label: "timber framing is visible: >=25 beams",
    test: (b) => b.beams >= 25,
    detail: (b) => `${b.beams} beams`,
  },
  {
    id: "roof-sections",
    label: "roofs have multiple sections: >=2 roof masses",
    test: (b) => b.roofMasses >= 2,
    detail: (b) => `${b.roofMasses} roof masses, ${b.roofGroups} roof groups`,
  },
  {
    id: "openings",
    label: ">=3 windows and >=1 door",
    test: (b) => b.windows >= 3 && b.doors >= 1,
    detail: (b) => `${b.windows} windows, ${b.doors} doors`,
  },
  {
    id: "dressing",
    label: ">=8 attached details and props, >=5 kinds",
    test: (b) => b.propKinds >= 5 && b.propTotal >= 8,
    detail: (b) => `${b.propTotal} props in ${b.propKinds} kinds`,
  },
  {
    id: "silhouette",
    label: "silhouette is not a box: >=150 boundary vertices",
    test: (b) => b.silhouetteVerts >= 150,
    detail: (b) => `${b.silhouetteVerts} boundary vertices`,
  },
  {
    id: "framing",
    label: "fills its frame without being cropped: 80-99%",
    test: (b) => b.fillW >= 80 && b.fillW <= 99 && b.fillH >= 80 && b.fillH <= 99,
    detail: (b) => `${b.fillW}%w ${b.fillH}%h`,
  },
];

// Two buildings that share a silhouette are one building drawn twice, whatever
// their bounding boxes say. Set against a deliberate floor: the five are meant
// to be a cottage, a forge, an inn, a manor and a barn, and those words alone
// already imply five different outlines.
const MIN_PAIR_DISTANCE = 0.12;

// ---------------------------------------------------------------------------
// Harness: headless Edge over CDP, same shape as audit-scene.mjs.
// ---------------------------------------------------------------------------

const SEEDS = [3, 11];
const PORT = process.env.KS_PORT || "3000";
const BASE = process.env.KS_BASE || "kingdom-spellers";
const ROOT = path.resolve(".snap");
fs.mkdirSync(ROOT, { recursive: true });

function findBrowser() {
  const cands = [
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  ];
  const hit = cands.find((p) => fs.existsSync(p));
  if (!hit) throw new Error("No Chromium browser found");
  return hit;
}

async function measure(seed) {
  const exe = findBrowser();
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "ks-audit-"));
  const port = 9333 + (seed % 100);
  const proc = spawn(exe, [
    "--headless=new", "--disable-gpu", "--no-first-run",
    "--remote-debugging-port=" + port,
    "--user-data-dir=" + profile,
    "about:blank",
  ], { stdio: "ignore" });

  const cleanup = () => {
    try { proc.kill(); } catch { /* already gone */ }
    try { fs.rmSync(profile, { recursive: true, force: true }); } catch { /* best effort */ }
  };

  try {
    // Wait for the debugging endpoint.
    let wsUrl = null;
    for (let tries = 0; tries < 60 && !wsUrl; tries += 1) {
      await new Promise((r) => setTimeout(r, 250));
      try {
        const res = await fetch(`http://127.0.0.1:${port}/json/list`);
        const tabs = await res.json();
        const page = tabs.find((t) => t.type === "page");
        if (page) wsUrl = page.webSocketDebuggerUrl;
      } catch { /* not up yet */ }
    }
    if (!wsUrl) throw new Error("Could not reach the CDP endpoint");

    const ws = new WebSocket(wsUrl);
    await new Promise((res, rej) => {
      ws.onopen = res;
      ws.onerror = () => rej(new Error("CDP socket failed"));
    });

    let id = 0;
    const waiters = new Map();
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && waiters.has(msg.id)) {
        const { res, rej } = waiters.get(msg.id);
        waiters.delete(msg.id);
        if (msg.error) rej(new Error(JSON.stringify(msg.error)));
        else res(msg.result);
      }
    };
    const send = (method, params) => new Promise((res, rej) => {
      id += 1;
      waiters.set(id, { res, rej });
      ws.send(JSON.stringify({ id, method, params: params || {} }));
    });

    const url = `http://127.0.0.1:${PORT}/${BASE}/#/showroom?seed=${seed}`;
    await send("Page.enable");
    await send("Runtime.enable");
    await send("Page.navigate", { url });

    // Poll rather than sleep a fixed amount. On a cold dev server Vite has to
    // transform every module in the art system on the first request, which can
    // take several seconds; on a warm one it is instant. A fixed sleep is either
    // slow every run or flaky.
    const READY = `(!!document.querySelector(".shop-svg"))`;
    let ready = false;
    for (let i = 0; i < 40 && !ready; i += 1) {
      await new Promise((r) => setTimeout(r, 400));
      const c = await send("Runtime.evaluate", { expression: READY, returnByValue: true });
      ready = !!(c.result && c.result.value);
    }
    // One more beat for the cards' useLayoutEffect to measure and set viewBox.
    await new Promise((r) => setTimeout(r, 600));

    // A build or render error leaves the page blank, and "no .shop-svg found"
    // gives no hint why. Surface the real message instead of making the reader
    // go and look for it.
    const err = await send("Runtime.evaluate", {
      expression: `(function () {
        const ov = document.querySelector("vite-error-overlay");
        if (ov) {
          const m = ov.shadowRoot && ov.shadowRoot.querySelector(".message");
          return "build error: " + ((m && m.textContent) || "see overlay").slice(0, 300);
        }
        if (!document.querySelector(".shop-svg")) {
          return "page rendered but no .shop-svg; body starts: "
            + document.body.innerText.slice(0, 160).replace(/\\s+/g, " ");
        }
        return "";
      })()`,
      returnByValue: true,
    });
    if (err.result && err.result.value) throw new Error(err.result.value);

    const r = await send("Runtime.evaluate", {
      expression: AUDIT,
      returnByValue: true,
      awaitPromise: true,
    });
    ws.close();
    const val = r.result && r.result.value;
    if (!val) throw new Error("Audit script returned nothing");
    if (val.fatal) throw new Error(val.fatal);
    return val.out;
  } finally {
    cleanup();
  }
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

const all = new Map();
for (const seed of SEEDS) {
  let rows;
  try {
    rows = await measure(seed);
  } catch (e) {
    console.error(`\n❌ Could not measure seed ${seed}: ${e.message}`);
    console.error("Is the dev server running?  npm run dev");
    process.exit(1);
  }
  for (const r of rows) {
    if (!all.has(r.name)) all.set(r.name, []);
    all.get(r.name).push(r);
  }
}

const names = [...all.keys()];
let failed = 0;
const lines = [];

lines.push("");
lines.push("BUILDING ART AUDIT");
lines.push("=".repeat(78));

for (const name of names) {
  const runs = all.get(name);
  lines.push("");
  lines.push(`${name}  (seeds ${SEEDS.join(", ")})`);
  lines.push("-".repeat(78));
  for (const c of CHECKS) {
    // A check must pass at EVERY seed, or the art only works sometimes.
    const per = runs.map((r) => ({ ok: c.test(r), detail: c.detail(r) }));
    const ok = per.every((p) => p.ok);
    if (!ok) failed += 1;
    lines.push(
      `  ${ok ? "ok  " : "FAIL"}  ${c.label.padEnd(58)} ${per[0].detail}`
      + (per.length > 1 && per.some((p) => !p.ok) ? "   (varies by seed)" : "")
    );
  }
  const r0 = runs[0];
  lines.push("");
  lines.push(
    `  measured: ${r0.shapes} shapes, ${r0.beams} beams, ${r0.windows}w/${r0.doors}d, ` +
    `${r0.propTotal} props (${r0.propKinds} kinds), ${r0.colours} colours, ` +
    `aspect ${r0.aspect}`
  );
}

// Cross-building: the five silhouettes must actually be different shapes.
//
// The earlier version of this check compared bounding-box aspect ratios, which
// is the wrong instrument: a cottage and an inn can share an aspect ratio and
// still be nothing alike, and two genuinely different buildings can happen to
// match. Each building is rasterised to a 20x20 occupancy mask over its own
// bounding box and the masks are compared directly. Jaccard distance of 0 means
// "the same shape", 1 means "no cells in common".
function jaccard(a, b) {
  if (!a || !b) return 0;
  let both = 0;
  let either = 0;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] && b[i]) both += 1;
    if (a[i] || b[i]) either += 1;
  }
  return either ? 1 - both / either : 0;
}

lines.push("");
lines.push("ACROSS THE SET");
lines.push("-".repeat(78));

const pairs = [];
for (let i = 0; i < names.length; i += 1) {
  for (let j = i + 1; j < names.length; j += 1) {
    // Worst case over seeds: a pair that differs at one seed but not another
    // has not been shown to be different.
    let worst = 1;
    for (const ra of all.get(names[i])) {
      for (const rb of all.get(names[j])) {
        worst = Math.min(worst, jaccard(ra.mask, rb.mask));
      }
    }
    pairs.push({ a: names[i], b: names[j], d: worst });
  }
}
const worstPair = pairs.reduce((m, p) => (p.d < m.d ? p : m), pairs[0]);
const pairOk = worstPair.d >= MIN_PAIR_DISTANCE;
if (!pairOk) failed += 1;
lines.push(
  `  ${pairOk ? "ok  " : "FAIL"}  ` +
  `${"no two buildings share a silhouette".padEnd(58)} ` +
  `closest pair ${worstPair.d.toFixed(2)} (need ${MIN_PAIR_DISTANCE})`
);
lines.push(
  `          closest pair: ${worstPair.a} / ${worstPair.b}`
);
for (const p of pairs.sort((x, y) => x.d - y.d)) {
  const bar = "#".repeat(Math.round(p.d * 24));
  lines.push(`          ${(p.a + " / " + p.b).padEnd(28)} ${p.d.toFixed(2)}  ${bar}`);
}

const aspects = names.map((n) => all.get(n)[0].aspect);
lines.push("");
lines.push(`  massing aspect (architecture only, shadow excluded):`);
for (let i = 0; i < names.length; i += 1) {
  lines.push(`          ${names[i].padEnd(14)} ${aspects[i].toFixed(2)}`);
}

lines.push("");
lines.push("=".repeat(78));
lines.push(failed === 0
  ? `ALL CHECKS PASS across ${SEEDS.length} seeds.`
  : `${failed} check(s) FAILED.`);

const report = lines.join("\n");
console.log(report);

fs.writeFileSync(path.join(ROOT, "audit-shop.json"), JSON.stringify(
  {
    seeds: SEEDS,
    buildings: Object.fromEntries([...all].map(([k, v]) => [k, v.map((r) => ({ ...r, mask: undefined }))])),
    aspects,
    pairs,
  },
  null,
  2,
));

process.exit(failed === 0 ? 0 : 1);