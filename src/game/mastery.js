// Adaptive learning engine.
//
// Every (player, word) pair tracks attempts, correctness, streak and a mastery
// score. Two jobs live here:
//   1. scoreMastery()  — turn raw attempt counts into a mastery level
//   2. buildPracticeSet() — pick the next words to practice
//
// The important rule from the spec: a word is NEVER "Mastered" after a
// single correct answer. Mastery requires repeated success over time, and
// a word that has ever been missed stays in rotation until it's genuinely
// strong.

export const MASTERY_LEVELS = ["new", "learning", "practicing", "strong", "mastered"];

// Mastery thresholds. A word must clear the attempt bar AND the score bar.
export const MASTERY_RULES = {
  mastered: { minScore: 90, minAttempts: 4, minStreak: 3 },
  strong: { minScore: 75, minAttempts: 3 },
  practicing: { minScore: 50, minAttempts: 2 },
  learning: { minScore: 1, minAttempts: 1 },
};

// 0..100. Blends accuracy (60), experience (25) and current streak (15),
// then subtracts a penalty for heavy missing so a single slip isn't
// forgiven instantly. A flawless record reaches 100, which is what makes
// the "mastered" tier (>= 90) actually reachable.
export function scoreMastery({ attempts = 0, correct = 0, streak = 0 }) {
  if (!attempts) return 0;
  const accuracy = correct / attempts;
  // Experience: full credit after 4 attempts — matching the minimum number of
  // attempts the "mastered" tier requires, so a perfect run can reach it.
  const experience = Math.min(1, attempts / 4);
  // Consistency: full credit after 4 in a row.
  const consistency = Math.min(1, streak / 4);
  // Penalty for a poor hit rate.
  const missPenalty = accuracy < 0.5 ? 12 : accuracy < 0.7 ? 6 : 0;

  const score = accuracy * 60 + experience * 25 + consistency * 15 - missPenalty;
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function masteryLevel(m) {
  if (!m || !m.attempts) return "new";
  const s = m.score ?? scoreMastery(m);
  const rule = (level) => ({ ...MASTERY_RULES[level], score: s });

  const mastered = rule("mastered");
  if (s >= mastered.minScore && m.attempts >= mastered.minAttempts && (m.streak ?? 0) >= mastered.minStreak) {
    return "mastered";
  }
  const strong = rule("strong");
  if (s >= strong.minScore && m.attempts >= strong.minAttempts) return "strong";
  const practicing = rule("practicing");
  if (s >= practicing.minScore && m.attempts >= practicing.minAttempts) return "practicing";
  return "learning";
}

// How urgently does this word need to be practiced? Higher = sooner.
export function practiceWeight(m) {
  if (!m || !m.attempts) return 5; // brand new words are high priority
  const level = masteryLevel(m);
  const base = { new: 5, learning: 4.5, practicing: 3, strong: 1.5, mastered: 0.6 }[level];

  // Words with a live miss streak jump the queue.
  const recentMiss = (m.streak ?? 0) === 0 ? 2.5 : 0;
  // Words answered wrong historically stay elevated.
  const accuracy = m.attempts ? m.correct / m.attempts : 0;
  const shaky = accuracy < 0.6 ? 1.5 : 0;

  return base + recentMiss + shaky;
}

// Build the next practice set from a full list of words + the player's
// mastery records. Words already mastered are included rarely (spaced
// review); weak words come up often.
export function buildPracticeSet(words, masteryByWord, { size = 10, includeMastered = true } = {}) {
  const records = words.map((w) => {
    const key = w.normalized_word || w.word;
    const m = masteryByWord[key];
    return {
      word: w,
      record: m
        ? { ...m, score: m.mastery_score ?? scoreMastery(m) }
        : { attempts: 0, correct: 0, streak: 0, score: 0 },
    };
  });

  // Split so mastered words can be sprinkled in at a low rate.
  const needsWork = records.filter((r) => masteryLevel(r.record) !== "mastered");
  const mastered = records.filter((r) => masteryLevel(r.record) === "mastered");

  const pool = includeMastered ? [...needsWork] : [];
  // Give a small chance that a mastered word shows up for retention.
  const retentionCount = includeMastered
    ? Math.min(mastered.length, Math.ceil(size * 0.2))
    : 0;

  const target = Math.min(size, pool.length + retentionCount);
  const chosen = [];

  const weighted = pool
    .map((r) => ({ r, w: practiceWeight(r.record) }))
    .sort((a, b) => b.w - a.w)
    .slice(0, Math.max(target, Math.min(pool.length, target)));

  // Weighted sample without replacement.
  const working = [...weighted];
  while (chosen.length < target && working.length) {
    const total = working.reduce((s, x) => s + x.w, 0);
    let idx;
    if (total <= 0) {
      idx = Math.floor(Math.random() * working.length);
    } else {
      let r = Math.random() * total;
      idx = 0;
      for (; idx < working.length; idx += 1) {
        r -= working[idx].w;
        if (r <= 0) break;
      }
      if (idx >= working.length) idx = working.length - 1;
    }
    chosen.push(working.splice(idx, 1)[0].r);
  }

  // Top up with retention words if we still have room.
  if (chosen.length < target && mastered.length) {
    const shuffledMastered = [...mastered].sort(() => Math.random() - 0.5);
    for (const r of shuffledMastered) {
      if (chosen.length >= target) break;
      chosen.push(r);
    }
  }

  // Top up with anything remaining (keeps the set full for tiny lists).
  if (chosen.length < size) {
    const picked = new Set(chosen.map((c) => c.word.normalized_word || c.word.word));
    for (const r of records) {
      if (chosen.length >= size) break;
      const key = r.word.normalized_word || r.word.word;
      if (!picked.has(key)) {
        chosen.push(r);
        picked.add(key);
      }
    }
  }

  return chosen.map((c) => c.word);
}

// Words the player gets wrong most often — used by "Needs Practice".
export function needsPractice(masteryRecords, { limit = 5 } = {}) {
  return [...masteryRecords]
    .filter((m) => m.attempts > 0 && (m.incorrect_attempts ?? 0) > 0)
    .map((m) => ({
      word: m.word,
      accuracy: Math.round((m.correct_attempts / m.attempts) * 100),
      level: masteryLevel({
        attempts: m.attempts,
        correct: m.correct_attempts,
        streak: m.current_streak ?? 0,
        score: m.mastery_score,
      }),
    }))
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, limit);
}

export function masteredWords(masteryRecords, { limit = 10 } = {}) {
  return [...masteryRecords]
    .filter(
      (m) =>
        m.attempts > 0 &&
        masteryLevel({
          attempts: m.attempts,
          correct: m.correct_attempts,
          streak: m.current_streak ?? 0,
          score: m.mastery_score,
        }) === "mastered"
    )
    .sort((a, b) => (b.mastery_score ?? 0) - (a.mastery_score ?? 0))
    .slice(0, limit)
    .map((m) => ({
      word: m.word,
      accuracy: Math.round((m.correct_attempts / m.attempts) * 100),
    }));
}
