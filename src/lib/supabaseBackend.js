// Supabase backend — mirrors the local backend interface exactly.
// Used automatically when VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.

import { normalizeWord } from "./utils.js";
import { seedDictionary, fallbackDefinition, starterWordsForGrade } from "./seedDictionary.js";

let seeded = false;

async function ensureSeeded(supabase) {
  if (seeded) return;
  // Upsert the built-in dictionary so definitions are stored once and shared.
  for (const entry of seedDictionary) {
    await supabase
      .from("dictionary_words")
      .upsert(
        {
          word: entry.word,
          normalized_word: entry.normalized_word,
          definition: entry.definition,
          kid_definition: entry.kid_definition,
          example_sentence: entry.example_sentence,
          part_of_speech: entry.part_of_speech,
          pronunciation: entry.pronunciation,
          source: entry.source,
        },
        { onConflict: "normalized_word" }
      );
  }
  seeded = true;
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

export function createSupabaseBackend(supabase) {
  return {
    auth: {
      async signIn(email, password) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error || !data.user) return { user: null, error };
        const profile = await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", data.user.id)
          .maybeSingle();
        return {
          user: { id: data.user.id, email: data.user.email, name: profile?.data?.display_name || data.user.email },
          error: null,
        };
      },

      async signUp(email, password, name) {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error || !data.user) return { user: null, error };
        await supabase.from("profiles").upsert({ id: data.user.id, display_name: name || "" });
        return { user: { id: data.user.id, email: data.user.email, name: name || email }, error: null };
      },

      async signOut() {
        const { error } = await supabase.auth.signOut();
        return { error };
      },

      async getCurrentUser() {
        const { data } = await supabase.auth.getUser();
        if (!data.user) return null;
        const profile = await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", data.user.id)
          .maybeSingle();
        return {
          id: data.user.id,
          email: data.user.email,
          name: profile?.data?.display_name || data.user.email,
        };
      },

      onAuthChange(cb) {
        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange(async () => {
          const user = await this.getCurrentUser();
          cb(user);
        });
        return () => subscription.unsubscribe();
      },
    },

    profiles: {
      async list() {
        const { data, error } = await supabase.from("player_profiles").select("*");
        if (error) throw error;
        return data || [];
      },
      async create(d) {
        const { data, error } = await supabase.from("player_profiles").insert(d).select().single();
        if (error) throw error;
        return data;
      },
      async update(id, d) {
        const { data, error } = await supabase.from("player_profiles").update(d).eq("id", id).select().single();
        if (error) throw error;
        return data;
      },
      async remove(id) {
        const { error } = await supabase.from("player_profiles").delete().eq("id", id);
        if (error) throw error;
      },
    },

    lists: {
      async list(playerId = null) {
        let query = supabase
          .from("spelling_lists")
          .select("*, spelling_words(*)")
          .order("created_at", { ascending: false });
        if (playerId) query = query.eq("player_id", playerId);
        const { data, error } = await query;
        if (error) throw error;
        return (data || []).map((l) => ({
          ...l,
          words: (l.spelling_words || [])
            .sort((a, b) => a.position - b.position)
            .map((w) => ({ ...w, definition: w.kid_definition || w.definition })),
        }));
      },
      async create(d) {
        const { data, error } = await supabase.from("spelling_lists").insert(d).select().single();
        if (error) throw error;
        return data;
      },
      async createDefaultFor(player) {
        const { data: existing } = await supabase
          .from("spelling_lists")
          .select("*")
          .eq("player_id", player.id)
          .limit(1);
        if (existing && existing.length) return existing[0];
        const { data: list, error } = await supabase
          .from("spelling_lists")
          .insert({
            parent_id: player.parent_id,
            player_id: player.id,
            title: `Starter Words — Grade ${player.grade_level}`,
            source: "default",
          })
          .select()
          .single();
        if (error) throw error;
        await this.saveWords(list.id, starterWordsForGrade(player.grade_level, 20));
        return list;
      },
      async remove(id) {
        const { error } = await supabase.from("spelling_lists").delete().eq("id", id);
        if (error) throw error;
      },
      async saveWords(listId, words) {
        await ensureSeeded(supabase);
        await supabase.from("spelling_words").delete().eq("list_id", listId);
        const rows = words.map((w, i) => ({
          list_id: listId,
          word: w.word,
          normalized_word: normalizeWord(w.word),
          position: i,
        }));
        const { data, error } = await supabase.from("spelling_words").insert(rows).select();
        if (error) throw error;
        // Link to dictionary entries where possible.
        for (const w of data) {
          const dict = await supabase
            .from("dictionary_words")
            .select("id")
            .eq("normalized_word", w.normalized_word)
            .maybeSingle();
          if (dict.data) {
            await supabase.from("spelling_words").update({ dictionary_word_id: dict.data.id }).eq("id", w.id);
          } else {
            const entry = {
              word: w.word,
              normalized_word: w.normalized_word,
              definition: w.definition || fallbackDefinition(w.word),
              kid_definition: w.kid_definition || w.definition || fallbackDefinition(w.word),
              example_sentence: w.example_sentence || "",
              part_of_speech: w.part_of_speech || "",
              pronunciation: w.pronunciation || "",
              source: "parent",
            };
            const created = await supabase.from("dictionary_words").insert(entry).select("id").single();
            if (created.data) {
              await supabase.from("spelling_words").update({ dictionary_word_id: created.data.id }).eq("id", w.id);
            }
          }
        }
        return data;
      },
    },

    dictionary: {
      async lookup(words) {
        const normalized = [...new Set(words.map(normalizeWord))];
        if (!normalized.length) return {};
        const { data, error } = await supabase
          .from("dictionary_words")
          .select("*")
          .in("normalized_word", normalized);
        if (error) throw error;
        const map = {};
        for (const d of data || []) map[d.normalized_word] = d;
        return map;
      },
      async save(entry) {
        const { data, error } = await supabase
          .from("dictionary_words")
          .upsert(
            {
              word: entry.word,
              normalized_word: normalizeWord(entry.word),
              definition: entry.definition,
              kid_definition: entry.kid_definition,
              example_sentence: entry.example_sentence,
              part_of_speech: entry.part_of_speech,
              pronunciation: entry.pronunciation,
              source: entry.source || "parent",
            },
            { onConflict: "normalized_word" }
          )
          .select()
          .single();
        if (error) throw error;
        return data;
      },
    },

    mastery: {
      async recordAttempt(playerId, word, listId, mode, correct) {
        await supabase.from("word_attempts").insert({
          player_id: playerId,
          word: normalizeWord(word),
          list_id: listId || null,
          mode,
          correct,
        });
        // Recompute mastery from full history.
        const { data } = await supabase
          .from("word_attempts")
          .select("correct")
          .eq("player_id", playerId)
          .eq("word", normalizeWord(word));
        const attempts = data || [];
        const correctCount = attempts.filter((a) => a.correct).length;
        let streak = 0;
        for (let i = attempts.length - 1; i >= 0; i -= 1) {
          if (attempts[i].correct) streak += 1;
          else break;
        }
        const m = {
          player_id: playerId,
          word: normalizeWord(word),
          attempts: attempts.length,
          correct_attempts: correctCount,
          incorrect_attempts: attempts.length - correctCount,
          current_streak: streak,
        };
        m.mastery_score = computeScore(m);
        m.mastery_level = levelForScore(m);
        const { error } = await supabase
          .from("player_word_mastery")
          .upsert({ ...m, last_attempt_on: new Date().toISOString() }, { onConflict: "player_id,word" });
        if (error) throw error;
        return m;
      },
      async list(playerId) {
        const { data, error } = await supabase.from("player_word_mastery").select("*").eq("player_id", playerId);
        if (error) throw error;
        return data || [];
      },
      async listAttempts(playerId) {
        const { data, error } = await supabase
          .from("word_attempts")
          .select("*")
          .eq("player_id", playerId)
          .order("created_at", { ascending: false });
        if (error) throw error;
        return data || [];
      },
    },

    progress: {
      async get(playerId) {
        const { data, error } = await supabase.from("player_progress").select("*").eq("player_id", playerId).maybeSingle();
        if (error) throw error;
        if (data) return data;
        const created = await supabase
          .from("player_progress")
          .insert({ player_id: playerId })
          .select()
          .single();
        return created.data;
      },
      async save(playerId, d) {
        const { data, error } = await supabase
          .from("player_progress")
          .upsert({ player_id: playerId, ...d })
          .select()
          .single();
        if (error) throw error;
        return data;
      },
    },

    catalog: {
      async listAchievements() {
        const { data, error } = await supabase.from("achievements").select("*");
        if (error) throw error;
        return data || [];
      },
      async listPlayerAchievements(playerId) {
        const { data, error } = await supabase
          .from("player_achievements")
          .select("achievement_id")
          .eq("player_id", playerId);
        if (error) throw error;
        return (data || []).map((a) => a.achievement_id);
      },
      async unlock(playerId, achievementId) {
        const { error } = await supabase
          .from("player_achievements")
          .upsert({ player_id: playerId, achievement_id: achievementId }, { onConflict: "player_id,achievement_id" });
        if (error) throw error;
      },
      async listInventory() {
        const { data, error } = await supabase.from("inventory").select("*");
        if (error) throw error;
        return data || [];
      },
      async listPlayerInventory(playerId) {
        const { data, error } = await supabase.from("player_inventory").select("*").eq("player_id", playerId);
        if (error) throw error;
        return data || [];
      },
      async setEquipped(playerId, itemId, equipped) {
        const { error } = await supabase
          .from("player_inventory")
          .update({ equipped })
          .eq("player_id", playerId)
          .eq("item_id", itemId);
        if (error) throw error;
      },
      async grantItem(playerId, itemId) {
        const { error } = await supabase
          .from("player_inventory")
          .upsert({ player_id: playerId, item_id: itemId, equipped: false }, { onConflict: "player_id,item_id" });
        if (error) throw error;
      },
    },

    streak: {
      async touchPractice(playerId) {
        const { data: p } = await supabase.from("player_profiles").select("*").eq("id", playerId).maybeSingle();
        if (!p) return null;
        const today = new Date().toISOString().slice(0, 10);
        if (p.last_practice_on === today) return p;
        const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
        const streak = p.last_practice_on === yesterday ? p.streak + 1 : 1;
        const { data, error } = await supabase
          .from("player_profiles")
          .update({ streak, last_practice_on: today, updated_at: new Date().toISOString() })
          .eq("id", playerId)
          .select()
          .single();
        if (error) throw error;
        return data;
      },
    },
  };
}
