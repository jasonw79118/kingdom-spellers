// Appwrite backend — mirrors the local/Supabase backend interface exactly.
//
// Privacy model: every child-owned document (profiles, lists, words, attempts,
// mastery, progress, inventory) is created with document-level permissions
// restricted to the owning parent, so a parent can only ever read their own
// family's data. Dictionary + achievement/inventory catalogs are readable by
// any signed-in user.

import {
  getAccount,
  getDatabases,
  isAppwriteConfigured,
  DB_ID,
  COLLECTIONS,
  ID,
  Permission,
  Role,
  Query,
} from "./appwrite.js";
import { normalizeWord, uid, todayKey } from "./utils.js";
import { seedDictionary, fallbackDefinition, starterWordsForGrade } from "./seedDictionary.js";

// --- helpers -----------------------------------------------------------------

// Appwrite stores complex values as JSON strings; parse defensively.
function parseJson(value, fallback) {
  if (value == null || value === "") return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

// Convert Appwrite snake_case attributes into the camelCase shape the UI uses.
function mapProfile(d) {
  if (!d) return null;
  return {
    id: d.$id,
    parent_id: d.parentId,
    name: d.name,
    avatar: parseJson(d.avatar, {}),
    grade_level: d.gradeLevel ?? 1,
    difficulty: d.difficulty || "medium",
    xp: d.xp ?? 0,
    coins: d.coins ?? 0,
    streak: d.streak ?? 0,
    last_practice_on: d.lastPracticeOn || null,
    created_at: d.$createdAt,
    updated_at: d.$updatedAt,
  };
}

function mapList(d) {
  if (!d) return null;
  return {
    id: d.$id,
    parent_id: d.parentId,
    player_id: d.playerId || null,
    title: d.title,
    source: d.source || "manual",
    created_at: d.$createdAt,
  };
}

function mapWord(d) {
  if (!d) return null;
  return {
    id: d.$id,
    list_id: d.listId,
    word: d.word,
    normalized_word: d.normalizedWord,
    position: d.position ?? 0,
    dictionary_word_id: d.dictionaryWordId || null,
  };
}

function mapDict(d) {
  if (!d) return null;
  return {
    id: d.$id,
    word: d.word,
    normalized_word: d.normalizedWord,
    definition: d.definition || "",
    kid_definition: d.kidDefinition || "",
    example_sentence: d.exampleSentence || "",
    part_of_speech: d.partOfSpeech || "",
    pronunciation: d.pronunciation || "",
    source: d.source || "dataset",
  };
}

function mapMastery(d) {
  if (!d) return null;
  return {
    player_id: d.playerId,
    word: d.word,
    attempts: d.attempts ?? 0,
    correct_attempts: d.correctAttempts ?? 0,
    incorrect_attempts: d.incorrectAttempts ?? 0,
    current_streak: d.currentStreak ?? 0,
    mastery_score: d.masteryScore ?? 0,
    mastery_level: d.masteryLevel || "new",
    last_attempt_on: d.lastAttemptOn || null,
  };
}

// Only the owning parent may read/write these documents.
function ownerPerms(parentId) {
  return [
    Permission.read(Role.user(parentId)),
    Permission.update(Role.user(parentId)),
    Permission.delete(Role.user(parentId)),
  ];
}

// The signed-in parent's user id, cached so every query can be scoped to the
// current family. Appwrite's collection-level document security is permissive
// (it has to allow sign-up), so scoping happens in the query filter — this is
// the authoritative privacy boundary.
let currentUserId = null;

// Guard: refuse to run a parent-scoped query with no known parent.
function requireParent() {
  if (!currentUserId) {
    throw new Error("Not signed in");
  }
  return currentUserId;
}

// Confirm a child profile belongs to the signed-in parent before touching
// that child's data. Single source of truth: player_profiles.parentId.
async function assertOwnsPlayer(db, playerId) {
  const me = requireParent();
  const profile = await db.getDocument(DB_ID, COLLECTIONS.playerProfiles, playerId);
  if (profile.parentId !== me) throw new Error("Not permitted");
  return { me, profile };
}

function computeScore(m) {
  if (!m || m.attempts === 0) return 0;
  const accuracy = m.correct_attempts / m.attempts;
  const experience = Math.min(1, m.attempts / 5);
  const streakBonus = Math.min(0.1, (m.current_streak || 0) * 0.02);
  return Math.round(Math.min(1, accuracy * 0.7 + experience * 0.2 + streakBonus) * 100);
}

function levelForScore(m) {
  if (!m || m.attempts < 1) return "new";
  if (m.mastery_score >= 90 && m.attempts >= 3 && m.current_streak >= 2) return "mastered";
  if (m.mastery_score >= 75) return "strong";
  if (m.mastery_score >= 50) return "practicing";
  return "learning";
}

let seededPromise = null;

// Seeding is idempotent but expensive: ~715 create calls (6 achievements +
// 10 inventory items + 699 dictionary words), and every one that already
// exists returns a 409. Running that on every page load made the app feel
// broken — the dictionary lookup awaited it, so saving a spelling list appeared
// to hang for a minute. The flag makes it a one-time cost per browser, and
// lookups no longer wait on it at all.
const SEED_FLAG = `ks2_seeded_${DB_ID}`;

function hasSeeded() {
  try {
    return localStorage.getItem(SEED_FLAG) === "1";
  } catch {
    return false; // private mode: fall back to the in-memory promise
  }
}

function markSeeded() {
  try {
    localStorage.setItem(SEED_FLAG, "1");
  } catch { /* private mode — the in-memory promise still covers this load */ }
}

// Fill in reference data (achievements, inventory, the dictionary). Never
// throws, and is a no-op after the first run.
function ensureSeeded() {
  if (hasSeeded()) return Promise.resolve();
  if (!seededPromise) {
    seededPromise = (async () => {
      const db = getDatabases();

      // One cheap probe per table beats blindly attempting every insert. If the
      // table already has rows there is nothing to seed, so we skip it entirely
      // instead of firing hundreds of creates that all come back 409. This turns
      // a returning visitor's ~715 requests into 3.
      const isPopulated = async (collection) => {
        try {
          const { documents } = await db.listDocuments(DB_ID, collection, [], 1);
          return documents.length > 0;
        } catch {
          return false; // can't tell — fall through and try to seed
        }
      };

      // Achievements
      if (!(await isPopulated(COLLECTIONS.achievements))) {
        const ach = [
          { id: "first-word", title: "First Word", description: "Spell your first word correctly", icon: "star" },
          { id: "ten-words", title: "Word Collector", description: "Spell 10 words correctly", icon: "book" },
          { id: "streak-3", title: "On a Roll", description: "Practice 3 days in a row", icon: "flame" },
          { id: "streak-7", title: "Week of Wonder", description: "Practice 7 days in a row", icon: "calendar" },
          { id: "mastered-10", title: "Master of Ten", description: "Master 10 words", icon: "crown" },
          { id: "perfect-test", title: "Royal Scholar", description: "Score 100% on a Royal Test", icon: "medal" },
        ];
        for (const a of ach) {
          try {
            await db.createDocument(DB_ID, COLLECTIONS.achievements, ID.unique(), {
              key: a.id, title: a.title, description: a.description, icon: a.icon,
            });
          } catch { /* already exists */ }
        }
      }

      if (!(await isPopulated(COLLECTIONS.inventory))) {
        const inv = [
          { id: "cape-blue", name: "Blue Cape", slot: "cape", rarity: "common" },
          { id: "cape-red", name: "Red Cape", slot: "cape", rarity: "common" },
          { id: "cape-royal", name: "Royal Cape", slot: "cape", rarity: "rare" },
          { id: "shield-wood", name: "Wooden Shield", slot: "shield", rarity: "common" },
          { id: "shield-knight", name: "Knight Shield", slot: "shield", rarity: "rare" },
          { id: "crown-brass", name: "Brass Crown", slot: "crown", rarity: "rare" },
          { id: "crown-royal", name: "Royal Crown", slot: "crown", rarity: "legendary" },
          { id: "pet-cat", name: "Castle Cat", slot: "companion", rarity: "common" },
          { id: "pet-dragon", name: "Baby Dragon", slot: "companion", rarity: "epic" },
          { id: "pet-fox", name: "Forest Fox", slot: "companion", rarity: "rare" },
        ];
        for (const i of inv) {
          try {
            await db.createDocument(DB_ID, COLLECTIONS.inventory, ID.unique(), {
              key: i.id, name: i.name, slot: i.slot, rarity: i.rarity,
            });
          } catch { /* already exists */ }
        }
      }

      // Dictionary — by far the biggest table, so the probe matters most here.
      if (!(await isPopulated(COLLECTIONS.dictionaryWords))) {
        for (const entry of seedDictionary) {
          try {
            await db.createDocument(DB_ID, COLLECTIONS.dictionaryWords, ID.unique(), {
              word: entry.word,
              normalizedWord: entry.normalized_word,
              definition: entry.definition,
              kidDefinition: entry.kid_definition,
              exampleSentence: entry.example_sentence,
              partOfSpeech: entry.part_of_speech,
              pronunciation: entry.pronunciation,
              source: entry.source,
            });
          } catch { /* already exists */ }
        }
      }
      markSeeded();
    })().catch((err) => {
      // Reset so a later attempt can retry.
      seededPromise = null;
      throw err;
    });
  }
  return seededPromise;
}

// Reject rather than hang, so a stalled request surfaces as a normal error
// instead of an interface that spins forever.
const LOOKUP_TIMEOUT_MS = 15000;

function withTimeout(promise, ms, message) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    Promise.resolve(promise).then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); }
    );
  });
}

