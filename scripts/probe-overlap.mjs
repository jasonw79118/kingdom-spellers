// Which mass paints over which, and is that correct?
//
// "Part of the tower looks like it is on top of another roof" is a claim about
// OCCLUSION, not about missing geometry. Two masses can both be drawn, each
// complete, and still look wrong if the nearer one is painted first: the far
// one ends up drawn on top of it and reads as floating in front.
//
// In this isometric view the painter's order is fixed and not negotiable: sort
// by depth = gx + gy, ascending, so nearer masses are painted later. Every
// sibling pair whose painted pixels overlap is therefore either correctly
// ordered or visibly broken, and this measures both.
//
// Usage: node scripts/probe-overlap.mjs [id] [seed]

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";

const ONLY = process.argv[2] || "castle";
const SEED = process.argv[3] || "3";
const PORT = process.env.KS_PORT || "3000";
const BASE = process.env.KS_BASE || "kingdom-spellers";

const PROBE = String.raw`
(async function () {
  const svg = document.querySelector(".shop-svg");
  if (!svg) {
    return {
      fatal: "no .shop-svg at " + location.href + " | title=" + document.title
        + " | root=" + (document.getElementById("root") ? "yes" : "no")
        + " | cards=" + document.querySelectorAll(".shop-card").length
        + " | body=" + (document.body.innerText || "").slice(0, 200),
    };
  }
  const name = document.querySelector(".shop-card h3").textContent;
  const b = svg.querySelector('[data-role="building"]');
  const DECAL = new Set(["shadow", "moat", "rubble", "weeds"]);

  const idx = [];
  Array.from(b.children).forEach((el, i) => {
    if (!DECAL.has(el.getAttribute("data-role"))) idx.push(i);
  });
  const label = (i) => {
    const el = b.children[i];
    const role = el.getAttribute("data-role") || el.tagName;
    const face = el.getAttribute("data-face");
    return face ? role + "/" + face : role;
  };

  const bb = b.getBBox();
  const PX = 4;
  const W = Math.min(1500, Math.round(bb.width * PX));
  const H = Math.round(W * bb.height / bb.width);
  const N = W * H;

  const render = (only) => {
    const clone = svg.cloneNode(true);
    clone.querySelectorAll('[data-role="ground"]').forEach((x) => x.remove());
    const t = clone.querySelector('[data-role="building"]');
    let wrap = t.parentNode;
    while (wrap && wrap !== clone) {
      if (wrap.getAttribute && wrap.getAttribute("transform")) {
        wrap.removeAttribute("transform");
        break;
      }
      wrap = wrap.parentNode;
    }
    Array.from(t.children).forEach((c, i) => {
      if (only.length === 0 || only.indexOf(i) < 0) c.remove();
    });
    clone.setAttribute("viewBox", [bb.x, bb.y, bb.width, bb.height].join(" "));
    clone.setAttribute("width", W);
    clone.setAttribute("height", H);
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    return new XMLSerializer().serializeToString(clone);
  };

  const load = (txt) => new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => {
      const cv = document.createElement("canvas");
      cv.width = W; cv.height = H;
      const ctx = cv.getContext("2d");
      ctx.drawImage(img, 0, 0, W, H);
      res(ctx.getImageData(0, 0, W, H).data);
    };
    img.onerror = () => rej(new Error("raster failed"));
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(txt);
  });

  // One mask per mass.
  const masks = idx.map(() => new Uint8Array(N));
  for (let k = 0; k < idx.length; k += 1) {
    const d = await load(render([idx[k]]));
    for (let p = 0; p < N; p += 1) if (d[p * 4 + 3] >= 128) masks[k][p] = 1;
  }

  // For each pixel that 2+ masses paint, which one is topmost?
  const winner = new Int32Array(N).fill(-1);
  const contenders = new Uint8Array(N);
  for (let p = 0; p < N; p += 1) {
    let c = 0;
    for (let k = 0; k < idx.length; k += 1) {
      if (masks[k][p]) { c += 1; winner[p] = k; }   // later index paints later = on top
    }
    if (c > 1) contenders[p] = 1;
  }

  // Exact pairwise shared-pixel counts. A bounding-box test is not good enough
  // here: adjacent walls that merely touch at a corner, and masses separated
  // by a few pixels, produce box overlaps with no shared ink at all, and
  // flagging those buries the real inversions in noise.
  const pair = [];
  for (let a = 0; a < idx.length; a += 1) {
    for (let b = a + 1; b < idx.length; b += 1) {
      let n = 0;
      for (let p = 0; p < N; p += 1) if (masks[a][p] && masks[b][p]) n += 1;
      if (n > 0) pair.push([a, b, n]);
    }
  }

  // Attribute each contested pixel's topmost mass, and each mass's losses.
  const wins = idx.map(() => 0);
  const losses = idx.map(() => 0);
  let contested = 0;
  for (let p = 0; p < N; p += 1) {
    if (!contenders[p]) continue;
    contested += 1;
    wins[winner[p]] += 1;
    for (let k = 0; k < idx.length; k += 1) if (masks[k][p] && k !== winner[p]) losses[k] += 1;
  }

  // Painter order as written, with each mass's screen extent.
  const order = idx.map((i, k) => {
    const el = b.children[i];
    const mb = el.getBBox();
    const raw = el.getAttribute("data-depth");
    return {
      k, i, name: label(i),
      role: el.getAttribute("data-role") || el.tagName,
      depth: raw === null ? null : Math.round(Number(raw) * 100) / 100,
      bbox: [mb.x, mb.y, mb.width, mb.height].map((v) => Math.round(v)),
      ink: masks[k].reduce((a, v) => a + v, 0),
      winsTop: wins[k],
      hiddenPx: losses[k],
    };
  });

  return {
    name,
    raster: [W, H],
    totalInk: order.reduce((a, m) => a + m.ink, 0),
    contestedPct: +(100 * contested / N).toFixed(1),
    order,
    pair,
  };
})()
`;

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

