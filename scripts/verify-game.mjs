// Quick sanity checks for the progression rules.
// Run with: node --experimental-vm-modules scripts/verify-game.mjs
import {
  scoreMastery, masteryLevel, buildPracticeSet, practiceWeight, needsPractice,
} from "../src/game/mastery.js";
import {
  RANKS, rankForProsperity, rankProgress, prosperityOf, goldForWord, KINGDOMS, TERRITORY_CLAIM_COST,
} from "../src/game/kingdom.js";

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
check("test mode pays more", goldForWord({ isTest: true }) > goldForWord({}));
check("streak increases pay", goldForWord({ streak: 4 }) > goldForWord({ streak: 0 }));
check("territory costs increase", TERRITORY_CLAIM_COST.every((c, i, a) => i === 0 || c > a[i - 1]));
check("every kingdom is worth building", KINGDOMS.every((k) =>
  k.buildings.reduce((s, b) => s + b.prosperity, 0) / k.buildings.reduce((s, b) => s + b.cost, 0) > 0.5
));
check("a perfect record reaches 100", scoreMastery({ attempts: 5, correct: 5, streak: 5 }) === 100);

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
