// Definition lookup for words the built-in dataset doesn't cover.
//
// Where definitions come from, in order of preference:
//
//   1. The curated dataset (699 kid-friendly definitions, see seedDictionary.js).
//      These are already written for children, so they are always preferred.
//   2. Datamuse (api.datamuse.com) — free, no API key, no signup, and it
//      answers CORS so it can be called straight from the browser.
//
// Why not the obvious alternatives:
//   * dictionaryapi.dev is currently returning 522 and blocks CORS, so it
//     cannot be called from a web page at all.
//   * dictionary.com has no free public API.
//
// The catch with raw dictionary definitions is that they are written for
// adults. "A large mammal of the family Elephantidae in the order Proboscidea"
// is correct and useless to a 7-year-old, so `simplifyForGrade` does real work
// on the text rather than just truncating it.

import { fallbackDefinition } from "./seedDictionary.js";
import { normalizeWord } from "./utils.js";

// ---------------------------------------------------------------------------
// Grade bands
// ---------------------------------------------------------------------------
// Grade 1-2 children read short, concrete definitions. As the grade rises we
// allow more clause structure and longer vocabulary.
const GRADE_BANDS = {
  1: { maxWords: 14, allowClause: false, maxChars: 110 },
  2: { maxWords: 18, allowClause: true, maxChars: 150 },
  3: { maxWords: 24, allowClause: true, maxChars: 190 },
};
const band = (grade) => GRADE_BANDS[Math.min(3, Math.max(1, Number(grade) || 2))];

// Senses can be qualified with a parenthetical label right after the part of
// speech. Most of those are perfectly good everyday senses — "(music)",
// "(countable)" — so they are kept. Only genuinely unsuitable ones are dropped.
const SPECIALIST_MARKERS = [
  "obsolete", "historical", "archaic", "dialectal", "dialect", "vulgar",
  "derogatory", "offensive", "slang", "placename", "surname", "given name",
  "xiangqi", "cartomancy", "rail transport", "horology", "heraldry",
  "linguistics", "grammar", "phonetics", "typography", "musicology",
  "mythology", "theology", "ecclesiastical", "zoology", "botany",
  "nautical", "mining", "geology", "anatomy", "physiology", "computing",
  "mathematics", "chemistry", "physics", "chemistry", "cricket",
  "figuratively", "figurative", "extended", "by extension", "idiomatic",
];

// Proper-noun senses ("a town in Ohio", "a surname") are common in Wiktionary
// and never what a child means. Detected from the definition's own wording.
const PROPER_NOUN = [
  /^a placename/i, /^an? (?:surname|given name|family name)/i,
  /^a (?:town|city|village|hamlet|municipality|borough|township|census-designated place|unincorporated community|district|county|river|lake|island|peak)/i,
  /\b(?:county|township|united states|municipality|census-designated)\b/i,
];

// A sense is unusable for a child if its leading label marks it as obsolete or
// technical, or if the definition is really about a place or a name.
function isSpecialistSense(def) {
  const text = String(def || "");
  // The label, if any, sits between the POS and the definition.
  const label = /^[a-z]+\t\s*\(([^)]*)\)/i.exec(text)?.[1]?.toLowerCase() || "";
  if (label && SPECIALIST_MARKERS.some((m) => label.includes(m))) return true;

  // No label, or an ordinary one: check the definition body for proper nouns.
  const body = text.replace(/^[a-z]+\t\s*/, "");
  if (PROPER_NOUN.some((re) => re.test(body))) return true;

  return false;
}

// Datamuse prefixes each sense with a part of speech ("n\t", "v\t", "adj\t").
const stripPos = (def) => def.replace(/^[a-z]+\t\s*/i, "").trim();
const posOf = (def) => {
  const m = /^(n|v|adj|adv|prep|conj|interj|pron|num|art|aux|det|abbr)\t/i.exec(String(def || ""));
  return m ? m[1].toLowerCase() : "";
};

// Wiktionary lists senses in dictionary order, which does not reliably put the
// everyday sense first — "xylophone" comes back as the *verb* "to play a
// xylophone". School spelling lists are overwhelmingly nouns, so prefer them.
const PREFERRED_POS = ["n", "v", "adj", "adv"];