async function run() {
  const exe = findBrowser();
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "ks-ovl-"));
  const port = 9402;
  const proc = spawn(exe, [
    "--headless=new", "--disable-gpu", "--no-first-run",
    "--remote-debugging-port=" + port,
    "--user-data-dir=" + profile,
    "about:blank",
  ], { stdio: "ignore" });
  try {
    let wsUrl = null;
    for (let i = 0; i < 60 && !wsUrl; i += 1) {
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
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error("CDP failed")); });
    let id = 0;
    const waiters = new Map();
    ws.onmessage = (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id && waiters.has(m.id)) {
        const { res, rej } = waiters.get(m.id);
        waiters.delete(m.id);
        if (m.error) rej(new Error(JSON.stringify(m.error))); else res(m.result);
      }
    };
    const send = (method, params) => new Promise((res, rej) => {
      id += 1;
      waiters.set(id, { res, rej });
      ws.send(JSON.stringify({ id, method, params: params || {} }));
    });
    const url = `http://127.0.0.1:${PORT}/${BASE}/#/showroom?seed=${SEED}&only=${ONLY}`;
    await send("Page.enable");
    await send("Runtime.enable");
    await send("Page.navigate", { url });
    for (let i = 0; i < 40; i += 1) {
      await new Promise((r) => setTimeout(r, 400));
      const c = await send("Runtime.evaluate", {
        expression: `(!!document.querySelector(".shop-svg"))`, returnByValue: true,
      });
      if (c.result && c.result.value) break;
    }
    await new Promise((r) => setTimeout(r, 700));
    const r = await send("Runtime.evaluate", {
      expression: PROBE, returnByValue: true, awaitPromise: true,
    });
    ws.close();
    const val = r.result && r.result.value;
    if (!val) throw new Error("probe returned nothing");
    if (val.fatal) throw new Error(val.fatal);
    return val;
  } finally {
    try { proc.kill(); } catch { /* gone */ }
    try { fs.rmSync(profile, { recursive: true, force: true }); } catch { /* best effort */ }
  }
}

const out = await run();
console.log(`\n${out.name}  (seed ${SEED})   raster ${JSON.stringify(out.raster)}`);
console.log("=".repeat(78));
console.log(`total ink ${out.totalInk}px   contested pixels ${out.contestedPct}% of frame`);
console.log("\npainter order as written, back to front:");
console.log("  #  mass              depth    own ink    top of overlap   hidden by later");
for (const m of out.order) {
  const pctOwn = +(100 * m.hiddenPx / Math.max(1, m.ink)).toFixed(1);
  console.log(
    `  ${String(m.k).padStart(2)} ${String(m.name).padEnd(18)}`
    + `${(m.depth === null ? "  --" : String(m.depth)).padStart(6)}`
    + `${String(m.ink).padStart(9)}px`
    + `${String(m.winsTop).padStart(14)}px`
    + `${String(m.hiddenPx).padStart(12)}px (${pctOwn}%)`,
  );
}

// Painter order must be ascending depth. Any pair that shares painted pixels
// but is painted out of depth order means a farther mass is drawn on top of a
// nearer one, which reads as a piece of the building floating in front of, or
// perched on, another piece.
const inversions = [];
for (const [a, b, n] of out.pair) {
  const A = out.order[a], B = out.order[b];
  if (A.depth === null || B.depth === null) continue;
  // The batter is the foundation the whole castle stands on. It spans the full
  // footprint, so its centroid depth means nothing and it must always go down
  // first. Depth ordering does not apply to it.
  if (A.role === "batter" || B.role === "batter") continue;
  if (A.depth > B.depth) {
    inversions.push(`${B.name} (d${B.depth}) paints over ${A.name} (d${A.depth}) — ${n}px`);
  }
}
console.log("");
if (inversions.length === 0) {
  console.log("depth order: OK - every pair sharing ink is painted back to front");
} else {
  console.log(`depth order: ${inversions.length} INVERSION(S)`);
  for (const s of inversions) console.log("  ! " + s);
}
console.log("");