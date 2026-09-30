// Quick sanity checks for the progression rules.
// Run with: node --experimental-vm-modules scripts/verify-game.mjs
import {
  scoreMastery, masteryLevel, buildPracticeSet, practiceWeight, needsPractice,
} from "../src/game/mastery.js";
import {
  RANKS, rankForProsperity, rankProgress, prosperityOf, goldForWord,
  KINGDOMS, TERRITORY_CLAIM_COST, REWARDS, PLOT, plotState, isRegionComplete,
  castleOf, castleBuilt,
} from "../src/game/kingdom.js";
import { buildPuzzle, trayLeak, shuffleTray } from "../src/game/practice.js";

let pass = 0, fail = 0;
const check = (name, cond) => {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fail++; console.log(`  FAIL ${name}`); }
};

console.log("\nmastery scoring");
check("no attempts = 0", scoreMastery({ attempts: 0 }) === 0);
check("all correct grows with attempts", scoreMastery({ attempts: 5, correct: 5, streak: 5 }) > 90);
check("all wrong scores low", scoreMastery({ attempts: 4, correct: 0, streak: 0 }) < 40);
check("miss penalty applies", scoreMastery({ attempts: 4, correct: 2, streak: 0 }) < scoreMastery({ attempts: 4, correct: 3, streak: 0 }));

console.log("\nmastery levels (spec: 1 correct != mastered)");
check("new word = new", masteryLevel({ attempts: 0 }) === "new");
check("one correct answer is NOT mastered", masteryLevel({ attempts: 1, correct: 1, streak: 1 }) !== "mastered");
check("one correct answer = learning", masteryLevel({ attempts: 1, correct: 1, streak: 1 }) === "learning");
check("high score but too few attempts = strong at most",
  masteryLevel({ attempts: 2, correct: 2, streak: 2 }) !== "mastered");
check("needs 4 attempts + 3 streak for mastered",
  masteryLevel({ attempts: 4, correct: 4, streak: 3 }) === "mastered");
check("lapsed streak blocks mastered",
  masteryLevel({ attempts: 6, correct: 5, streak: 0, score: 95 }) !== "mastered");

console.log("\npractice weighting");
const missed = practiceWeight({ attempts: 4, correct: 1, streak: 0, score: 30 });
const masteredW = practiceWeight({ attempts: 6, correct: 6, streak: 6, score: 96 });
check("missed word outranks mastered word", missed > masteredW);
check("new word has high priority", practiceWeight({ attempts: 0 }) >= 5);

console.log("\nadaptive set selection");
const words = Array.from({ length: 30 }, (_, i) => ({ word: `w${i}`, normalized_word: `w${i}` }));
const mastery = {};
words.forEach((w, i) => {
  mastery[w.normalized_word] = i < 5
    ? { attempts: 5, correct: 1, streak: 0, mastery_score: 25 }     // weak
    : { attempts: 5, correct: 5, streak: 5, mastery_score: 97 };   // mastered
});
const set = buildPracticeSet(words, mastery, { size: 10 });
const weakHit = set.filter((w) => Number(w.normalized_word.slice(1)) < 5).length;
check("set is the requested size", set.length === 10, );
check("weak words are prioritised (>=4 of 5 weak)", weakHit >= 4);
check("no duplicates in set", new Set(set.map((w) => w.word)).size === set.length);

