// Rasterise the building showroom so the art can be looked at rather than
// described. Unlike scripts/look.mjs this needs no login and no dev-server
// middleware: it loads the built route in headless Edge and shoots the page.
//
// Usage: node scripts/look-shop.mjs [seed] [width] [height] [outName] [only]
//
// Writes .snap/<outName>.png, defaulting to shop-seed<seed>.png, and records
// the exact URL and size next to it so a capture can always be traced back to
// the variant that produced it. Judging architecture needs pixels large enough
// to see the framing, so the default is deliberately generous.
//
// `only` is a SHOWROOM id (e.g. castle) and shows just that one card filling the
// window. That is the only way to see masonry courses, merlons and tile seams
// clearly enough to judge them; in the six-up sheet each card is a few hundred
// pixels wide and the detail is gone.

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const seed = process.argv[2] ?? "3";
const width = Number(process.argv[3] || 2400);
const height = Number(process.argv[4] || 1500);
const outName = process.argv[5] || `shop-seed${seed}`;
const only = process.argv[6] || "all";
const port = process.argv[7] || "3000";
const base = process.argv[8] || "kingdom-spellers";

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

const url = `http://127.0.0.1:${port}/${base}/#/showroom?seed=${encodeURIComponent(seed)}&only=${encodeURIComponent(only)}`;
const outFile = path.join(root, `${outName}.png`);
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
      `--screenshot=${outFile}`,
      // Long enough for a cold Vite dev server to transform the art system and
      // for the cards' useLayoutEffect to measure and set their viewBoxes.
      `--virtual-time-budget=20000`,
      "--run-all-compositor-stages-before-draw",
      url,
    ],
    { stdio: "ignore", timeout: 120000 },
  );
  const kb = Math.round(fs.statSync(outFile).size / 1024);
  console.log(outFile);
  console.log(`  seed=${seed}  only=${only}  ${width}x${height}  ${kb} kB  ${url}`);
} finally {
  fs.rmSync(profile, { recursive: true, force: true });
}
