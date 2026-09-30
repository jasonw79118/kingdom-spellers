// Practice session engine.
//
// A session runs a sequence of words. Each word is presented as a challenge,
// the child spells it, and the result feeds the mastery store + gold/XP.
//
// Difficulty dials are per-player ("easy" | "medium" | "hard") and decide how
// much help is shown:
//   easy   — some letters pre-filled, distractors included
//   medium — fewer hints
//   hard   — no hints, no distractors
//
// Hints are never shown in test mode.

import { shuffleArray } from "../lib/utils.js";

// How many letters are pre-filled per difficulty (fraction of the word).
const PREFILL = { easy: 0.5, medium: 0.25, hard: 0 };
// How many extra (wrong) letter tiles to add to the tray.
const DISTRACTORS = { easy: 3, medium: 2, hard: 0 };

export const MODES = {
  recognition: { id: "recognition", label: "Match the word", hintLevel: 2 },
  guided: { id: "guided", label: "Guided spelling", hintLevel: 1 },
  solo: { id: "solo", label: "Spell it yourself", hintLevel: 0 },
  definition: { id: "definition", label: "Use the definition", hintLevel: 1 },
  test: { id: "test", label: "Royal Test", hintLevel: 0 },
};

// --- letter tray order ------------------------------------------------------
// The tray is read left to right, so if the word's own letters land in the
// right order the answer is already sitting there in front of the child. A
// plain shuffle still does that far too often: with no distractors a 3-letter
// word reads correctly one time in six, and a 2-letter word one time in two.
// So the order is chosen rather than merely shuffled. See shuffleTray.

const TRAY_ATTEMPTS = 40;

// Are all of `need` present in `have`, in the correct left-to-right order?
function isSubsequence(need, have) {
  let i = 0;
  for (const ch of have) {
    if (i < need.length && ch === need[i]) i += 1;
  }
  return i === need.length;
}

// How much of the answer a tray order hands over for free:
//   3 — the first needed.length tiles literally read as the word
//   2 — the word's letters appear left to right, just not all together
//   0 — the order gives nothing away
export function trayLeak(tiles, need) {
  if (!need.length) return 0;
  if (tiles.slice(0, need.length).join("") === need.join("")) return 3;
  if (isSubsequence(need, tiles)) return 2;
  return 0;
}

// Reorder a word's letters so the sequence genuinely changes. Reversing is the
// most natural-looking scramble, but reversing a palindrome ("noon") changes
// nothing, so rotate by one instead. A single letter can't be reordered at all
// — no arrangement of one tile isn't the answer.
function scramble(need) {
  if (need.length < 2) return [...need];
  const reversed = [...need].reverse();
  if (reversed.join("") !== need.join("")) return reversed;
  return [...need.slice(1), need[0]];
}

// One tile per still-needed letter (duplicates included) plus the distractors,
// in an order that cannot spell the word.
//
// `extras` never contains a letter that appears in the word, so the tiles
// holding the word's letters are exactly those whose character is in `need`.
// The repair below depends on that.
export function shuffleTray(need, extras = [], rng = Math.random) {
  const pool = [...need, ...extras];
  // Nothing to reorder: an empty word, or a single letter.
  if (need.length < 2) return shuffleArray(pool, rng);

  // Most shuffles give nothing away, so take the first that doesn't and just
  // remember the least revealing one in case this is a tray too small to allow
  // any clean order.
  let best = null;
  let bestLeak = Infinity;
  for (let attempt = 0; attempt < TRAY_ATTEMPTS; attempt += 1) {
    const candidate = shuffleArray(pool, rng);
    const leak = trayLeak(candidate, need);
    if (leak === 0) return candidate;
    if (leak < bestLeak) {
      best = candidate;
      bestLeak = leak;
    }
  }

  // Nothing gave nothing away, which happens when every remaining letter is
  // the same character ("noon" -> n, n): there is no order to change, so any
  // arrangement of the tray reads the same. Falling back to the distractors
  // first at least keeps the word's letters out of the leading slots.
  const moved = scramble(need);
  if (moved.join("") === need.join("")) return [...extras, ...moved];

  // Otherwise repair the best candidate by permuting the word's letters among
  // the slots they already occupy. The tray keeps its scattered look, and
  // because the replacement is a permutation of the same letters that isn't in
  // reading order, no arrangement of the tray can spell the word — whatever the
  // RNG does.
  const order = [...best];
  const inWord = new Set(need);
  const slots = [];
  for (let i = 0; i < order.length; i += 1) {
    if (inWord.has(order[i])) slots.push(i);
  }
  slots.forEach((slot, i) => {
    order[slot] = moved[i];
  });
  return order;
}

