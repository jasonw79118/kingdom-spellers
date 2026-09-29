// OCR using Tesseract.js (runs fully in the browser — no paid API needed).
//
// Flow:
//   1. Parent photographs or uploads a printed spelling list
//   2. Tesseract extracts raw text locally
//   3. `extractCandidates` filters the text down to likely spelling words
//   4. Parent reviews/edits the candidates before anything is saved
//
// Nothing is ever auto-saved: the OCR result always goes through review.

import { createWorker } from "tesseract.js";

// Small stop-word list of words that are almost never the target of a
// spelling lesson but frequently appear in instructions/headings on a
// printed list. They are shown to the parent but flagged lower-confidence.
const LOW_CONFIDENCE = new Set([
  "spelling", "words", "word", "name", "date", "list", "page", "test",
  "practice", "grade", "week", "unit", "review", "answers", "answer",
  "the", "and", "a", "an", "of", "to", "in", "on", "for", "is", "are",
  "was", "were", "be", "by", "with", "this", "that", "it", "as", "at",
  "from", "or", "but", "not", "you", "your", "we", "our", "i", "my",
  "spell", "each", "one", "two", "three", "four", "five",
]);

// Heuristic: is this token plausibly a spelling word?
function isLikelyWord(token) {
  if (!token) return false;
  // Allow letters, internal apostrophes and hyphens (e.g. "don't", "well-known")
  if (!/^[a-z][a-z'-]*[a-z]$|^[a-z]$/.test(token)) return false;
  // Very short or very long tokens are usually OCR noise
  if (token.length < 2 || token.length > 20) return false;
  // Reject tokens with no vowel — almost always noise
  if (!/[aeiouy]/.test(token)) return false;
  return true;
}

// Turn raw OCR text into a list of likely spelling words.
// Lines that contain exactly one word are treated as strong candidates
// (the common "numbered word list" layout).
export function extractCandidates(text) {
  if (!text) return [];

  const lines = text.split(/\r?\n/);
  const strong = [];
  const weak = new Set();

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Strip common list markers: "1.", "2)", "a.", "-", "•", "3 -"
    const cleaned = line
      .replace(/^\s*(\d+|[a-zA-Z])[\.\)\:]\s*/, "")
      .replace(/^[\-\*•▪◦]+\s*/, "")
      .replace(/\s*[\.\,\:\;]+$/, "")
      .trim();

    if (!cleaned) continue;

    // Split on whitespace to find tokens
    const tokens = cleaned
      .split(/[\s,;]+/)
      .map((t) => t.toLowerCase().replace(/[^a-z'-]/g, ""))
      .filter(Boolean);

    // A line that is a single word = high confidence spelling target
    if (tokens.length === 1) {
      const w = tokens[0];
      if (isLikelyWord(w) && !LOW_CONFIDENCE.has(w)) {
        strong.push(w);
      } else if (isLikelyWord(w)) {
        weak.add(w);
      }
      continue;
    }

    // Multi-word line: add each valid token as a weaker candidate
    for (const w of tokens) {
      if (isLikelyWord(w)) weak.add(w);
    }
  }

  // Merge: strong first (preserving order), then weak not already included
  const seen = new Set();
  const result = [];
  for (const w of strong) {
    if (!seen.has(w)) {
      seen.add(w);
      result.push(w);
    }
  }
  for (const w of weak) {
    if (!seen.has(w)) {
      seen.add(w);
      result.push(w);
    }
  }
  return result;
}

// Run Tesseract OCR on an image File/Blob. Returns { text, candidates }.
// onProgress receives a 0..1 value.
export async function runOcr(image, onProgress) {
  const worker = await createWorker("eng", 1, {
    logger: (m) => {
      if (m.status === "recognizing text" && typeof m.progress === "number") {
        onProgress?.(m.progress);
      }
    },
  });

  try {
    const { data } = await worker.recognize(image);
    const text = data?.text || "";
    return { text, candidates: extractCandidates(text) };
  } finally {
    await worker.terminate();
  }
}
