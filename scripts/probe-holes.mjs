// Find holes in a building's architecture.
//
// "Missing parts of the image" is the hardest art bug to see and the easiest to
// measure: if a wall, roof or tower is not drawn, the silhouette has a gap in
// it, and a gap is a hole you can flood-fill. This finds those holes by
// rasterising each mass in isolation and asking which pixels NO mass ever
// paints.
//
// Two things this had to get right, both of which produced confident nonsense
// before:
//
//   1. Ground decals must be excluded. The contact shadow is one opaque
//      polygon covering the whole footprint, so including it paints over every
//      gap underneath and the castle always reports zero holes.
//   2. The test is per-mass union, not per-mass bbox. A mass's bounding box is
//      mostly empty sky; measuring a bbox tells you nothing about coverage.
//
// It reports the largest holes with their position in ART units (the same units
// as getBBox, so they can be compared against a mass's own bbox), which is
// enough to name the mass that should have been there.
//
// Usage: node scripts/probe-holes.mjs [id] [seed]
//   id defaults to castle. Needs the dev server on :3000.

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
  if (!svg) return { fatal: "no .shop-svg" };
  const name = document.querySelector(".shop-card h3").textContent;
  const b = svg.querySelector('[data-role="building"]');

  // Ground decals: opaque, cover the footprint, hide every hole.
  const DECAL = new Set(["shadow", "moat", "rubble", "weeds"]);
  // Indices into the live child list, because the clone's nodes are different
  // objects and can never be compared to these by identity.
  const keepIdx = Array.from(b.children)
    .map((el, i) => ({ el, i, role: el.getAttribute("data-role") }))
    .filter((m) => !DECAL.has(m.role))
    .map((m) => m.i);
  const label = (i) => {
    const el = b.children[i];
    const role = el.getAttribute("data-role") || el.tagName;
    const face = el.getAttribute("data-face");
    return face ? role + "/" + face : role;
  };
  if (!keepIdx.length) return { fatal: "no architecture masses" };

  const bb = b.getBBox();
  const PX_PER_UNIT = 4;                       // oversample: holes are small
  const W = Math.min(1500, Math.round(bb.width * PX_PER_UNIT));
  const H = Math.round(W * bb.height / bb.width);

  const serialize = (onlyIdx) => {
    const clone = svg.cloneNode(true);
    clone.querySelectorAll('[data-role="ground"]').forEach((x) => x.remove());
    const t = clone.querySelector('[data-role="building"]');
    // The card wraps the building in translate()+scale(3.4) so it fills the
    // frame. getBBox() reports coordinates BEFORE that transform, so measuring
    // against an art-unit viewBox while the transform is still applied puts the
    // whole building 3.4x off-canvas and every count comes out wrong. Strip it
    // so art units are the same units on both sides of the measurement.
    let wrap = t.parentNode;
    while (wrap && wrap !== clone) {
      if (wrap.getAttribute && wrap.getAttribute("transform")) {
        wrap.removeAttribute("transform");
        break;
      }
      wrap = wrap.parentNode;
    }
    // Positional, not identity: a cloned node is a different object from the
    // live one, so c === liveNode is always false and every mass gets dropped.
    Array.from(t.children).forEach((c, i) => { if (i !== onlyIdx) c.remove(); });
    clone.setAttribute("viewBox", [bb.x, bb.y, bb.width, bb.height].join(" "));
    clone.setAttribute("width", W);
    clone.setAttribute("height", H);
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    return new XMLSerializer().serializeToString(clone);
  };

  const load = (svgText) => new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => {
      const cv = document.createElement("canvas");
      cv.width = W; cv.height = H;
      const ctx = cv.getContext("2d");
      ctx.drawImage(img, 0, 0, W, H);
      res(ctx.getImageData(0, 0, W, H).data);
    };
    img.onerror = () => rej(new Error("raster failed"));
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgText);
  });

  // Union of every mass's painted pixels. Alpha, not colour: a shape can be
  // any colour and still count as "painted".
  const N = W * H;
  const painted = new Uint8Array(N);
  const perMass = [];
  for (let k = 0; k < keepIdx.length; k += 1) {
    const i = keepIdx[k];
    const d = await load(serialize(i));
    let n = 0;
    for (let p = 0; p < N; p += 1) {
      if (d[p * 4 + 3] >= 128) { painted[p] = 1; n += 1; }
    }
    const el = b.children[i];
    const mb = el.getBBox();
    perMass.push({
      i,
      name: label(i),
      role: el.getAttribute("data-role") || el.tagName,
      face: el.getAttribute("data-face"),
      bbox: [mb.x, mb.y, mb.width, mb.height].map((v) => Math.round(v)),
      // Coverage inside its OWN bbox: how much of the space it claims it fills.
      selfFill: +(100 * n / Math.max(1, (mb.width * PX_PER_UNIT) * (mb.height * PX_PER_UNIT))).toFixed(1),
      px: n,
    });
  }

  // Unpainted pixels. Flood in from the border; whatever the flood cannot reach
  // is enclosed by architecture, i.e. a hole.
  const seen = new Uint8Array(N);
  const stack = new Int32Array(N);
  let sp = 0;
  const push = (p) => {
    if (p >= 0 && p < N && !painted[p] && !seen[p]) { seen[p] = 1; stack[sp += 1 - 1] = p; }
  };
  for (let x = 0; x < W; x += 1) { push(x); push((H - 1) * W + x); }
  for (let y = 0; y < H; y += 1) { push(y * W); push(y * W + W - 1); }
  let spTop = sp;
  while (spTop > 0) {
    spTop -= 1;
    const p = stack[spTop];
    const x = p % W, y = (p - x) / W;
    if (x > 0 && !painted[p - 1] && !seen[p - 1]) { seen[p - 1] = 1; stack[sp += 1 - 1] = p - 1; }
    if (x < W - 1 && !painted[p + 1] && !seen[p + 1]) { seen[p + 1] = 1; stack[sp += 1 - 1] = p + 1; }
    if (y > 0 && !painted[p - W] && !seen[p - W]) { seen[p - W] = 1; stack[sp += 1 - 1] = p - W; }
    if (y < H - 1 && !painted[p + W] && !seen[p + W]) { seen[p + W] = 1; stack[sp += 1 - 1] = p + W; }
  }

  // Label the enclosed regions and size them.
  const holes = [];
  const done = new Uint8Array(N);
  const comp = new Int32Array(N);
  for (let p = 0; p < N; p += 1) {
    if (seen[p] || done[p] || painted[p]) continue;
    let cn = 0;
    comp[cn += 1 - 1] = p; done[p] = 1;
    while (cn > 0) {
      cn -= 1;
      const q = comp[cn];
      const x = q % W, y = (q - x) / W;
      const nb = [x > 0 ? q - 1 : -1, x < W - 1 ? q + 1 : -1, y > 0 ? q - W : -1, y < H - 1 ? q + W : -1];
      for (const n2 of nb) if (n2 >= 0 && !painted[n2] && !done[n2] && !seen[n2]) { done[n2] = 1; comp[cn += 1 - 1] = n2; }
    }
    const size = cn + 1;
    let sx = 0, sy = 0, mnx = W, mxx = -1, mny = H, mxy = -1;
    for (let k = 0; k <= cn; k += 1) {
      const q = comp[k];
      const x = q % W, y = (q - x) / W;
      sx += x; sy += y;
      if (x < mnx) mnx = x; if (x > mxx) mxx = x;
      if (y < mny) mny = y; if (y > mxy) mxy = y;
    }
    const u = bb.width / W, v = bb.height / H;
    holes.push({
      pct: +(100 * size / N).toFixed(2),
      centre: [Math.round(bb.x + (sx / size) * u), Math.round(bb.y + (sy / size) * v)],
      box: [
        Math.round(bb.x + mnx * u), Math.round(bb.y + mny * v),
        Math.round(bb.x + mxx * u), Math.round(bb.y + mxy * v),
      ],
      sizeArt: +((mxx - mnx) * u * (mxy - mny) * v).toFixed(0),
      px: size,
    });
  }
  holes.sort((a, c) => c.px - a.px);

  // Which mass's own bbox does each big hole sit inside? That names the
  // missing geometry without anyone having to look at the picture.
  for (const h of holes) {
    if (h.pct < 0.05) continue;
    h.inside = perMass
      .filter((m) => h.centre[0] >= m.bbox[0] && h.centre[0] <= m.bbox[0] + m.bbox[2]
        && h.centre[1] >= m.bbox[1] && h.centre[1] <= m.bbox[1] + m.bbox[3])
      .map((m) => m.name);
  }

  let totalPainted = 0;
  for (let p = 0; p < N; p += 1) totalPainted += painted[p];
  return {
    name,
    raster: [W, H],
    artBBox: [bb.x, bb.y, bb.width, bb.height].map((v) => Math.round(v)),
    coveragePct: +(100 * totalPainted / N).toFixed(1),
    masses: perMass,
    holes,
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
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "ks-probe-"));
  const port = 9401;
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
console.log(`\n${out.name}  (seed ${SEED})`);
console.log("=".repeat(72));
console.log(`art bbox ${JSON.stringify(out.artBBox)}   raster ${JSON.stringify(out.raster)}`);
console.log(`architecture covers ${out.coveragePct}% of its own bbox\n`);
console.log("per-mass coverage inside its own bbox:");
for (const m of out.masses) {
  const flag = m.selfFill < 25 ? "  <-- mostly empty" : "";
  console.log(`  ${String(m.name).padEnd(18)} ${String(m.px).padStart(7)}px  selfFill ${String(m.selfFill).padStart(5)}%  bbox ${JSON.stringify(m.bbox)}${flag}`);
}
const big = out.holes.filter((h) => h.pct >= 0.03);
console.log(`\nenclosed holes (>=0.03% of frame): ${big.length}`);
for (const h of big.slice(0, 20)) {
  console.log(`  ${String(h.pct).padStart(5)}%  centre ${JSON.stringify(h.centre).padEnd(14)} box ${JSON.stringify(h.box).padEnd(26)} in: ${h.inside.join(", ") || "(between masses)"}`);
}
console.log("");