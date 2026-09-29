// Seed dictionary built from the original Kingdom Spellers word lists.
// These become the initial `dictionary_words` rows in demo mode, so the
// app ships with real kid-friendly definitions out of the box.
// In Supabase mode these are upserted on first run (see backend.js).

import { firstGradeWords } from "../legacy/data/firstgradelist";
import { secondGradeWords } from "../legacy/data/secondgradelist";
import { normalizeWord } from "./utils";

function toEntries(source, grade) {
  return Object.entries(source).map(([word, definition]) => ({
    word,
    normalized_word: normalizeWord(word),
    definition,
    kid_definition: definition, // original lists are already kid-friendly
    example_sentence: "",
    part_of_speech: "",
    pronunciation: "",
    source: "dataset",
    grade,
  }));
}

export const seedDictionary = [
  ...toEntries(firstGradeWords, 1),
  ...toEntries(secondGradeWords, 2),
];

// A tiny built-in fallback dictionary for common words that parents are
// likely to type but that are not in the grade lists. Keeps the "add word"
// flow useful even before any network/dataset lookup.
export const fallbackDictionary = {
  apple: "a round fruit that grows on trees, often red or green",
  because: "for the reason that; since",
  friend: "someone you like and who likes you",
  school: "a place where children go to learn",
  beautiful: "very pretty; pleasing to look at or hear",
  yellow: "the color of the sun or a banana",
  fortunate: "having something good happen by luck or chance",
  family: "a group of people related to you, like parents and children",
  garden: "a place where flowers, plants, or vegetables are grown",
  mountain: "a very high hill, often with a rocky top",
};

export function fallbackDefinition(word) {
  return fallbackDictionary[normalizeWord(word)] || "";
}
