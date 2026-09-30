// Dev helper: load the kingdom page, capture the village SVG, and rasterise it
// to a PNG with headless Edge so the art can actually be looked at.
//
// Usage: node scripts/look.mjs [kingdomId] [width] [height]
//
// The capture is POSTed to a dev-only Vite middleware (see vite.config.js) so
// nothing about this is present in a production build.

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync, spawnSync } from "node:child_process";

const kingdomId = process.argv[2] || "";
const width = Number(process.argv[3] || 1500);
const height = Number(process.argv[4] || 1300);
// Optional zoom: `look.mjs "" 1200 800 2.2 300 500` renders the SVG at 2.2x with
// its top-left pinned so (300, 500) in scene units lands in the frame. Used to
// inspect a single building without cropping the raster.
const zoom = Number(process.argv[5] || 1);
const fx = Number(process.argv[6] || 0);
const fy = Number(process.argv[7] || 0);
const root = path.resolve(".snap");
fs.mkdirSync(root, { recursive: true });

const EDGE = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
].find((p) => fs.existsSync(p));

if (!EDGE) {
  console.error("No Chromium browser found.");
  process.exit(1);
}

const profile = fs.mkdtempSync(path.join(os.tmpdir(), "ks-look-"));

// Renders a local HTML file to PNG. `--dump-dom` is not needed; the screenshot
// flag waits for load, and the page has no scripts to race.
function rasterise(name, html) {
  const htmlPath = path.join(root, `${name}.html`);
  const png = path.join(root, `${name}.png`);
  fs.writeFileSync(htmlPath, html, "utf8");
  if (fs.existsSync(png)) fs.unlinkSync(png);
  execFileSync(
    EDGE,
    [
      "--headless=new",
      "--disable-gpu",
      "--hide-scrollbars",
      "--force-device-scale-factor=1",
      `--user-data-dir=${profile}`,
      `--window-size=${width},${height}`,
      `--screenshot=${png}`,
      `file:///${htmlPath.replace(/\\/g, "/")}`,
    ],
    { stdio: "ignore", timeout: 90000 }
  );
  if (!fs.existsSync(png)) throw new Error(`rasterise produced no file for ${name}`);
  return png;
}

const svgPath = path.join(root, "village.svg");
if (!fs.existsSync(svgPath)) {
  console.error(`No capture at ${svgPath}. Load the kingdom page first.`);
  process.exit(1);
}

const svg = fs.readFileSync(svgPath, "utf8");
const scale = zoom !== 1 ? `transform:scale(${zoom});transform-origin:0 0;` : "";
const shift = zoom !== 1 ? `margin-left:${-fx * zoom}px;margin-top:${-fy * zoom}px;` : "";
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  html,body{margin:0;padding:0;background:#0d120e;overflow:hidden;}
  .frame{${shift}width:${width}px;height:${height}px;overflow:hidden;}
  svg{display:block;width:${Math.round(width / zoom)}px;height:auto;${scale}}
</style></head><body><div class="frame">${svg}</div></body></html>`;

const png = rasterise("village", html);
fs.rmSync(profile, { recursive: true, force: true });
console.log(png);
if (kingdomId) console.log(`kingdom: ${kingdomId}`);