console.log("\nletter tray order (the tray must never spell the word)");
{
  const runs = 400;
  // The letters the child still has to find, i.e. the ones in the tray.
  const needOf = (puzzle, word) => word.split("").filter((_, i) => puzzle.answer[i] === "");
  const trayOf = (puzzle) => puzzle.tiles.map((t) => t.char);
  // Includes alphabetically-ordered and palindromic words, which is where a
  // plain sort or reverse used to leave the answer sitting in order.
  const words = [
    "ant", "cat", "sun", "top", "on", "of", "it", "almost", "noon", "ewe",
    "level", "abba", "banana", "letter", "queue", "apple", "school", "because",
    "friend", "spelling",
  ];

  let hardLeaks = 0;
  let hardSpelled = 0;
  for (const w of words) {
    for (let n = 0; n < runs; n += 1) {
      const p = buildPuzzle(w, 0);
      const leak = trayLeak(trayOf(p), needOf(p, w));
      if (leak === 3) hardSpelled += 1;
      if (leak !== 0) hardLeaks += 1;
    }
  }
  check("practice/test tiles never read as the word", hardSpelled === 0 && hardLeaks === 0);

  // Hint levels leave fewer letters in the tray, and which ones is itself
  // random, so a word can come back with several copies of a single letter
  // ("noon" -> n, n). There is no order to hide in that case — reversed "ee" is
  // still "ee" — but it must still not read as the word, and must be clean
  // whenever the remaining letters differ.
  let hintSpelled = 0;
  let hintLeaks = 0;
  let hintCases = 0;
  for (const w of words) {
    for (const h of [1, 2]) {
      if (needOf(buildPuzzle(w, h), w).length < 2) continue;
      hintCases += 1;
      for (let n = 0; n < runs; n += 1) {
        const p = buildPuzzle(w, h);
        const need = needOf(p, w);
        const leak = trayLeak(trayOf(p), need);
        if (leak === 3) hintSpelled += 1;
        if (leak !== 0 && new Set(need).size > 1) hintLeaks += 1;
      }
    }
  }
  check("hinted tiles never read as the word either", hintSpelled === 0 && hintCases > 0);
  check("hinted tiles only stay in order when the letters are identical", hintLeaks === 0);

  // A rigged RNG turns every shuffle into the same order, which is the case a
  // plain shuffle has no defence against.
  let riggedLeaks = 0;
  for (const v of [0, 0.25, 0.5, 0.75, 0.999]) {
    for (const w of words) {
      const p = buildPuzzle(w, 0, () => v);
      if (trayLeak(trayOf(p), needOf(p, w)) !== 0) riggedLeaks += 1;
    }
  }
  check("a rigged RNG still cannot spell the word", riggedLeaks === 0);

  // Scrambling must not lose, duplicate or invent a tile.
  let intact = true;
  for (const w of words) {
    for (const h of [0, 1, 2]) {
      const p = buildPuzzle(w, h);
      const wordLetters = new Set(w);
      const counts = {};
      trayOf(p).forEach((c) => { counts[c] = (counts[c] || 0) + 1; });
      // every letter still needed is there, the right number of times
      needOf(p, w).forEach((c) => { if (!counts[c]) intact = false; counts[c] -= 1; });
      // and whatever is left over is a letter the word never uses
      Object.entries(counts).forEach(([c, n]) => { if (n > 0 && wordLetters.has(c)) intact = false; });
    }
  }
  check("scambling keeps every needed letter exactly once", intact);

  // Distractors must be letters the word doesn't use, or the tray's scattered
  // look (and the repair in shuffleTray) breaks.
  const hinted = buildPuzzle("cat", 2);
  const catLetters = new Set("cat");
  check("distractors never repeat a letter of the word",
    hinted.tiles.map((t) => t.char).filter((c) => catLetters.has(c)).length === 2);
  check("easier modes add distractors", hinted.tiles.length > 3);
  check("hard mode adds no distractors", buildPuzzle("cat", 0).tiles.length === 3);

  check("a one-letter word is a legal tray (no order to hide)",
    shuffleTray(["a"], ["q", "z"], () => 0).length === 3);
}

console.log("\nranks");
check("prosperity 0 = Esquire", rankForProsperity(0).title === "Esquire");
check("prosperity 200 = Knight", rankForProsperity(200).title === "Knight");
check("girl at top rank = Queen", rankForProsperity(99999, "girl").title === "Queen");
check("boy at top rank = King", rankForProsperity(99999, "boy").title === "King");
check("rank progress reaches 100 at max", rankProgress(99999).percent === 100);
check("rank progress is sane mid-way", rankProgress(75).percent === 50);

