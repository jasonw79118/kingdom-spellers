// Local demo-mode backend.
//
// Implements the exact same async interface as the Supabase backend, but
// persists everything in localStorage. This lets the app run and be tested
// with zero configuration. Swap to Supabase by setting VITE_SUPABASE_URL and
// VITE_SUPABASE_ANON_KEY — no component code changes needed.

import { uid, normalizeWord, todayKey } from "./utils.js";
import { seedDictionary, fallbackDefinition, starterWordsForGrade } from "./seedDictionary.js";

const NS = "ks2_";

function key(table) {
  return `${NS}${table}`;
}

function read(table, fallback = []) {
  try {
    const raw = localStorage.getItem(key(table));
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(table, value) {
  localStorage.setItem(key(table), JSON.stringify(value));
}

function readObj(table, fallback = {}) {
  try {
    const raw = localStorage.getItem(key(table));
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeObj(table, value) {
  localStorage.setItem(key(table), JSON.stringify(value));
}

// --- seed the dictionary + catalogs on first run ---------------------------
function ensureSeeded() {
  if (localStorage.getItem(key("seeded"))) return;
  const dict = seedDictionary.map((d) => ({
    id: uid(),
    ...d,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));
  write("dictionary_words", dict);

  const achievements = [
    { id: "first-word", title: "First Word", description: "Spell your first word correctly", icon: "star" },
    { id: "ten-words", title: "Word Collector", description: "Spell 10 words correctly", icon: "book" },
    { id: "streak-3", title: "On a Roll", description: "Practice 3 days in a row", icon: "flame" },
    { id: "streak-7", title: "Week of Wonder", description: "Practice 7 days in a row", icon: "calendar" },
    { id: "mastered-10", title: "Master of Ten", description: "Master 10 words", icon: "crown" },
    { id: "perfect-test", title: "Royal Scholar", description: "Score 100% on a Royal Test", icon: "medal" },
  ];
  write("achievements", achievements);

  const inventory = [
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
  write("inventory", inventory);

  localStorage.setItem(key("seeded"), "1");
}

// --- auth -------------------------------------------------------------------
const localAuth = {
  async signIn(email, password) {
    ensureSeeded();
    const users = read("users");
    const user = users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    );
    if (!user) return { user: null, error: { message: "Invalid email or password" } };
    writeObj("session", { userId: user.id });
    return { user: { id: user.id, email: user.email, name: user.name }, error: null };
  },

  async signUp(email, password, name) {
    ensureSeeded();
    const users = read("users");
    if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
      return { user: null, error: { message: "An account with this email already exists" } };
    }
    const user = { id: uid(), email, password, name: name || email.split("@")[0], createdAt: new Date().toISOString() };
    users.push(user);
    write("users", users);
    writeObj("session", { userId: user.id });
    return { user: { id: user.id, email: user.email, name: user.name }, error: null };
  },

  async signOut() {
    localStorage.removeItem(key("session"));
    return { error: null };
  },

  async getCurrentUser() {
    ensureSeeded();
    const session = readObj("session", null);
    if (!session?.userId) return null;
    const users = read("users");
    const user = users.find((u) => u.id === session.userId);
    return user ? { id: user.id, email: user.email, name: user.name } : null;
  },

  onAuthChange(cb) {
    // getCurrentUser is async — must await it, or cb receives a truthy
    // Promise and the app believes a user is always signed in.
    const handler = async () => {
      const u = await this.getCurrentUser();
      cb(u);
    };
    window.addEventListener("storage", handler);
    // Also poll lightly so same-tab changes are caught.
    const interval = setInterval(handler, 1000);
    return () => {
      window.removeEventListener("storage", handler);
      clearInterval(interval);
    };
  },
};

// --- player profiles (children) ---------------------------------------------
const localProfiles = {
  async list() {
    ensureSeeded();
    return read("player_profiles");
  },

  async create(data) {
    const profiles = read("player_profiles");
    const profile = {
      id: uid(),
      parent_id: data.parent_id,
      name: data.name,
      avatar: data.avatar || {},
      grade_level: data.grade_level ?? 1,
      difficulty: data.difficulty || "medium",
      xp: 0,
      coins: 0,
      streak: 0,
      last_practice_on: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    profiles.push(profile);
    write("player_profiles", profiles);
    return profile;
  },

  async update(id, data) {
    const profiles = read("player_profiles");
    const idx = profiles.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    profiles[idx] = { ...profiles[idx], ...data, updated_at: new Date().toISOString() };
    write("player_profiles", profiles);
    return profiles[idx];
  },

  async remove(id) {
    write("player_profiles", read("player_profiles").filter((p) => p.id !== id));
  },
};

// --- spelling lists + words ---------------------------------------------------
const localLists = {
  async list(playerId = null) {
    ensureSeeded();
    const lists = read("spelling_lists");
    const words = read("spelling_words");
    return lists
      .filter((l) => (playerId ? l.player_id === playerId : true))
      .map((l) => ({
        ...l,
        words: words.filter((w) => w.list_id === l.id).sort((a, b) => a.position - b.position),
      }))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },

  async create(data) {
    const lists = read("spelling_lists");
    const list = {
      id: uid(),
      parent_id: data.parent_id,
      player_id: data.player_id || null,
      title: data.title,
      source: data.source || "manual",
      created_at: new Date().toISOString(),
    };
    lists.push(list);
    write("spelling_lists", lists);
    return list;
  },

  // Create a starter list for a new player if they don't have one yet.
  async createDefaultFor(player) {
    const existing = read("spelling_lists").filter((l) => l.player_id === player.id);
    if (existing.length) return existing[0];
    const list = await this.create({
      parent_id: player.parent_id,
      player_id: player.id,
      title: `Starter Words — Grade ${player.grade_level}`,
      source: "default",
    });
    await this.saveWords(list.id, starterWordsForGrade(player.grade_level, 20));
    return list;
  },

  async remove(id) {
    write("spelling_lists", read("spelling_lists").filter((l) => l.id !== id));
    write("spelling_words", read("spelling_words").filter((w) => w.list_id !== id));
  },

  async saveWords(listId, words) {
    // Replace the word set for a list.
    const all = read("spelling_words").filter((w) => w.list_id !== listId);
    const dict = read("dictionary_words");
    const newWords = words.map((w, i) => {
      const normalized = normalizeWord(w.word);
      let dictId = null;
      const existing = dict.find((d) => d.normalized_word === normalized);
      if (existing) {
        dictId = existing.id;
      } else {
        // Auto-create a dictionary entry so definitions are stored once.
        const entry = {
          id: uid(),
          word: w.word,
          normalized_word: normalized,
          definition: w.definition || fallbackDefinition(w.word),
          kid_definition: w.kid_definition || w.definition || fallbackDefinition(w.word),
          example_sentence: w.example_sentence || "",
          part_of_speech: w.part_of_speech || "",
          pronunciation: w.pronunciation || "",
          source: w.source || "parent",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        dict.push(entry);
        dictId = entry.id;
      }
      return {
        id: uid(),
        list_id: listId,
        word: w.word,
        normalized_word: normalized,
        position: i,
        dictionary_word_id: dictId,
      };
    });
    write("dictionary_words", dict);
    write("spelling_words", [...all, ...newWords]);
    return newWords;
  },
};

// --- dictionary ----------------------------------------------------------------
const localDictionary = {
  async lookup(words) {
    const dict = read("dictionary_words");
    const map = {};
    for (const w of words) {
      const n = normalizeWord(w);
      const found = dict.find((d) => d.normalized_word === n);
      if (found) map[n] = found;
    }
    return map;
  },

  async save(entry) {
    const dict = read("dictionary_words");
    const normalized = normalizeWord(entry.word);
    const idx = dict.findIndex((d) => d.normalized_word === normalized);
    const now = new Date().toISOString();
    if (idx === -1) {
      dict.push({ id: uid(), ...entry, normalized_word: normalized, created_at: now, updated_at: now });
    } else {
      dict[idx] = { ...dict[idx], ...entry, normalized_word: normalized, updated_at: now };
    }
    write("dictionary_words", dict);
    return dict.find((d) => d.normalized_word === normalized);
  },
};

// --- attempts + mastery ---------------------------------------------------------
const localMastery = {
  async recordAttempt(playerId, word, listId, mode, correct) {
    const attempts = read("word_attempts");
    attempts.push({
      id: uid(),
      player_id: playerId,
      word: normalizeWord(word),
      list_id: listId || null,
      mode,
      correct,
      created_at: new Date().toISOString(),
    });
    write("word_attempts", attempts);

    // Update mastery
    const all = read("player_word_mastery");
    const w = normalizeWord(word);
    let m = all.find((r) => r.player_id === playerId && r.word === w);
    if (!m) {
      m = {
        player_id: playerId,
        word: w,
        attempts: 0,
        correct_attempts: 0,
        incorrect_attempts: 0,
        current_streak: 0,
        mastery_score: 0,
        mastery_level: "new",
        last_attempt_on: null,
      };
      all.push(m);
    }
    m.attempts += 1;
    if (correct) {
      m.correct_attempts += 1;
      m.current_streak += 1;
    } else {
      m.incorrect_attempts += 1;
      m.current_streak = 0;
    }
    m.last_attempt_on = new Date().toISOString();
    m.mastery_score = computeScore(m);
    m.mastery_level = levelForScore(m);
    write("player_word_mastery", all);
    return m;
  },

  async list(playerId) {
    return read("player_word_mastery").filter((m) => m.player_id === playerId);
  },

  async listAttempts(playerId) {
    return read("word_attempts")
      .filter((a) => a.player_id === playerId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },
};

function computeScore(m) {
  if (m.attempts === 0) return 0;
  const accuracy = m.correct_attempts / m.attempts;
  const experience = Math.min(1, m.attempts / 5); // 5+ attempts = full experience credit
  const streakBonus = Math.min(0.1, m.current_streak * 0.02);
  return Math.round(Math.min(1, accuracy * 0.7 + experience * 0.2 + streakBonus) * 100);
}

function levelForScore(m) {
  if (m.attempts < 1) return "new";
  if (m.mastery_score >= 90 && m.attempts >= 3 && m.current_streak >= 2) return "mastered";
  if (m.mastery_score >= 75) return "strong";
  if (m.mastery_score >= 50) return "practicing";
  if (m.attempts >= 1) return "learning";
  return "new";
}

// --- progress -------------------------------------------------------------------
const localProgress = {
  async get(playerId) {
    const all = read("player_progress");
    let p = all.find((r) => r.player_id === playerId);
    if (!p) {
      p = {
        player_id: playerId,
        unlocked_kingdoms: [1],
        current_kingdom: 1,
        buildings: {},
        characters_unlocked: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      all.push(p);
      write("player_progress", all);
    }
    return p;
  },

  async save(playerId, data) {
    const all = read("player_progress");
    const idx = all.findIndex((r) => r.player_id === playerId);
    const now = new Date().toISOString();
    if (idx === -1) {
      const p = { player_id: playerId, ...data, created_at: now, updated_at: now };
      all.push(p);
      write("player_progress", all);
      return p;
    }
    all[idx] = { ...all[idx], ...data, updated_at: now };
    write("player_progress", all);
    return all[idx];
  },
};

// --- achievements + inventory -----------------------------------------------------
const localCatalog = {
  async listAchievements() {
    return read("achievements");
  },

  async listPlayerAchievements(playerId) {
    return read("player_achievements")
      .filter((a) => a.player_id === playerId)
      .map((a) => a.achievement_id);
  },

  async unlock(playerId, achievementId) {
    const all = read("player_achievements");
    if (all.some((a) => a.player_id === playerId && a.achievement_id === achievementId)) return;
    all.push({ player_id: playerId, achievement_id: achievementId, unlocked_at: new Date().toISOString() });
    write("player_achievements", all);
  },

  async listInventory() {
    return read("inventory");
  },

  async listPlayerInventory(playerId) {
    return read("player_inventory").filter((i) => i.player_id === playerId);
  },

  async setEquipped(playerId, itemId, equipped) {
    const all = read("player_inventory");
    const idx = all.findIndex((i) => i.player_id === playerId && i.item_id === itemId);
    if (idx === -1) {
      all.push({ player_id: playerId, item_id: itemId, equipped, acquired_at: new Date().toISOString() });
    } else {
      all[idx].equipped = equipped;
    }
    write("player_inventory", all);
  },

  async grantItem(playerId, itemId) {
    const all = read("player_inventory");
    if (all.some((i) => i.player_id === playerId && i.item_id === itemId)) return;
    all.push({ player_id: playerId, item_id: itemId, equipped: false, acquired_at: new Date().toISOString() });
    write("player_inventory", all);
  },
};

// --- streak helper ----------------------------------------------------------------
const localStreak = {
  async touchPractice(playerId) {
    const profiles = read("player_profiles");
    const idx = profiles.findIndex((p) => p.id === playerId);
    if (idx === -1) return null;
    const p = profiles[idx];
    const today = todayKey();
    if (p.last_practice_on === today) return p;
    const yesterday = todayKey(new Date(Date.now() - 86400000));
    p.streak = p.last_practice_on === yesterday ? p.streak + 1 : 1;
    p.last_practice_on = today;
    p.updated_at = new Date().toISOString();
    profiles[idx] = p;
    write("player_profiles", profiles);
    return p;
  },
};

export const localBackend = {
  auth: localAuth,
  profiles: localProfiles,
  lists: localLists,
  dictionary: localDictionary,
  mastery: localMastery,
  progress: localProgress,
  catalog: localCatalog,
  streak: localStreak,
};
