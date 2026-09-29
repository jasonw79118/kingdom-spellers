// Deploy the production build to GitHub Pages (the `gh-pages` branch).
//
//   npm run build && npm run deploy
//
// The site is published from the root of the gh-pages branch, which GitHub
// serves at https://<user>.github.io/<repo>/.
//
// Vite's `base` is set to /kingdom-spellers/ in vite.config.js so asset URLs
// resolve under that subpath, and the app uses HashRouter so deep links work
// without any server-side SPA fallback.
//
// The existing branch history is preserved: this checks gh-pages out into a
// temporary worktree, replaces its contents, and commits on top.

import { execFileSync } from "node:child_process";
import { existsSync, rmSync, cpSync, writeFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const BUILD = resolve("build");
const BRANCH = "gh-pages";
const TMP = resolve(".deploy-worktree");

function git(...args) {
  return execFileSync("git", args, { stdio: ["ignore", "pipe", "pipe"], encoding: "utf8" });
}
function gitIn(dir, ...args) {
  return execFileSync("git", args, { cwd: dir, stdio: ["ignore", "pipe", "pipe"], encoding: "utf8" });
}

function fail(msg, err) {
  console.error(`\n❌ ${msg}`);
  if (err) console.error(String(err.stderr || err.message).split("\n").slice(0, 6).join("\n"));
  process.exit(1);
}

if (!existsSync(join(BUILD, "index.html"))) {
  fail("No build found. Run `npm run build` first.");
}

// 1. Prepare a clean worktree on the gh-pages branch.
if (existsSync(TMP)) {
  try { git("worktree", "remove", "--force", TMP); } catch { rmSync(TMP, { recursive: true, force: true }); }
}
try {
  git("fetch", "origin", BRANCH);
  git("worktree", "add", TMP, "origin/" + BRANCH);
} catch (e) {
  fail("Could not check out the gh-pages branch.", e);
}

// 2. Wipe the old site, keeping .git.
try {
  for (const entry of readdirSync(TMP)) {
    if (entry === ".git") continue;
    rmSync(join(TMP, entry), { recursive: true, force: true });
  }
} catch (e) {
  fail("Could not clear the gh-pages worktree.", e);
}

// 3. Copy the fresh build in.
try {
  cpSync(BUILD, TMP, { recursive: true });
  // Stop GitHub Pages from running Jekyll over the output.
  writeFileSync(join(TMP, ".nojekyll"), "");
} catch (e) {
  fail("Could not copy the build into the worktree.", e);
}

// 4. Commit and push.
try {
  gitIn(TMP, "add", "-A");
  const status = gitIn(TMP, "status", "--porcelain");
  if (!status.trim()) {
    console.log("gh-pages is already up to date — nothing to deploy.");
  } else {
    gitIn(TMP, "commit", "-m", "Deploy " + new Date().toISOString().slice(0, 16).replace("T", " ") + " (Kingdom Spellers 2.0)");
    gitIn(TMP, "push", "origin", "HEAD:" + BRANCH);
    console.log("✅ Deployed to the " + BRANCH + " branch.");
  }
} catch (e) {
  fail("Commit or push failed.", e);
} finally {
  try { git("worktree", "remove", "--force", TMP); } catch { /* best effort */ }
  if (existsSync(TMP)) rmSync(TMP, { recursive: true, force: true });
}

console.log("\nThe site will update at:");
console.log("  https://jasonw79118.github.io/kingdom-spellers/\n");
