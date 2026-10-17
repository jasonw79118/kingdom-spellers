// What is the castle measured against?
//
// Scene check #1 asks "can I identify the castle?" and fails when the castle
// does not clear every other building's roofline. The audit prints a single
// number (`topClearsOthersBy`) which says the castle loses, but not to what.
// This probe lists every building the audit considers, sorted by how high its
// top edge reaches, so the competing mass is visible rather than guessed at.
//
// Usage: node scripts/probe-castle.mjs [.snap/village.svg]

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

const svgPath = path.resolve(process.argv[2] || ".snap/village.svg");
const svg = fs.readFileSync(svgPath, "utf8");

const EDGE = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
].find((p) => fs.existsSync(p));

const profile = fs.mkdtempSync(path.join(os.tmpdir(), "ks-probe-"));
const page = path.join(profile, "scene.html");
fs.writeFileSync(page, `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:#fff}svg{display:block}</style>${svg}`, "utf8");

const proc = spawn(EDGE, [
  "--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-first-run",
  "--remote-debugging-port=0", `--user-data-dir=${profile}`,
  "--window-size=1600,1200", `file:///${page.replace(/\\/g, "/")}`,
], { stdio: ["ignore", "ignore", "pipe"] });

const cleanup = () => {
  try { proc.kill(); } catch { /* gone */ }
  try { fs.rmSync(profile, { recursive: true, force: true }); } catch { /* locked */ }
};

async function endpoint() {
  const portFile = path.join(profile, "DevToolsActivePort");
  for (let i = 0; i < 150; i += 1) {
    try {
      const lines = fs.readFileSync(portFile, "utf8").split("\n");
      if (lines.length >= 2 && lines[0].trim()) return `ws://127.0.0.1:${lines[0].trim()}${lines[1].trim()}`;
    } catch { /* not ready */ }
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

// Same collection the audit uses, so this probe cannot disagree with it.
const PROBE = `(() => {
  const svg = document.querySelector("svg");
  if (!svg) return { fatal: "no svg" };
  const q = (sel) => [...svg.querySelectorAll(sel)];
  const box = (el) => { try { const b = el.getBBox(); return { x: b.x, y: b.y, w: b.width, h: b.height }; } catch { return null; } };

  // getBBox() is in the element's OWN space: it excludes the element's own
  // transform. Purchased buildings carry translate(...) on the very element the
  // audit measures, so their raw bbox cannot be compared with a house's. This
  // maps the bbox corners through the full CTM into the SVG's root user space,
  // which is the same space the viewBox and every other check use.
  const rootInv = svg.getScreenCTM().inverse();
  const rootBox = (el) => {
    const b = box(el);
    if (!b) return null;
    const m = rootInv.multiply(el.getScreenCTM());
    const corners = [[b.x, b.y], [b.x + b.w, b.y], [b.x + b.w, b.y + b.h], [b.x, b.y + b.h]]
      .map(([x, y]) => ({ x: m.a * x + m.c * y + m.e, y: m.b * x + m.d * y + m.f }));
    const xs = corners.map((p) => p.x);
    const ys = corners.map((p) => p.y);
    return {
      x: Math.min(...xs), y: Math.min(...ys),
      w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys),
    };
  };

  const all = q('[data-subrole="purchased"],[data-subrole="house"],[data-subrole="shed"],[data-subrole="keep"]');
  const rows = all.map((e) => {
    const b = box(e);
    const rb = rootBox(e);
    const id = e.getAttribute("data-id") || "?";
    const sub = e.getAttribute("data-subrole") || "?";
    const num = (v) => (typeof v === "number" && isFinite(v) ? +v.toFixed(1) : null);
    const tr = e.getAttribute("transform") || "";
    const m = tr.match(/translate\\(([-\\d.]+)\\s+([-\\d.]+)\\)/);
    return {
      id, sub,
      localTop: b ? num(b.y) : null,
      rootTop: rb ? num(rb.y) : null,
      rootBottom: rb ? num(rb.y + rb.h) : null,
      rootH: rb ? num(rb.h) : null,
      rootW: rb ? num(rb.w) : null,
      localH: b ? num(b.h) : null,
      scale: e.getAttribute("data-scale"),
      baseY: m ? num(+m[2]) : null,
    };
  }).filter((r) => r.rootTop != null);
  rows.sort((a, b) => a.rootTop - b.rootTop);
  return { count: rows.length, rows: rows.slice(0, 16) };
})()`;

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
  await new Promise((r) => setTimeout(r, 1200));
  const res = await send("Runtime.evaluate", { expression: PROBE, returnByValue: true }, sessionId);
  if (res.exceptionDetails) {
    throw new Error(res.exceptionDetails.exception?.description || res.exceptionDetails.text || "probe threw");
  }
  const r = res.result.value;
  if (r.fatal) throw new Error(r.fatal);

  console.log(`\n  ${r.count} buildings in ROOT space, highest roofline first`);
  console.log("  localTop is what the audit measures today; rootTop is the real position.\n");
  console.log("  rootTop  rootBot  rootH  localTop  localH  scale   sub         id");
  console.log("  " + "-".repeat(74));
  for (const row of r.rows) {
    console.log(
      `  ${String(row.rootTop).padStart(7)}  ${String(row.rootBottom).padStart(7)}  ${String(row.rootH).padStart(5)}  ${String(row.localTop).padStart(8)}  ${String(row.localH).padStart(6)}  ${String(row.scale ?? "-").padStart(5)}  ${row.sub.padEnd(10)}  ${row.id}`
    );
  }
  const castle = r.rows.find((x) => /castle/i.test(x.id));
  const others = r.rows.filter((x) => x !== castle);
  if (castle && others.length) {
    const winner = others.reduce((m, x) => (x.rootTop < m.rootTop ? x : m));
    const lwinner = others.reduce((m, x) => (x.localTop < m.localTop ? x : m));
    console.log(`\n  ROOT space: castle top ${castle.rootTop}; nearest rival ${winner.id} top ${winner.rootTop} -> clears by ${(winner.rootTop - castle.rootTop).toFixed(1)}px`);
    console.log(`  LOCAL space (what the audit uses): castle ${castle.localTop}; rival ${lwinner.id} ${lwinner.localTop} -> clears by ${(lwinner.localTop - castle.localTop).toFixed(1)}px`);
  }
  ws.close();
} catch (err) {
  console.error(`Probe failed: ${err.message}`);
} finally {
  cleanup();
}
