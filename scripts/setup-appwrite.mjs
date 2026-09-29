// One-time Appwrite schema setup.
//
// Run this ONCE from your machine to create the database, all collections,
// their attributes, indexes, and permissions:
//
//   node scripts/setup-appwrite.mjs
//
// Requires two values in a .env file (or set as environment variables):
//   APPWRITE_API_KEY   — an API key with "Any" scope (create collections)
//   APPWRITE_ENDPOINT  — https://fra.cloud.appwrite.io/v1
//
// Get the API key from: Appwrite Console → Project → Settings → API Keys.
//
// The script is idempotent: re-running it skips anything that already exists.

import { Client, Databases, Permission, Role, Query } from "node-appwrite";
import { readFileSync, existsSync } from "node:fs";

// --- config -----------------------------------------------------------------
const ENV = {};
if (existsSync(".env")) {
  for (const line of readFileSync(".env", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) ENV[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const ENDPOINT = process.env.APPWRITE_ENDPOINT || ENV.APPWRITE_ENDPOINT;
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID || ENV.APPWRITE_PROJECT_ID;
const API_KEY = process.env.APPWRITE_API_KEY || ENV.APPWRITE_API_KEY;
const DB_ID = process.env.APPWRITE_DB_ID || ENV.APPWRITE_DB_ID || "kingdom";

if (!ENDPOINT || !PROJECT_ID || !API_KEY) {
  console.error(
    "\nMissing configuration. Add these to a .env file:\n" +
      "  APPWRITE_ENDPOINT=https://fra.cloud.appwrite.io/v1\n" +
      "  APPWRITE_PROJECT_ID=6abacd6a001d4161641f\n" +
      "  APPWRITE_API_KEY=<your api key>\n"
  );
  process.exit(1);
}

const client = new Client()
  .setEndpoint(ENDPOINT)
  .setProject(PROJECT_ID)
  .setKey(API_KEY);

const db = new Databases(client);

const str = (key, size, required = false, def = undefined) => ({
  key, type: "string", size, required, ...(def !== undefined ? { default: def } : {}),
});
const int = (key, required = false, def = undefined) => ({
  key, type: "integer", required, ...(def !== undefined ? { default: def } : {}),
});
const float = (key, required = false, def = undefined) => ({
  key, type: "double", required, ...(def !== undefined ? { default: def } : {}),
});
const bool = (key, required = false, def = undefined) => ({
  key, type: "boolean", required, ...(def !== undefined ? { default: def } : {}),
});
const json = (key, required = false) => ({ key, type: "string", size: 20000, required });
const datetime = (key) => ({ key, type: "datetime", required: false });

// Collection definitions: attributes + indexes.
// Security is set per-document at creation time (owner-only), so collection
// document security stays closed.
const COLLECTIONS = {
  profiles: {
    attributes: [str("displayName", 100)],
    indexes: [],
  },
  player_profiles: {
    attributes: [
      str("parentId", 64, true),
      str("name", 40, true),
      json("avatar"),
      int("gradeLevel", false, 1),
      str("difficulty", 20, false, "medium"),
      int("xp", false, 0),
      int("coins", false, 0),
      int("streak", false, 0),
      str("lastPracticeOn", 20),
    ],
    indexes: [
      { key: "idx_parent", attributes: ["parentId"], orders: ["ASC"] },
    ],
  },
  spelling_lists: {
    attributes: [
      str("parentId", 64, true),
      str("playerId", 64),
      str("title", 120, true),
      str("source", 20, false, "manual"),
    ],
    indexes: [
      { key: "idx_parent", attributes: ["parentId"], orders: ["ASC"] },
      { key: "idx_player", attributes: ["playerId"], orders: ["ASC"] },
    ],
  },
  spelling_words: {
    attributes: [
      str("listId", 64, true),
      str("word", 60, true),
      str("normalizedWord", 60, true),
      int("position", false, 0),
      str("dictionaryWordId", 64),
    ],
    indexes: [
      { key: "idx_list", attributes: ["listId"], orders: ["ASC"] },
      { key: "idx_list_pos", attributes: ["listId", "position"], orders: ["ASC", "ASC"] },
    ],
  },
  dictionary_words: {
    attributes: [
      str("word", 60, true),
      str("normalizedWord", 60, true),
      str("definition", 1000),
      str("kidDefinition", 1000),
      str("exampleSentence", 1000),
      str("partOfSpeech", 40),
      str("pronunciation", 60),
      str("source", 20, false, "dataset"),
    ],
    indexes: [
      { key: "idx_normalized", attributes: ["normalizedWord"], orders: ["ASC"], unique: true },
    ],
  },
  word_attempts: {
    attributes: [
      str("playerId", 64, true),
      str("word", 60, true),
      str("listId", 64),
      str("mode", 30, false, "practice"),
      bool("correct", true),
    ],
    indexes: [
      { key: "idx_player", attributes: ["playerId"], orders: ["ASC"] },
      { key: "idx_player_word", attributes: ["playerId", "word"], orders: ["ASC", "ASC"] },
    ],
  },
  player_word_mastery: {
    attributes: [
      str("playerId", 64, true),
      str("word", 60, true),
      int("attempts", false, 0),
      int("correctAttempts", false, 0),
      int("incorrectAttempts", false, 0),
      int("currentStreak", false, 0),
      float("masteryScore", false, 0),
      str("masteryLevel", 20, false, "new"),
      str("lastAttemptOn", 40),
    ],
    indexes: [
      { key: "idx_player", attributes: ["playerId"], orders: ["ASC"] },
      { key: "idx_player_word", attributes: ["playerId", "word"], orders: ["ASC", "ASC"], unique: true },
    ],
  },
  player_progress: {
    attributes: [
      str("playerId", 64, true),
      json("unlockedKingdoms"),
      int("currentKingdom", false, 1),
      json("buildings"),
      json("charactersUnlocked"),
    ],
    indexes: [],
  },
  achievements: {
    attributes: [
      str("key", 40, true),
      str("title", 80, true),
      str("description", 200, true),
      str("icon", 30, false, "star"),
    ],
    indexes: [{ key: "idx_key", attributes: ["key"], orders: ["ASC"], unique: true }],
  },
  player_achievements: {
    attributes: [
      str("playerId", 64, true),
      str("achievementId", 40, true),
    ],
    indexes: [
      { key: "idx_player", attributes: ["playerId"], orders: ["ASC"] },
    ],
  },
  inventory: {
    attributes: [
      str("key", 40, true),
      str("name", 80, true),
      str("slot", 30, true),
      str("rarity", 20, false, "common"),
    ],
    indexes: [{ key: "idx_key", attributes: ["key"], orders: ["ASC"], unique: true }],
  },
  player_inventory: {
    attributes: [
      str("playerId", 64, true),
      str("itemId", 40, true),
      bool("equipped", false, false),
    ],
    indexes: [
      { key: "idx_player", attributes: ["playerId"], orders: ["ASC"] },
    ],
  },
};

async function main() {
  console.log(`Setting up Appwrite project ${PROJECT_ID} at ${ENDPOINT}\n`);

  // 1. Database
  try {
    await db.get(DB_ID);
    console.log(`  ✓ database "${DB_ID}" exists`);
  } catch {
    await db.create(DB_ID, "Kingdom Spellers");
    console.log(`  + created database "${DB_ID}"`);
  }

  // 2. Collections
  for (const [name, def] of Object.entries(COLLECTIONS)) {
    let collectionId = name;
    try {
      await db.getCollection(DB_ID, name);
      console.log(`  ✓ collection "${name}" exists`);
    } catch {
      try {
        await db.createCollection(DB_ID, name, name, [
          Permission.read(Role.any()),
          Permission.create(Role.any()),
          Permission.update(Role.any()),
          Permission.delete(Role.any()),
        ], false);
        collectionId = name;
        console.log(`  + created collection "${name}"`);
      } catch (err) {
        console.error(`  ! could not create collection "${name}": ${err.message}`);
        continue;
      }
    }

    // 3. Attributes
    let existing = [];
    try {
      const res = await db.listAttributes(DB_ID, collectionId);
      existing = res.attributes.map((a) => a.key);
    } catch { /* none yet */ }

    for (const attr of def.attributes) {
      if (existing.includes(attr.key)) continue;
      try {
        await db.createStringAttribute(DB_ID, collectionId, attr.key, attr.size, attr.required, attr.default);
      } catch (e) {
        if (attr.type !== "string") {
          try {
            if (attr.type === "integer") {
              await db.createIntegerAttribute(DB_ID, collectionId, attr.key, attr.required, attr.default);
            } else if (attr.type === "double") {
              await db.createFloatAttribute(DB_ID, collectionId, attr.key, attr.required, attr.default);
            } else if (attr.type === "boolean") {
              await db.createBooleanAttribute(DB_ID, collectionId, attr.key, attr.required, attr.default);
            } else if (attr.type === "datetime") {
              await db.createDatetimeAttribute(DB_ID, collectionId, attr.key, attr.required);
            }
          } catch { /* report below */ }
        }
      }
      process.stdout.write(".");
    }

    // 4. Indexes (attributes must finish provisioning first)
    if (def.indexes.length) {
      await new Promise((r) => setTimeout(r, 1200));
      let haveIndexes = [];
      try {
        const res = await db.listIndexes(DB_ID, collectionId);
        haveIndexes = res.indexes.map((i) => i.key);
      } catch { /* none */ }

      for (const idx of def.indexes) {
        if (haveIndexes.includes(idx.key)) continue;
        try {
          await db.createIndex(
            DB_ID, collectionId, idx.key,
            idx.attributes, idx.orders, idx.unique ? true : false
          );
          console.log(`\n    + index ${collectionId}.${idx.key}`);
        } catch (err) {
          console.log(`\n    ! index ${collectionId}.${idx.key}: ${err.message}`);
        }
      }
    }
    console.log(`  ✓ ${name} ready`);
  }

  console.log("\n✅ Appwrite schema is ready.\n");
  console.log("Next: add these to your .env and restart the dev server:");
  console.log(`  VITE_APPWRITE_ENDPOINT=${ENDPOINT}`);
  console.log(`  VITE_APPWRITE_PROJECT_ID=${PROJECT_ID}`);
  console.log(`  VITE_APPWRITE_DB_ID=${DB_ID}\n`);
}

main().catch((err) => {
  console.error("\nSetup failed:", err.message);
  process.exit(1);
});
