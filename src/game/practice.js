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

import { shuffleArray } from "../lib/utils";

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

// Build the letter tray for a word at a given hint level.
// hintLevel: 2 = most help, 0 = none.
export function buildPuzzle(word, hintLevel = 0, seed = Math.random()) {
  const letters = word.split("");
  const prefilledCount =
    hintLevel >= 2 ? Math.floor(letters.length * 0.6) : hintLevel === 1 ? Math.floor(letters.length * 0.3) : 0;
  const clamped = Math.min(prefilledCount, Math.max(0, letters.length - 1));

  // Choose which positions are given (never all).
  const order = shuffleArray(letters.map((_, i) => i));
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
    const c = alphabet[Math.floor(Math.random() * alphabet.length)];
    if (!inWord.has(c) && !extras.includes(c)) extras.push(c);
  }

  // Tray holds one tile per needed letter (duplicates included) + extras.
  let tiles = [...needed, ...extras];
  if (seed === 0) tiles = tiles.sort();
  else tiles = shuffleArray(tiles);

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
