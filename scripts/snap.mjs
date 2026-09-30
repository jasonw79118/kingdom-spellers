// Dev helper: wrap the captured village SVG in a page and rasterise it to PNG
// with headless Edge, so the scene can actually be looked at during art work.
//
// Usage: node scripts/snap.mjs [name] [width] [height]

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";

const name = process.argv[2] || "village";
const width = Number(process.argv[3] || 1400);
const height = Number(process.argv[4] || 1200);

const root = path.resolve(".snap");
const svgPath = path.join(root, `${name}.svg`);
if (!fs.existsSync(svgPath)) {
  console.error(`No capture at ${svgPath}. Load the kingdom page first.`);
  process.exit(1);
}

const svg = fs.readFileSync(svgPath, "utf8");
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  html,body{margin:0;padding:0;background:#0f1410;}
  svg{display:block;width:${width}px;height:auto;}
</style></head><body>${svg}</body></html>`;

const htmlPath = path.join(root, `${name}.html`);
fs.writeFileSync(htmlPath, html, "utf8");

const edge =
  [
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  ].find((p) => fs.existsSync(p)) || null;

if (!edge) {
  console.error("No Chromium browser found for rasterising.");
  process.exit(1);
}

const profile = fs.mkdtempSync(path.join(os.tmpdir(), "ks-snap-"));
const png = path.join(root, `${name}.png`);

execFileSync(
  edge,
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

fs.rmSync(profile, { recursive: true, force: true });

if (!fs.existsSync(png)) {
  console.error("Rasterise produced no file.");
  process.exit(1);
}
console.log(png);