// Swap dictionary-ese for everyday words, then tidy the seams it leaves.
// Deliberately conservative: only swaps phrases that are unambiguously
// administrative. Trying to rewrite the vocabulary itself produced nonsense
// ("a large mammal of the family kind"), so sense *selection* does the real
// work here and this only tidies up what survives.
const JARGON = [
  // Taxonomic rank clauses are pure noise for a child. "A large mammal of the
  // family Elephantidae in the order Proboscidea" becomes "A large mammal".
  // Only matched against a capitalised binomial, so ordinary words are safe.
  [
    /\s*,?\s*(?:in|of|from)\s+the\s+(?:family|subfamily|order|genus|tribe|class|phylum)\s+[A-Z][A-Za-z]+/g,
    "",
  ],
  // e.g. "Lepidoptera, distinguished from moths by..." -> "distinguished..."
  [/^\s*[A-Z][A-Za-z]+,\s*(?=[a-z])/, ""],
  [/\bpertaining to\b/gi, "about"],
  [/\brelating to\b/gi, "about"],
  [/\bdenoting\b/gi, "showing"],
  [/\bsynonym of\b/gi, "another word for"],
  [/\bany of various\b/gi, ""],
  [/\bany of\b/gi, ""],
  [/\bvarious\b/gi, ""],
  [/\bchiefly\b/gi, "mostly"],
];

// Remove parenthetical glosses. The sense *label* right after the part of
// speech is already handled by isSpecialistSense; anything left is mid-sentence
// jargon like "(percussion idiophone)" or "(including children)".
const stripAsides = (def) =>
  def
    .replace(/\s*\([^)]*\)/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();

// Apply the conservative rewrites, then tidy the seams they leave behind.
function deJargon(def) {
  let out = def;
  for (const [re, to] of JARGON) out = out.replace(re, to);
  return out
    .replace(/\s*,\s*,+/g, ",")
    .replace(/^[\s,;:]+/, "")
    .replace(/\s+([,.;:])/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
}

// Very long definitions read badly for a child even when every word is common.
// Prefer the first clause when it stands on its own.
function shorten(def, { maxWords, allowClause, maxChars }) {
  let out = def.trim();

  // Cut a dangling tail left behind by removing an aside: "A house of worship,
  // especially:" -> "A house of worship". Also drop trailing connectives that
  // promise an example which we then removed.
  out = out
    .replace(/[,:;]\s*$/, "")
    .replace(/[\s,]+(?:especially|including|such as|for example|e\.g\.|i\.e\.|usually|often|chiefly|especially in)$/i, "")
    .replace(/[\s,;:-]+$/, "")
    .trim();

  if (!allowClause) {
    // Grades 1-2: stop at the first comma or semicolon — what comes before is
    // usually the core meaning.
    const cut = out.search(/[,;]/);
    if (cut > 25) out = out.slice(0, cut);
  }

  const words = out.split(/\s+/);
  if (words.length > maxWords) {
    out = words.slice(0, maxWords).join(" ").replace(/[,;:]$/, "");
    // Don't leave a definition that stops mid-phrase without any punctuation.
    if (!/[.!?:]$/.test(out)) out += ".";
  }

  if (out.length > maxChars) {
    out = out.slice(0, maxChars).replace(/\s+\S*$/, "");
    if (!/[.!?:]$/.test(out)) out += ".";
  }

  out = out.trim();
  if (!out) return "";
  return out.charAt(0).toUpperCase() + out.slice(1);
}

// Clean one raw sense for a given grade. Returns "" if nothing usable is left.
export function simplifyForGrade(rawDef, grade = 2) {
  if (!rawDef) return "";
  const cfg = band(grade);
  let def = stripPos(String(rawDef).trim());
  def = deJargon(stripAsides(def));
  // Strip a dangling trailing marker some entries use, e.g. "see also: X".
  def = def.replace(/see also:.*$/i, "").trim();
  if (def.length < 3) return "";
  return shorten(def, cfg);
}

// Choose the best sense from a list of raw senses for this grade.
export function pickSense(defs, grade = 2) {
  if (!Array.isArray(defs) || !defs.length) return "";
  // Drop the specialist/archaic senses, which are the ones carrying a
  // parenthetical label right after the part of speech.
  const readable = defs.filter((d) => !isSpecialistSense(d));
  const pool = readable.length ? readable : defs;

  // Then order by how likely the part of speech is to be what a child means,
  // because dictionary order does not reliably put the everyday sense first.
  // Without this, "xylophone" comes back as the verb "to play a xylophone".
  const ordered = [...pool].sort((a, b) => {
    const ia = PREFERRED_POS.indexOf(posOf(a));
    const ib = PREFERRED_POS.indexOf(posOf(b));
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });

  for (const raw of ordered) {
    const out = simplifyForGrade(raw, grade);
    if (out) return out;
  }
  return "";
}

// ---------------------------------------------------------------------------
// Sources
// ---------------------------------------------------------------------------

const DATAMUSE = "https://api.datamuse.com/words";
// Optional Merriam-Webster (dictionaryapi.com) key. Free tier available; the
// user's own key is stored locally and never shipped.
const MW_KEY_STORE = "ks2_mw_key";

export function getWebDictionaryKey() {
  try {
    return localStorage.getItem(MW_KEY_STORE) || "";
  } catch {
    return "";
  }
}
export function setWebDictionaryKey(key) {
  try {
    if (key) localStorage.setItem(MW_KEY_STORE, key.trim());
    else localStorage.removeItem(MW_KEY_STORE);
  } catch { /* private mode */ }
}
export function getWebDictionarySource() {
  return getWebDictionaryKey() ? "merriam-webster" : "datamuse";
}

// Cache results so re-opening a list never re-fetches the same word.
const memCache = new Map();
const storeKey = "ks2_webdefs";
const MAX_CACHED = 300;

function readStore() {
  try {
    return JSON.parse(localStorage.getItem(storeKey) || "{}");
  } catch {
    return {};
  }
}
function writeStore(obj) {
  try {
    const keys = Object.keys(obj);
    if (keys.length > MAX_CACHED) {
      // Drop the oldest half; the object is insertion-ordered.
      for (const k of keys.slice(0, keys.length - MAX_CACHED / 2)) delete obj[k];
    }
    localStorage.setItem(storeKey, JSON.stringify(obj));
  } catch { /* private mode */ }
}

// Datamuse returns Wiktionary-style senses. Filter out "spell-check only"
// results (no defs) and near-misses (score is lower for typos).
async function fetchDatamuse(word) {
  const url = `${DATAMUSE}?sp=${encodeURIComponent(word)}&md=d&max=3`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Datamuse ${res.status}`);
  const json = await res.json();
  if (!Array.isArray(json) || !json.length) return "";
  // Entry 0 is the exact match when one exists.
  const exact = json.find((e) => e && e.word && e.word.toLowerCase() === word.toLowerCase()) || json[0];
  if (!exact || !Array.isArray(exact.defs)) return "";
  return pickSense(exact.defs, 2);
}

async function fetchMerriamWebster(word) {
  const key = getWebDictionaryKey();
  if (!key) return "";
  const res = await fetch(
    `https://dictionaryapi.com/api/v3/references/collegiate/json/${encodeURIComponent(word)}?key=${encodeURIComponent(key)}`
  );
  if (!res.ok) throw new Error(`Merriam-Webster ${res.status}`);
  const json = await res.json();
  if (!Array.isArray(json) || !json.length) return "";
  // Entries look like { fl, shortdef: ["..."], def: ["..."] }.
  const senses = json
    .filter((e) => e && e.shortdef && e.shortdef.length)
    .flatMap((e) => e.shortdef);
  return pickSense(senses, 2);
}