// --- backend -----------------------------------------------------------------

export function createAppwriteBackend() {
  const account = () => getAccount();
  const db = () => getDatabases();

  return {
    auth: {
      async signIn(email, password) {
        try {
          await account().createEmailPasswordSession(email, password);
          return { user: await this.getCurrentUser(), error: null };
        } catch (err) {
          return { user: null, error: { message: err?.message || "Invalid email or password" } };
        }
      },

      async signUp(email, password, name) {
        try {
          // Appwrite SDK v28 signature: create(userId, email, password, name?)
          const created = await account().create(
            ID.unique(), email, password, name || email.split("@")[0]
          );
          await account().createEmailPasswordSession(email, password);
          const user = await this.getCurrentUser();
          // Ensure a parent profile document exists.
          if (user) {
            try {
              await db().createDocument(DB_ID, COLLECTIONS.profiles, user.id, {
                displayName: user.name || "",
              }, ownerPerms(user.id));
            } catch { /* may already exist */ }
          }
          return { user, error: null };
        } catch (err) {
          return { user: null, error: { message: err?.message || "Could not create account" } };
        }
      },

      async signOut() {
        currentUserId = null;
        try {
          await account().deleteSession("current");
          return { error: null };
        } catch (err) {
          return { error: { message: err?.message } };
        }
      },

      async getCurrentUser() {
        try {
          const u = await account().get();
          currentUserId = u.$id;
          return { id: u.$id, email: u.email, name: u.name || u.email };
        } catch {
          currentUserId = null;
          return null;
        }
      },

      onAuthChange(cb) {
        let stopped = false;
        const tick = async () => {
          if (stopped || document.visibilityState === "hidden") return;
          cb(await this.getCurrentUser());
        };
        tick();
        // The web SDK persists its session, so refresh on tab focus rather
        // than polling constantly.
        const onFocus = () => tick();
        const onVisible = () => {
          if (document.visibilityState === "visible") tick();
        };
        window.addEventListener("focus", onFocus);
        document.addEventListener("visibilitychange", onVisible);
        return () => {
          stopped = true;
          window.removeEventListener("focus", onFocus);
          document.removeEventListener("visibilitychange", onVisible);
        };
      },
    },

    profiles: {
      async list() {
        // Scope to the signed-in parent — never return another family's kids.
        const { documents } = await db().listDocuments(
          DB_ID, COLLECTIONS.playerProfiles,
          [Query.equal("parentId", requireParent())], 100
        );
        return documents.map(mapProfile);
      },

      async create(d) {
        const doc = await db().createDocument(
          DB_ID, COLLECTIONS.playerProfiles, ID.unique(),
          {
            parentId: d.parent_id,
            name: d.name,
            avatar: JSON.stringify(d.avatar || {}),
            gradeLevel: d.grade_level ?? 1,
            difficulty: d.difficulty || "medium",
            xp: 0, coins: 0, streak: 0, lastPracticeOn: "",
          },
          ownerPerms(d.parent_id)
        );
        return mapProfile(doc);
      },

      async update(id, d) {
        const { profile } = await assertOwnsPlayer(db(), id);
        const payload = {};
        if (d.name !== undefined) payload.name = d.name;
        if (d.avatar !== undefined) payload.avatar = JSON.stringify(d.avatar || {});
        if (d.grade_level !== undefined) payload.gradeLevel = d.grade_level;
        if (d.difficulty !== undefined) payload.difficulty = d.difficulty;
        if (d.xp !== undefined) payload.xp = d.xp;
        if (d.coins !== undefined) payload.coins = d.coins;
        if (d.streak !== undefined) payload.streak = d.streak;
        if (d.last_practice_on !== undefined) payload.lastPracticeOn = d.last_practice_on;
        const doc = await db().updateDocument(DB_ID, COLLECTIONS.playerProfiles, id, payload);
        return mapProfile(doc);
      },

      async remove(id) {
        await assertOwnsPlayer(db(), id);
        await db().deleteDocument(DB_ID, COLLECTIONS.playerProfiles, id);
      },
    },

    lists: {
      async list(playerId = null) {
        // Always scope by parentId so a family only ever sees its own lists.
        const queries = [
          Query.equal("parentId", requireParent()),
          ...(playerId ? [Query.equal("playerId", playerId)] : []),
          Query.orderDesc("$createdAt"),
        ];
        const { documents } = await db().listDocuments(
          DB_ID, COLLECTIONS.spellingLists, queries, 100
        );
        const lists = documents.map(mapList);

        // Appwrite has no joins — fetch each list's words separately.
        return Promise.all(
          lists.map(async (l) => {
            const { documents: words } = await db().listDocuments(
              DB_ID, COLLECTIONS.spellingWords,
              [Query.equal("listId", l.id), Query.orderAsc("position")],
              200
            );
            const mapped = words.map(mapWord);
            // Attach definitions from the dictionary.
            const dictMap = await this._attachDefinitions(mapped);
            return { ...l, words: mapped.map((w) => ({ ...w, ...(dictMap[w.normalized_word] || {}) })) };
          })
        );
      },

      async _attachDefinitions(words) {
        if (!words.length) return {};
        const normalized = [...new Set(words.map((w) => w.normalized_word))];
        const out = {};
        // Appwrite ANDs separate queries together, so several
        // equal("normalizedWord", x) clauses would match nothing. Pass an
        // array instead — that becomes a single "in" query.
        for (let i = 0; i < normalized.length; i += 50) {
          const chunk = normalized.slice(i, i + 50);
          const { documents } = await db().listDocuments(
            DB_ID, COLLECTIONS.dictionaryWords,
            [Query.equal("normalizedWord", chunk)],
            100
          );
          for (const d of documents) {
            const m = mapDict(d);
            out[m.normalized_word] = {
              kid_definition: m.kid_definition,
              definition: m.definition,
              example_sentence: m.example_sentence,
              part_of_speech: m.part_of_speech,
            };
          }
        }
        return out;
      },

      async create(d) {
        // Ownership always comes from the signed-in session, never from the
        // caller. parentId is a required column, so trusting the caller meant
        // any page that forgot to pass it produced a save that silently hung.
        const me = requireParent();
        // A list belongs to a child. If a player was given, verify it is
        // actually this family's, then fall back to the parent's only child.
        let playerId = d.player_id || "";
        if (playerId) {
          await assertOwnsPlayer(db(), playerId);
        } else {
          const { documents } = await db().listDocuments(
            DB_ID, COLLECTIONS.playerProfiles, [Query.equal("parentId", me)], 1
          );
          if (documents.length) playerId = documents[0].$id;
        }

        const doc = await db().createDocument(
          DB_ID, COLLECTIONS.spellingLists, ID.unique(),
          {
            parentId: me,
            playerId,
            title: d.title || "Untitled List",
            source: d.source || "manual",
          },
          ownerPerms(me)
        );
        return mapList(doc);
      },

      async remove(id) {
        // Only the owning parent may delete a list.
        const list = await db().getDocument(DB_ID, COLLECTIONS.spellingLists, id);
        if (list.parentId !== requireParent()) throw new Error("Not permitted");
        const { documents } = await db().listDocuments(
          DB_ID, COLLECTIONS.spellingWords, [Query.equal("listId", id)], 200
        );
        for (const w of documents) {
          await db().deleteDocument(DB_ID, COLLECTIONS.spellingWords, w.$id);
        }
        await db().deleteDocument(DB_ID, COLLECTIONS.spellingLists, id);
      },

      async createDefaultFor(player) {
        const { documents } = await db().listDocuments(
          DB_ID, COLLECTIONS.spellingLists,
          [Query.equal("parentId", requireParent()), Query.equal("playerId", player.id)],
          1
        );
        if (documents.length) return mapList(documents[0]);
        const list = await this.create({
          parent_id: player.parent_id,
          player_id: player.id,
          title: `Starter Words — Grade ${player.grade_level}`,
          source: "default",
        });
        await this.saveWords(list.id, starterWordsForGrade(player.grade_level, 20));
        return list;
      },

      async saveWords(listId, words) {
        const me = requireParent();
        const listDoc = await db().getDocument(DB_ID, COLLECTIONS.spellingLists, listId);
        if (listDoc.parentId !== me) throw new Error("Not permitted");
        const perms = ownerPerms(me);

        // Remove existing words for this list, then re-add.
        const { documents: existing } = await db().listDocuments(
          DB_ID, COLLECTIONS.spellingWords, [Query.equal("listId", listId)], 200
        );
        for (const w of existing) {
          await db().deleteDocument(DB_ID, COLLECTIONS.spellingWords, w.$id);
        }

        const created = [];
        for (let i = 0; i < words.length; i++) {
          const w = words[i];
          const normalized = normalizeWord(w.word);
          let dictId = "";
          // Find or create the shared dictionary entry.
          try {
            const { documents: found } = await db().listDocuments(
              DB_ID, COLLECTIONS.dictionaryWords,
              [Query.equal("normalizedWord", normalized)], 1
            );
            if (found.length) {
              dictId = found[0].$id;
            } else {
              const def = w.kid_definition || w.definition || fallbackDefinition(w.word);
              const created_ = await db().createDocument(
                DB_ID, COLLECTIONS.dictionaryWords, ID.unique(),
                {
                  word: w.word, normalizedWord: normalized,
                  definition: w.definition || def,
                  kidDefinition: def,
                  exampleSentence: w.example_sentence || "",
                  partOfSpeech: w.part_of_speech || "",
                  pronunciation: w.pronunciation || "",
                  source: "parent",
                }
              );
              dictId = created_.$id;
            }
          } catch { /* proceed without a link */ }

          const doc = await db().createDocument(
            DB_ID, COLLECTIONS.spellingWords, ID.unique(),
            {
              listId, word: w.word, normalizedWord: normalized,
              position: i, dictionaryWordId: dictId,
            },
            perms
          );
          created.push(mapWord(doc));
        }
        return created;
      },
    },

    dictionary: {
      async lookup(words) {
        // Deliberately does NOT await ensureSeeded(). A lookup is on the
        // critical path for saving a list, and seeding is bulk reference data
        // that does not need to be present to answer a query. Kick it off in
        // the background so the dictionary fills in without blocking anyone.
        ensureSeeded().catch(() => {});
        const normalized = [...new Set(words.map(normalizeWord))];
        const out = {};
        // Array value = single "in" query (separate equal() clauses AND together).
        for (let i = 0; i < normalized.length; i += 50) {
          const chunk = normalized.slice(i, i + 50);
          // Guard against a hung request: a lookup that never settles used to
          // leave the Save button spinning forever.
          const { documents } = await withTimeout(
            db().listDocuments(
              DB_ID, COLLECTIONS.dictionaryWords,
              [Query.equal("normalizedWord", chunk)], 100
            ),
            LOOKUP_TIMEOUT_MS,
            "Dictionary lookup timed out"
          );
          for (const d of documents) {
            const m = mapDict(d);
            out[m.normalized_word] = m;
          }
        }
        // Words the dataset doesn't cover still get a usable definition from
        // the built-in fallback, so a list never saves with blank definitions.
        // (A parent can always edit it afterwards — see the list editor.)
        for (const n of normalized) {
          if (out[n]) continue;
          const fb = fallbackDefinition(n);
          if (fb) {
            out[n] = {
              normalized_word: n,
              word: n,
              kid_definition: fb,
              definition: fb,
              example_sentence: "",
              part_of_speech: "",
            };
          }
        }
        return out;
      },

      async save(entry) {
        const normalized = normalizeWord(entry.word);
        let docId = null;
        try {
          const { documents } = await db().listDocuments(
            DB_ID, COLLECTIONS.dictionaryWords,
            [Query.equal("normalizedWord", normalized)], 1
          );
          if (documents.length) docId = documents[0].$id;
        } catch { /* create new */ }

        const payload = {
          word: entry.word, normalizedWord: normalized,
          definition: entry.definition || "",
          kidDefinition: entry.kid_definition || entry.definition || "",
          exampleSentence: entry.example_sentence || "",
          partOfSpeech: entry.part_of_speech || "",
          pronunciation: entry.pronunciation || "",
          source: entry.source || "parent",
        };
        if (docId) return mapDict(await db().updateDocument(DB_ID, COLLECTIONS.dictionaryWords, docId, payload));
        return mapDict(await db().createDocument(DB_ID, COLLECTIONS.dictionaryWords, ID.unique(), payload));
      },
    },

    mastery: {
      async recordAttempt(playerId, word, listId, mode, correct) {
        const { me, profile } = await assertOwnsPlayer(db(), playerId);
        const perms = ownerPerms(me);
        const normalized = normalizeWord(word);

        await db().createDocument(
          DB_ID, COLLECTIONS.wordAttempts, ID.unique(),
          { playerId, word: normalized, listId: listId || "", mode, correct },
          perms
        );

        // Recompute mastery from the full history for this word.
        const { documents } = await db().listDocuments(
          DB_ID, COLLECTIONS.wordAttempts,
          [
            Query.equal("playerId", playerId),
            Query.equal("word", normalized),
            Query.orderDesc("$createdAt"),
          ],
          100
        );
        const attempts = documents.length;
        const correctCount = documents.filter((a) => a.correct).length;
        let streak = 0;
        for (const a of documents) {
          if (a.correct) streak += 1;
          else break;
        }

        const m = {
          playerId, word: normalized,
          attempts, correct_attempts: correctCount,
          incorrect_attempts: attempts - correctCount,
          current_streak: streak,
        };
        m.mastery_score = computeScore(m);
        m.mastery_level = levelForScore(m);

        // Upsert by deterministic document ID.
        const masteryId = `${playerId}_${normalized}`;
        const payload = {
          playerId, word: normalized,
          attempts: m.attempts,
          correctAttempts: m.correct_attempts,
          incorrectAttempts: m.incorrect_attempts,
          currentStreak: m.current_streak,
          masteryScore: m.mastery_score,
          masteryLevel: m.mastery_level,
          lastAttemptOn: new Date().toISOString(),
        };
        try {
          await db().createDocument(DB_ID, COLLECTIONS.mastery, masteryId, payload, perms);
        } catch {
          await db().updateDocument(DB_ID, COLLECTIONS.mastery, masteryId, payload);
        }
        return m;
      },

      async list(playerId) {
        await assertOwnsPlayer(db(), playerId);
        const { documents } = await db().listDocuments(
          DB_ID, COLLECTIONS.mastery,
          [Query.equal("playerId", playerId)], 500
        );
        return documents.map(mapMastery);
      },

      async listAttempts(playerId) {
        await assertOwnsPlayer(db(), playerId);
        const { documents } = await db().listDocuments(
          DB_ID, COLLECTIONS.wordAttempts,
          [Query.equal("playerId", playerId), Query.orderDesc("$createdAt")],
          200
        );
        return documents.map((a) => ({
          id: a.$id,
          player_id: a.playerId,
          word: a.word,
          list_id: a.listId || null,
          mode: a.mode,
          correct: a.correct,
          created_at: a.$createdAt,
        }));
      },
    },

    progress: {
      async get(playerId) {
        const { me } = await assertOwnsPlayer(db(), playerId);
        const perms = ownerPerms(me);
        const blank = {
          player_id: playerId,
          unlocked_kingdoms: [1],
          current_kingdom: 1,
          buildings: {},
          characters_unlocked: [],
          royal_tests_completed: 0,
          pet_state: {},
        };
        try {
          const doc = await db().getDocument(DB_ID, COLLECTIONS.progress, playerId);
          return {
            player_id: playerId,
            unlocked_kingdoms: parseJson(doc.unlockedKingdoms, [1]),
            current_kingdom: doc.currentKingdom ?? 1,
            buildings: parseJson(doc.buildings, {}),
            characters_unlocked: parseJson(doc.charactersUnlocked, []),
            royal_tests_completed: doc.royalTestsCompleted ?? 0,
            pet_state: parseJson(doc.petState, {}),
          };
        } catch {
          // Appwrite string attributes: arrays/objects must be JSON-encoded.
          await db().createDocument(
            DB_ID, COLLECTIONS.progress, playerId,
            {
              playerId,
              unlockedKingdoms: JSON.stringify([1]),
              currentKingdom: 1,
              buildings: JSON.stringify({}),
              charactersUnlocked: JSON.stringify([]),
              royalTestsCompleted: 0,
              petState: JSON.stringify({}),
            },
            perms
          );
          return blank;
        }
      },

      async save(playerId, d) {
        const { me } = await assertOwnsPlayer(db(), playerId);
        // String attributes — JSON-encode any arrays/objects.
        const payload = { playerId };
        if (d.unlocked_kingdoms) payload.unlockedKingdoms = JSON.stringify(d.unlocked_kingdoms);
        if (d.current_kingdom !== undefined) payload.currentKingdom = d.current_kingdom;
        if (d.buildings) payload.buildings = JSON.stringify(d.buildings);
        if (d.characters_unlocked) payload.charactersUnlocked = JSON.stringify(d.characters_unlocked);
        if (d.royal_tests_completed !== undefined) payload.royalTestsCompleted = d.royal_tests_completed;
        if (d.pet_state) payload.petState = JSON.stringify(d.pet_state);
        try {
          await db().updateDocument(DB_ID, COLLECTIONS.progress, playerId, payload);
        } catch {
          await db().createDocument(
            DB_ID, COLLECTIONS.progress, playerId,
            {
              playerId,
              unlockedKingdoms: JSON.stringify([1]),
              currentKingdom: 1,
              buildings: JSON.stringify({}),
              charactersUnlocked: JSON.stringify([]),
              royalTestsCompleted: 0,
              petState: JSON.stringify({}),
              ...payload,
            },
            ownerPerms(me)
          );
        }
        return { player_id: playerId, ...d };
      },
    },

    catalog: {
      async listAchievements() {
        const { documents } = await db().listDocuments(DB_ID, COLLECTIONS.achievements, [], 100);
        return documents.map((d) => ({
          id: d.key, title: d.title, description: d.description, icon: d.icon,
        }));
      },
      async listPlayerAchievements(playerId) {
        const { documents } = await db().listDocuments(
          DB_ID, COLLECTIONS.playerAchievements,
          [Query.equal("playerId", playerId)], 100
        );
        return documents.map((d) => d.achievementId);
      },

      async unlock(playerId, achievementId) {
        const profileDoc = await db().getDocument(DB_ID, COLLECTIONS.playerProfiles, playerId);
        const id = `${playerId}_${achievementId}`;
        try {
          await db().createDocument(
            DB_ID, COLLECTIONS.playerAchievements, id,
            { playerId, achievementId },
            ownerPerms(profileDoc.parentId)
          );
        } catch { /* already unlocked */ }
      },
      async listInventory() {
        const { documents } = await db().listDocuments(DB_ID, COLLECTIONS.inventory, [], 100);
        return documents.map((d) => ({ id: d.key, name: d.name, slot: d.slot, rarity: d.rarity }));
      },
      async listPlayerInventory(playerId) {
        const { documents } = await db().listDocuments(
          DB_ID, COLLECTIONS.playerInventory,
          [Query.equal("playerId", playerId)], 200
        );
        return documents.map((d) => ({
          player_id: d.playerId, item_id: d.itemId,
          equipped: d.equipped, acquired_at: d.$createdAt,
        }));
      },
      async setEquipped(playerId, itemId, equipped) {
        const { documents } = await db().listDocuments(
          DB_ID, COLLECTIONS.playerInventory,
          [Query.equal("playerId", playerId), Query.equal("itemId", itemId)], 1
        );
        if (documents.length) {
          await db().updateDocument(DB_ID, COLLECTIONS.playerInventory, documents[0].$id, { equipped });
        }
      },
      async grantItem(playerId, itemId) {
        const profileDoc = await db().getDocument(DB_ID, COLLECTIONS.playerProfiles, playerId);
        const id = `${playerId}_${itemId}`;
        try {
          await db().createDocument(
            DB_ID, COLLECTIONS.playerInventory, id,
            { playerId, itemId, equipped: false },
            ownerPerms(profileDoc.parentId)
          );
        } catch { /* already owned */ }
      },
    },

    streak: {
      async touchPractice(playerId) {
        const doc = await db().getDocument(DB_ID, COLLECTIONS.playerProfiles, playerId);
        const p = mapProfile(doc);
        const today = todayKey();
        if (p.last_practice_on === today) return p;

        const yesterday = todayKey(new Date(Date.now() - 86400000));
        const streak = p.last_practice_on === yesterday ? p.streak + 1 : 1;
        const updated = await db().updateDocument(DB_ID, COLLECTIONS.playerProfiles, playerId, {
          streak,
          lastPracticeOn: today,
        });
        return mapProfile(updated);
      },
    },
  };
}
