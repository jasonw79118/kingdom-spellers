// Neighbourhood clustering, measured honestly.
//
// Check #5 asks whether buildings cluster rather than scatter evenly, using the
// coefficient of variation (cv = sd/mean) of nearest-neighbour distances. Its
// threshold was set while the audit measured purchased buildings in their own
// local space and the ambient village in scene space, which artificially bunched
// five buildings at the origin and inflated the variance.
//
// This probe recomputes the same statistic in root space, and splits it by group
// so it is visible whether the ambient village clusters on its own or only ever
// appeared to because of the coordinate bug.
//
// Usage: node scripts/probe-cluster.mjs [.snap/village.svg]

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

const PROBE = `(() => {
  const svg = document.querySelector("svg");
  if (!svg) return { fatal: "no svg" };
  const q = (sel) => [...svg.querySelectorAll(sel)];
  const box = (el) => { try { const b = el.getBBox(); return { x: b.x, y: b.y, w: b.width, h: b.height }; } catch { return null; } };
  const rootInv = svg.getScreenCTM().inverse();
  const rbox = (el) => {
    const b = box(el);
    if (!b) return null;
    const m = rootInv.multiply(el.getScreenCTM());
    const cs = [[b.x, b.y], [b.x + b.w, b.y], [b.x + b.w, b.y + b.h], [b.x, b.y + b.h]]
      .map(([x, y]) => ({ x: m.a * x + m.c * y + m.e, y: m.b * x + m.d * y + m.f }));
    const xs = cs.map((p) => p.x), ys = cs.map((p) => p.y);
    return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
  };
  const all = q('[data-subrole="purchased"],[data-subrole="house"],[data-subrole="shed"],[data-subrole="keep"]');

  const stats = (pts) => {
    if (pts.length < 2) return null;
    const nn = pts.map((p, i) => {
      let best = Infinity;
      pts.forEach((o, j) => { if (i !== j) best = Math.min(best, Math.hypot(p.x - o.x, p.y - o.y)); });
      return best;
    });
    const mean = nn.reduce((s, v) => s + v, 0) / nn.length;
    const sd = Math.sqrt(nn.reduce((s, v) => s + (v - mean) ** 2, 0) / nn.length);
    const sorted = nn.slice().sort((a, b) => a - b);
    return { n: pts.length, mean: +mean.toFixed(1), sd: +sd.toFixed(1), cv: +(sd / mean).toFixed(3), min: +sorted[0].toFixed(1), max: +sorted[sorted.length - 1].toFixed(1) };
  };

  const rows = all.map((e) => {
    const b = rbox(e);
    if (!b) return null;
    return {
      id: e.getAttribute("data-id") || "?",
      sub: e.getAttribute("data-subrole") || "?",
      x: +(b.x + b.w / 2).toFixed(1),
      y: +(b.y + b.h / 2).toFixed(1),
    };
  }).filter(Boolean);

  const ambient = rows.filter((r) => r.sub === "house" || r.sub === "shed" || r.sub === "keep");
  const purchased = rows.filter((r) => r.sub === "purchased");

  return {
    all: stats(rows),
    ambientOnly: stats(ambient),
    purchasedOnly: stats(purchased),
    rows,
  };
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
  if (res.exceptionDetails) throw new Error(res.exceptionDetails.text || "probe threw");
  const r = res.result.value;
  if (r.fatal) throw new Error(r.fatal);

  const line = (label, s) =>
    s ? `  ${label.padEnd(14)} n=${String(s.n).padStart(2)}  mean ${String(s.mean).padStart(6)}  sd ${String(s.sd).padStart(6)}  cv ${String(s.cv).padStart(6)}  nn min/max ${s.min}/${s.max}`
      : `  ${label.padEnd(14)} not enough buildings`;

  console.log("\n  Neighbourhood clustering in ROOT space\n");
  console.log(line("all", r.all));
  console.log(line("ambient only", r.ambientOnly));
  console.log(line("purchased", r.purchasedOnly));
  console.log("\n  gate on check #5 requires cv >= 0.5\n");
  console.log("  centres (root space)");
  for (const row of r.rows) console.log(`    ${row.sub.padEnd(10)} ${String(row.x).padStart(7)},${String(row.y).padStart(7)}  ${row.id}`);
  ws.close();
} catch (err) {
  console.error(`Probe failed: ${err.message}`);
} finally {
  cleanup();
}