// Fetch one word from the web. Returns "" when nothing is found — an unknown
// word is not an error, the parent can just type the definition.
export async function fetchWebDefinition(word, { grade = 2 } = {}) {
  const clean = String(word || "").trim().toLowerCase();
  if (!clean) return "";

  const cacheKey = `${getWebDictionarySource()}:${grade}:${clean}`;
  if (memCache.has(cacheKey)) return memCache.get(cacheKey);

  const store = readStore();
  if (store[cacheKey] !== undefined) {
    memCache.set(cacheKey, store[cacheKey]);
    return store[cacheKey];
  }

  let def = "";
  try {
    def = getWebDictionaryKey() ? await fetchMerriamWebster(clean) : "";
    if (!def) def = await fetchDatamuse(clean);
  } catch (err) {
    console.warn(`Definition lookup failed for "${clean}":`, err?.message);
    def = "";
  }

  // Final grade pass on anything that came from the web.
  def = def ? simplifyForGrade(def, grade) : "";

  memCache.set(cacheKey, def);
  store[cacheKey] = def;
  writeStore(store);
  return def;
}

/**
 * Fill definitions for the words that don't have one yet.
 *
 * Never overwrites an existing definition — a definition the parent has typed
 * or edited is theirs to keep. That is the "saved once, parent-editable,
 * never regenerate" rule.
 *
 * onProgress(done, total) is called as each word resolves.
 * Returns { filled, missing }.
 */
export async function fillMissingDefinitions(words, { grade = 2, onProgress, signal } = {}) {
  const targets = words.filter((w) => !String(w.kid_definition || "").trim());
  const results = new Map();
  let done = 0;

  for (const w of targets) {
    if (signal?.aborted) break;
    const word = w.word;

    // 1. Built-in kid-friendly dataset wins — it is already age-appropriate.
    let def = fallbackDefinition(word);

    // 2. Otherwise ask the web.
    if (!def) def = await fetchWebDefinition(word, { grade });

    if (def) results.set(w.id, def);
    done += 1;
    onProgress?.(done, targets.length);
  }

  const missing = targets.filter((w) => !results.has(w.id)).map((w) => w.word);
  return { results, filled: results.size, missing };
}

export function clearWebDefinitionCache() {
  memCache.clear();
  try {
    localStorage.removeItem(storeKey);
  } catch { /* private mode */ }
}