// Build the letter tray for a word at a given hint level.
// hintLevel: 2 = most help, 0 = none.
// `rng` is injectable for reproducible puzzles in tests.
export function buildPuzzle(word, hintLevel = 0, rng = Math.random) {
  const letters = word.split("");
  const prefilledCount =
    hintLevel >= 2 ? Math.floor(letters.length * 0.6) : hintLevel === 1 ? Math.floor(letters.length * 0.3) : 0;
  const clamped = Math.min(prefilledCount, Math.max(0, letters.length - 1));

  // Choose which positions are given (never all).
  const order = shuffleArray(letters.map((_, i) => i), rng);
  const prefilled = new Set(order.slice(0, clamped));

  const answer = letters.map((ch, i) => (prefilled.has(i) ? ch : ""));
  const needed = letters.filter((_, i) => !prefilled.has(i)).map((ch) => ch);

  // Distractor letters that aren't in the word at all.
  const alphabet = "abcdefghijklmnopqrstuvwxyz";
  const inWord = new Set(letters);
  const extraCount = hintLevel >= 2 ? DISTRACTORS.easy : hintLevel === 1 ? DISTRACTORS.medium : 0;
  const extras = [];
  let guard = 0;
  while (extras.length < extraCount && guard < 100) {
    guard += 1;
    const c = alphabet[Math.floor(rng() * alphabet.length)];
    if (!inWord.has(c) && !extras.includes(c)) extras.push(c);
  }

  const tiles = shuffleTray(needed, extras, rng);

  return {
    answer,
    tiles: tiles.map((char, i) => ({ id: `${i}-${char}`, char, used: false, slot: null })),
    prefilledCount: clamped,
  };
}

// Score a completed answer. Returns per-letter correctness so the UI can
// highlight the exact mistake.
export function gradeAnswer(word, answer) {
  const guess = answer.join("").toLowerCase();
  const target = word.toLowerCase();
  if (guess === target) return { correct: true, wrongIndex: -1 };

  // Find the first wrong letter to point at the mistake.
  let wrongIndex = -1;
  for (let i = 0; i < Math.max(guess.length, target.length); i += 1) {
    if (guess[i] !== target[i]) {
      wrongIndex = i;
      break;
    }
  }
  return { correct: false, wrongIndex };
}

// A session is an ordered list of challenges. The caller decides the order
// (adaptive priority, or shuffled for a test) — this function must NOT
// reshuffle, or the caller's first word won't be the session's first word.
export function createSession(words, { mode = "solo", difficulty = "medium", size = 10 } = {}) {
  const chosen = words.slice(0, size);
  const hintLevel = MODES[mode]?.hintLevel ?? 0;
  return {
    mode,
    difficulty,
    total: chosen.length,
    index: 0,
    words: chosen,
    results: [],      // { word, correct, guess, wrongIndex }
    startedAt: Date.now(),
    hintLevel,
  };
}

// Advance the session. Returns the next state plus a summary when finished.
export function advanceSession(session, result) {
  const results = [...session.results, result];
  const next = {
    ...session,
    results,
    index: session.index + 1,
  };
  return next;
}

export function sessionSummary(session) {
  const { results } = session;
  const total = results.length;
  const correct = results.filter((r) => r.correct).length;
  const missed = results.filter((r) => !r.correct).map((r) => r.word);
  return {
    total,
    correct,
    accuracy: total ? Math.round((correct / total) * 100) : 0,
    missed,
    perfect: total > 0 && correct === total,
  };
}
