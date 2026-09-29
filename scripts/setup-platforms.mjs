// Register the site's hostname(s) with Appwrite.
//
// Appwrite only allows browser requests from hostnames registered as project
// platforms — this is the CORS allowlist. Without it the live site loads but
// every Appwrite call fails with:
//   "Access to fetch ... has been blocked by CORS policy"
//
// Safe to re-run: it lists existing platforms first and skips any that are
// already registered.

import { readFileSync } from "node:fs";
import { Client, Project, ID } from "node-appwrite";

const ENV = {};
for (const line of readFileSync(".env", "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) ENV[m[1]] = m[2].trim();
}

const HOSTNAMES = (ENV.APPWRITE_HOSTNAMES || "jasonw79118.github.io,localhost")
  .split(",")
  .map((h) => h.trim())
  .filter(Boolean);

const project = new Project(
  new Client()
    .setEndpoint(ENV.APPWRITE_ENDPOINT)
    .setProject(ENV.APPWRITE_PROJECT_ID)
    .setKey(ENV.APPWRITE_API_KEY)
);

const scopeOf = (err) => {
  const m = err?.message?.match(/missing scopes \((.*?)\)/);
  return m ? "missing scope " + JSON.parse(m[1]).join(",") : err?.message;
};

let existing = [];
try {
  const res = await project.listPlatforms();
  existing = (res.platforms || []).map((p) => p.name || p.hostname).filter(Boolean);
  console.log("existing platforms:", existing.length ? existing.join(", ") : "(none)");
} catch (e) {
  console.error("Could not list platforms -> " + scopeOf(e));
  process.exit(1);
}

for (const hostname of HOSTNAMES) {
  if (existing.includes(hostname)) {
    console.log(`  = ${hostname} (already registered)`);
    continue;
  }
  try {
    // Signature: createWebPlatform(platformId, name, hostname)
    await project.createWebPlatform(ID.unique(), "Web App", hostname);
    console.log(`  + ${hostname} registered`);
  } catch (e) {
    console.error(`  ! ${hostname} -> ${scopeOf(e)}`);
  }
}

console.log("\nDone. The live site can now reach Appwrite from: " + HOSTNAMES.join(", "));
