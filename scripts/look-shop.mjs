// Rasterise the building showroom so the art can be looked at rather than
// described. Unlike scripts/look.mjs this needs no login and no dev-server
// middleware: it loads the built route in headless Edge and shoots the page.
//
// Usage: node scripts/look-shop.mjs [seed] [width] [height]

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const seed = process.argv[2] ?? "3";
const width = Number(process.argv[3] || 1600);
const height = Number(process.argv[4] || 1200);
const port = process.argv[5] || "3000";
const base = process.argv[6] || "kingdom-spellers";

const root = path.resolve(".snap");
fs.mkdirSync(root, { recursive: true });

const EDGE = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
].find((p) => fs.existsSync(p));
if (!EDGE) {
  console.error("No Chromium browser found.");
  process.exit(1);
}

const url = `http://localhost:${port}/${base}/#/showroom?seed=${encodeURIComponent(seed)}`;
const profile = fs.mkdtempSync(path.join(process.env.TEMP || ".", "ks-shop-"));

try {
  execFileSync(
    EDGE,
    [
      "--headless=new",
      "--disable-gpu",
      "--hide-scrollbars",
      "--no-first-run",
      `--user-data-dir=${profile}`,
      `--window-size=${width},${height}`,
      `--screenshot=${path.join(root, "shop.png")}`,
      `--virtual-time-budget=6000`,
      // Force the seed before first paint of the cards.
      `--run-all-compositor-stages-before-draw`,
      url,
    ],
    { stdio: "ignore", timeout: 90000 },
  );
  console.log(path.join(root, "shop.png"));
  console.log(`seed=${seed} ${width}x${height} ${url}`);
} finally {
  fs.rmSync(profile, { recursive: true, force: true });
}
