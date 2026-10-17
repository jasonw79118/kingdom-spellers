// How wrong are the audit's content bounds?
//
// The audit's integrity block walks every drawn leaf (polygon, path, circle,
// ellipse, rect) and unions their getBBox() into minX/maxX/minY/maxY. That box
// then answers S2 ("nothing is clipped by the viewBox"), S3 ("the scene fills
// the frame"), and the castle's depthInFrame.
//
// getBBox() returns coordinates in the element's OWN user space: it ignores
// every transform above the element, including its own. Scene terrain is drawn
// with no transform, so it is measured correctly, but every building, prop,
// tree and villager is drawn inside one or more translate/scale groups, so
// their raw boxes land near the origin instead of where they are on the map.
//
// That is the same mistake that made check #1 compare incomparable boxes. This
// probe reports both the raw union (what the audit uses) and the true union in
// root space, so the size of the error is a number rather than a worry.
//
// Usage: node scripts/probe-bounds.mjs [.snap/village.svg]

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
  const vb = svg.viewBox.baseVal;
  const q = (sel) => [...svg.querySelectorAll(sel)];
  const rawBox = (el) => { try { const b = el.getBBox(); return { x: b.x, y: b.y, w: b.width, h: b.height }; } catch { return null; } };
  const rootInv = svg.getScreenCTM().inverse();
  const rootBox = (el) => {
    const b = rawBox(el);
    if (!b) return null;
    const m = rootInv.multiply(el.getScreenCTM());
    const cs = [[b.x, b.y], [b.x + b.w, b.y], [b.x + b.w, b.y + b.h], [b.x, b.y + b.h]]
      .map(([x, y]) => ({ x: m.a * x + m.c * y + m.e, y: m.b * x + m.d * y + m.f }));
    const xs = cs.map((p) => p.x), ys = cs.map((p) => p.y);
    return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
  };

  const sky = svg.querySelector("rect");
  const drawn = q("polygon, ellipse, circle, path, rect").filter(
    (e) => e !== sky && !e.closest("clipPath") && !e.closest("defs")
  );

  const union = (fn) => {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, used = 0, failed = 0;
    for (const el of drawn) {
      const b = fn(el);
      if (!b) { failed += 1; continue; }
      if (!b.w && !b.h) continue;
      used += 1;
      if (b.x < minX) minX = b.x;
      if (b.x + b.w > maxX) maxX = b.x + b.w;
      if (b.y < minY) minY = b.y;
      if (b.y + b.h > maxY) maxY = b.y + b.h;
    }
    return { minX: +minX.toFixed(0), minY: +minY.toFixed(0), maxX: +maxX.toFixed(0), maxY: +maxY.toFixed(0), used, failed };
  };

  const hasTransformAbove = (el) => {
    for (let n = el; n && n.tagName !== "svg"; n = n.parentElement) {
      const t = n.getAttribute && n.getAttribute("transform");
      if (t && /translate|scale|rotate|matrix/.test(t)) return true;
    }
    return false;
  };
  const transformedLeaves = drawn.filter(hasTransformAbove).length;

  return {
    viewBox: [vb.x, vb.y, vb.width, vb.height],
    leaves: drawn.length,
    transformedLeaves,
    raw: union(rawBox),
    root: union(rootBox),
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

  const fmt = (b) => `[${b.minX}, ${b.minY}] .. [${b.maxX}, ${b.maxY}]`;
  console.log("\n  Content bounds: getBBox (what the audit uses) vs root space\n");
  console.log(`  viewBox          [${r.viewBox.join(", ")}]`);
  console.log(`  drawn leaves     ${r.leaves}  (${r.transformedLeaves} sit inside a transform)`);
  console.log(`  raw getBBox      ${fmt(r.raw)}   used ${r.raw.used}`);
  console.log(`  true root space  ${fmt(r.root)}   used ${r.root.used}`);
  const w = (b) => b.maxX - b.minX, h = (b) => b.maxY - b.minY;
  console.log("");
  console.log(`  raw  extent      ${w(r.raw)} x ${h(r.raw)}`);
  console.log(`  true extent      ${w(r.root)} x ${h(r.root)}`);
  console.log(`  viewBox extent   ${r.viewBox[2]} x ${r.viewBox[3]}`);
  const fits = (b) => b.minX >= r.viewBox[0] - 0.5 && b.maxX <= r.viewBox[0] + r.viewBox[2] + 0.5 &&
    b.minY >= r.viewBox[1] - 0.5 && b.maxY <= r.viewBox[1] + r.viewBox[3] + 0.5;
  console.log("");
  console.log(`  S2 clipped?      raw says ${fits(r.raw) ? "fits" : "CLIPPED"};  truth says ${fits(r.root) ? "fits" : "CLIPPED"}`);
  const pct = (b) => [(w(b) / r.viewBox[2] * 100).toFixed(1), (h(b) / r.viewBox[3] * 100).toFixed(1)];
  console.log(`  S3 fills frame?  raw ${pct(r.raw).join("% x ")}%;  truth ${pct(r.root).join("% x ")}%`);
  ws.close();
} catch (err) {
  console.error(`Probe failed: ${err.message}`);
} finally {
  cleanup();
}