console.log("\nprosperity + economy");
const allIds = KINGDOMS.flatMap((k) => k.buildings.map((b) => b.id));
const totalProsperity = prosperityOf(allIds);
const topRank = RANKS[RANKS.length - 1].min;
check("empty kingdom = 0 prosperity", prosperityOf([]) === 0);
check("full build outranks the top rank", totalProsperity > topRank);
check("top rank is reachable mid-game (not only at 100%)", totalProsperity > topRank * 2);
check("first kingdom alone takes you past Esquire", prosperityOf(KINGDOMS[0].buildings.map(b => b.id)) > RANKS[1].min);
check("hard mode pays more than easy", goldForWord({ difficulty: "hard" }) > goldForWord({ difficulty: "easy" }));
check("streak increases pay", goldForWord({ streak: 4 }) > goldForWord({ streak: 0 }));
check("territory costs increase", TERRITORY_CLAIM_COST.every((c, i, a) => i === 0 || c > a[i - 1]));
check("every kingdom is worth building", KINGDOMS.every((k) =>
  k.buildings.reduce((s, b) => s + b.prosperity, 0) / k.buildings.reduce((s, b) => s + b.cost, 0) > 0.5
));
check("a perfect record reaches 100", scoreMastery({ attempts: 5, correct: 5, streak: 5 }) === 100);

console.log("\ntests pay nothing");
check("Royal Test gives 0 gold", goldForWord({ isTest: true }) === 0);
check("Royal Test pays 0 regardless of difficulty/streak",
  goldForWord({ isTest: true, difficulty: "hard", streak: 20 }) === 0);
check("test XP is zero", REWARDS.testXp === 0 && REWARDS.testGold === 0);
check("practice still pays", goldForWord({}) > 0);

console.log("\nplots, clearing and castles");
check("unknown plot is wild land", plotState({}, "anything") === PLOT.WILD);
check("old boolean true migrates to built", plotState({ cottage: true }, "cottage") === PLOT.BUILT);
check("cleared state round-trips", plotState({ cottage: PLOT.CLEARED }, "cottage") === PLOT.CLEARED);
check("every territory has exactly one castle",
  KINGDOMS.every((k) => k.buildings.filter((b) => b.castle).length === 1));
check("the castle is the most expensive building in its territory",
  KINGDOMS.every((k) => {
    const c = castleOf(k);
    return k.buildings.every((b) => b.cost <= c.cost);
  }));
check("every plot can be cleared for less than it costs to build",
  KINGDOMS.every((k) => k.buildings.every((b) => b.clearCost > 0 && b.clearCost < b.cost)));
check("region is not complete while any plot is still wild", (() => {
  const k = KINGDOMS[0];
  const all = {};
  for (const b of k.buildings) all[b.id] = PLOT.BUILT;
  // leave one ordinary plot unbuilt, but keep the castle raised
  all[k.buildings[0].id] = PLOT.WILD;
  return isRegionComplete(all, k) === false;
})());
check("cleared-but-unbuilt plots do not count as complete", (() => {
  const k = KINGDOMS[0];
  const all = {};
  for (const b of k.buildings) all[b.id] = PLOT.BUILT;
  all[k.buildings[0].id] = PLOT.CLEARED;
  return isRegionComplete(all, k) === false;
})());
check("castle alone is a milestone, not full completion", (() => {
  const k = KINGDOMS[0];
  const only = { [castleOf(k).id]: PLOT.BUILT };
  return castleBuilt(only, k) === true && isRegionComplete(only, k) === false;
})());
check("region is complete only when everything is built", (() => {
  const k = KINGDOMS[0];
  const all = {};
  for (const b of k.buildings) all[b.id] = PLOT.BUILT;
  return isRegionComplete(all, k) === true && castleBuilt(all, k) === true;
})());
check("clearing a plot yields no prosperity", (() => {
  const k = KINGDOMS[0];
  const p = {};
  for (const b of k.buildings) p[b.id] = PLOT.CLEARED;
  return prosperityOf(Object.entries(p).filter(([, v]) => v === PLOT.BUILT).map(([k2]) => k2)) === 0;
})());

console.log("\nprogress report helpers");
const recs = [
  { word: "because", attempts: 8, correct_attempts: 5, incorrect_attempts: 3, mastery_score: 62 },
  { word: "friend", attempts: 6, correct_attempts: 4, incorrect_attempts: 2, mastery_score: 68 },
  { word: "school", attempts: 5, correct_attempts: 5, incorrect_attempts: 0, mastery_score: 96 },
];
const np = needsPractice(recs);
check("needsPractice finds weak words", np.length === 2 && np[0].word === "because");
check("needsPractice sorts worst first", np[0].accuracy < np[1].accuracy);

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
