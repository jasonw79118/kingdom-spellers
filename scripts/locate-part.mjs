// Which named part of a building does a rectangle of capture pixels cover?
//
// The capture is taken with --window-size=W,H at deviceScaleFactor 1, so CSS
// pixels are capture pixels and getBoundingClientRect() is directly comparable
// with the PNG. That makes it possible to take a region a person pointed at and
// name the piece of geometry sitting under it, which is the step that turns
// "something looks wrong" into an editable line of code.
//
// Usage: node scripts/locate-part.mjs <id> <seed> <x0> <y0> <x1> <y1>

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";

const ID = process.argv[2] || "castle";
const SEED = process.argv[3] || "3";
const X0 = Number(process.argv[4]);
const Y0 = Number(process.argv[5]);
const X1 = Number(process.argv[6]);
const Y1 = Number(process.argv[7]);
const PORT = process.env.KS_PORT || "3000";
const BASE = process.env.KS_BASE || "kingdom-spellers";
const W = 2200, H = 1700;

const PROBE = String.raw`
(function () {
  const RECT = [__X0__, __Y0__, __X1__, __Y1__];
  const svg = document.querySelector(".shop-svg");
  if (!svg) return { fatal: "no .shop-svg" };
  const b = svg.querySelector('[data-role="building"]');
  const label = (el) => {
    const role = el.getAttribute("data-role") || el.tagName;
    const face = el.getAttribute("data-face");
    return face ? role + "/" + face : role;
  };
  const bb = b.getBBox();
  const br = b.getBoundingClientRect();
  const sr = svg.getBoundingClientRect();
  const vb = svg.viewBox.baseVal;

  // Which individual shapes actually paint inside the region of interest.
  // Mass-level rects overlap heavily and are far too coarse to name a part.
  const shapes = [];
  for (const el of b.querySelectorAll("polygon,path,circle,ellipse,rect")) {
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) continue;
    if (r.right < RECT[0] || r.left > RECT[2] || r.bottom < RECT[1] || r.top > RECT[3]) continue;
    let chain = [];
    for (let p = el; p && p !== b; p = p.parentNode) {
      const rr = p.getAttribute && p.getAttribute("data-role");
      if (rr) { chain.push(rr + (p.getAttribute("data-face") ? "/" + p.getAttribute("data-face") : "")); break; }
    }
    shapes.push({
      tag: el.tagName,
      chain: chain.join(">") || "-",
      x: Math.round(r.left), y: Math.round(r.top),
      w: Math.round(r.width), h: Math.round(r.height),
      area: Math.round(r.width * r.height),
      fill: el.getAttribute("fill") || "",
    });
  }
  shapes.sort((p, q) => q.area - p.area);

  const masses = Array.from(b.children).map((el, i) => {
    const r = el.getBoundingClientRect();
    const g = el.getBBox();
    return {
      i, name: label(el),
      depth: el.getAttribute("data-depth"),
      // capture-pixel rect
      x: Math.round(r.left), y: Math.round(r.top),
      w: Math.round(r.width), h: Math.round(r.height),
      // art-unit bbox, for reference
      ax: Math.round(g.x), ay: Math.round(g.y),
      aw: Math.round(g.width), ah: Math.round(g.height),
    };
  });

  return {
    svg: { x: Math.round(sr.left), y: Math.round(sr.top), w: Math.round(sr.width), h: Math.round(sr.height) },
    viewBox: [vb.x, vb.y, vb.width, vb.height],
    buildingRect: { x: Math.round(br.left), y: Math.round(br.top), w: Math.round(br.width), h: Math.round(br.height) },
    buildingBBox: [Math.round(bb.x), Math.round(bb.y), Math.round(bb.width), Math.round(bb.height)],
    masses,
    shapes,
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
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "ks-loc-"));
  const port = 9412;
  const proc = spawn(exe, [
    "--headless=new", "--disable-gpu", "--no-first-run",
    "--window-size=" + W + "," + H,
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
    await send("Page.enable");
    await send("Runtime.enable");
    await send("Page.navigate", {
      url: `http://127.0.0.1:${PORT}/${BASE}/#/showroom?seed=${SEED}&only=${ID}`,
    });
    for (let i = 0; i < 40; i += 1) {
      await new Promise((r) => setTimeout(r, 400));
      const c = await send("Runtime.evaluate", {
        expression: `(!!document.querySelector(".shop-svg"))`, returnByValue: true,
      });
      if (c.result && c.result.value) break;
    }
    await new Promise((r) => setTimeout(r, 800));
    const r = await send("Runtime.evaluate", {
      expression: PROBE.replace("__X0__", X0).replace("__Y0__", Y0)
        .replace("__X1__", X1).replace("__Y1__", Y1),
      returnByValue: true,
    });
    ws.close();
    const v = r.result && r.result.value;
    if (!v) throw new Error("probe returned nothing");
    if (v.fatal) throw new Error(v.fatal);
    return v;
  } finally {
    try { proc.kill(); } catch { /* gone */ }
    try { fs.rmSync(profile, { recursive: true, force: true }); } catch { /* best effort */ }
  }
}

const out = await run();
console.log(`viewport ${W}x${H}`);
console.log(`svg rect      ${JSON.stringify(out.svg)}   viewBox ${JSON.stringify(out.viewBox)}`);
console.log(`building rect ${JSON.stringify(out.buildingRect)}   art bbox ${JSON.stringify(out.buildingBBox)}\n`);
console.log(`region you pointed at: x ${X0}..${X1}, y ${Y0}..${Y1}\n`);

const rw = X1 - X0, rh = Y1 - Y0;
const rows = out.masses.map((m) => {
  const ox = Math.max(0, Math.min(X1, m.x + m.w) - Math.max(X0, m.x));
  const oy = Math.max(0, Math.min(Y1, m.y + m.h) - Math.max(Y0, m.y));
  return { ...m, ox, oy, frac: (ox * oy) / Math.max(1, rw * rh) };
}).filter((m) => m.ox > 0 && m.oy > 0);

console.log("masses whose rect overlaps that region:");
console.log("  #  mass              depth   rect (capture px)          covered");
for (const m of rows.sort((a, b) => b.frac - a.frac)) {
  console.log(
    `  ${String(m.i).padStart(2)} ${String(m.name).padEnd(18)}`
    + `${String(m.depth ?? "-").padStart(5)}`
    + `   ${`${m.x},${m.y} ${m.w}x${m.h}`.padEnd(22)}`
    + `${(m.frac * 100).toFixed(0)}%`,
  );
}
if (!rows.length) console.log("  none - the region is outside the building entirely");

console.log(`\n${out.shapes.length} shapes intersect the region. Largest 18:`);
console.log("  tag       part                       rect (capture px)      fill");
for (const s of out.shapes.slice(0, 18)) {
  console.log(
    `  ${s.tag.padEnd(9)} ${String(s.chain).padEnd(26)}`
    + `${`${s.x},${s.y} ${s.w}x${s.h}`.padEnd(23)}${s.fill}`,
  );
}