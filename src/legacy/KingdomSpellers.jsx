// src/KingdomSpellers.jsx
import React, { useEffect, useRef, useState } from "react";
import { firstGradeWords } from "./data/firstgradelist";
import { secondGradeWords } from "./data/secondgradelist";

const imageBase = import.meta.env.BASE_URL + "images";

const characters = {
  esquire: {
    idle: `${imageBase}/esquire_idle.png`,
    cheer: `${imageBase}/esquire_cheer.png`,
    cry: `${imageBase}/esquire_cry.png`,
  },
  knight: {
    idle: `${imageBase}/knight_idle.png`,
    cheer: `${imageBase}/knight_cheer.png`,
    cry: `${imageBase}/knight_cry.png`,
  },
  king: {
    idle: `${imageBase}/king_idle.png`,
    cheer: `${imageBase}/king_cheer.png`,
    cry: `${imageBase}/king_cry.png`,
  },
};

const alphabet = "abcdefghijklmnopqrstuvwxyz";

// wrong letters per level
const EXTRA_WRONG_BY_LEVEL = {
  1: 3,
  2: 5,
  3: 7,
  4: 7,
};

// level fill amounts:
// 1 => 75% filled, 2 => 50%, 3 => 25%, 4 => 0%
const MAX_LEVEL = 4;

const XP_PER_WORD = 10;
const CORRECT_DELAY_MS = 1000; // show reaction longer
const WRONG_DELAY_MS = 700;

function shuffleArray(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function getFillFraction(level) {
  if (level <= 1) return 0.75;
  if (level === 2) return 0.5;
  if (level === 3) return 0.25;
  return 0;
}

// ✅ Prefer a guy's voice (iPhone-safe).
// Note: iOS Safari does not expose "Siri voice setting" directly,
// but we can prefer male-sounding voices when available.
function pickBestMaleVoice() {
  const voices = window.speechSynthesis?.getVoices?.() || [];
  if (!voices.length) return null;

  // Prefer en-US first, then any English.
  const enUS = voices.filter((v) =>
    (v.lang || "").toLowerCase().includes("en-us")
  );
  const enAny = voices.filter((v) =>
    (v.lang || "").toLowerCase().startsWith("en")
  );
  const pool = enUS.length ? enUS : enAny.length ? enAny : voices;

  // Common male voice names across Apple/other platforms
  const maleNamePriority = [
    "alex", // common Apple male voice
    "aaron", // sometimes present
    "fred",
    "daniel",
    "tom",
    "microsoft david",
    "google uk english male",
    "english (united states) male",
  ];

  for (const name of maleNamePriority) {
    const found = pool.find((v) =>
      (v.name || "").toLowerCase().includes(name)
    );
    if (found) return found;
  }

  // Last resort: any en-US voice
  return pool[0] || null;
}

export default function KingdomSpellers() {
  // grade toggle
  const [grade, setGrade] = useState(1); // 1 or 2

  const [xp, setXp] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);

  const [shuffledWords, setShuffledWords] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [currentWord, setCurrentWord] = useState("");
  const [currentDefinition, setCurrentDefinition] = useState("");

  const [currentAnswer, setCurrentAnswer] = useState([]); // letters or ""
  const [prefilledMask, setPrefilledMask] = useState([]); // true where prefilled
  const [tiles, setTiles] = useState([]); // { id, char, used, slotIndex }

  const [pose, setPose] = useState("idle"); // idle | cheer | cry
  const [form, setForm] = useState("esquire"); // esquire | knight | king

  const [gameOver, setGameOver] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [wordCompletedThisTurn, setWordCompletedThisTurn] = useState(false);

  // ✅ Guards to prevent double-trigger glitches (rapid taps / async setState)
  const immediateLockRef = useRef(false);
  const completionGuardRef = useRef(false);

  // ✅ Cache the chosen male voice (once voices are available)
  const cachedMaleVoiceRef = useRef(null);

  // bank
  const wordBank = grade === 1 ? firstGradeWords : secondGradeWords;

  // voice loading (important on iOS)
  useEffect(() => {
    const synth = window.speechSynthesis;
    if (!synth) return;

    const loadVoices = () => synth.getVoices();
    synth.addEventListener("voiceschanged", loadVoices);
    loadVoices();

    return () => synth.removeEventListener("voiceschanged", loadVoices);
  }, []);

  // keep lock ref aligned with state as a backup
  useEffect(() => {
    immediateLockRef.current = isLocked;
  }, [isLocked]);

  // pick character form from xp
  useEffect(() => {
    if (xp < 150) setForm("esquire");
    else if (xp < 300) setForm("knight");
    else setForm("king");
  }, [xp]);

  // shuffle/reset when grade changes
  useEffect(() => {
    const words = Object.keys(wordBank);
    const shuffled = shuffleArray(words);
    setShuffledWords(shuffled);
    setCurrentIndex(0);

    // friendly reset when switching grades
    setLevel(1);
    setLives(3);
    setXp(0);

    setGameOver(false);
    setIsLocked(false);
    immediateLockRef.current = false;
    completionGuardRef.current = false;

    // reset voice cache (optional: keep consistent per session, but safer on grade switch)
    cachedMaleVoiceRef.current = null;

    setPose("idle");
  }, [grade]); // eslint-safe (only grade)

  // setup current word whenever index/level/list changes
  useEffect(() => {
    if (!shuffledWords.length) return;
    if (currentIndex < 0 || currentIndex >= shuffledWords.length) return;

    const word = (shuffledWords[currentIndex] || "").toLowerCase();
    const def =
      wordBank[word] ||
      wordBank[word.toLowerCase()] ||
      "a word to learn";

    setCurrentWord(word);
    setCurrentDefinition(def);
    setPose("idle");
    setWordCompletedThisTurn(false);

    // ✅ reset completion guard for the new word/attempt
    completionGuardRef.current = false;

    const letters = word.split("");

    // prefill indices by difficulty
    const fillFraction = getFillFraction(level);
    let numPrefill = Math.floor(letters.length * fillFraction);
    if (numPrefill >= letters.length) numPrefill = letters.length - 1;
    if (numPrefill < 0) numPrefill = 0;

    const indices = Array.from({ length: letters.length }, (_, i) => i);
    const shuffledIdx = shuffleArray(indices);
    const prefillIndices = new Set(shuffledIdx.slice(0, numPrefill));

    const initialAnswer = letters.map((ch, idx) =>
      prefillIndices.has(idx) ? ch : ""
    );
    const mask = letters.map((_, idx) => prefillIndices.has(idx));

    setCurrentAnswer(initialAnswer);
    setPrefilledMask(mask);

    // tiles contain only letters NOT prefilled (includes duplicates!)
    const wordLettersForTiles = [];
    for (let i = 0; i < letters.length; i += 1) {
      if (!prefillIndices.has(i)) wordLettersForTiles.push(letters[i]);
    }

    const extraWrongCount =
      EXTRA_WRONG_BY_LEVEL[level] ?? EXTRA_WRONG_BY_LEVEL[MAX_LEVEL];

    const wrongLetters = [];
    while (wrongLetters.length < extraWrongCount) {
      const c = alphabet[Math.floor(Math.random() * alphabet.length)];
      if (!word.includes(c) && !wrongLetters.includes(c)) wrongLetters.push(c);
    }

    const pool = [...wordLettersForTiles, ...wrongLetters];
    const shuffledTiles = shuffleArray(pool).map((ch, idx) => ({
      id: `${word}-${idx}-${ch}-${Math.random().toString(36).slice(2, 7)}`,
      char: ch,
      used: false,
      slotIndex: null,
    }));

    setTiles(shuffledTiles);
  }, [shuffledWords, currentIndex, level, grade, wordBank]);

  // ✅ Updated speak: prefer a guy's voice, iPhone-safe voice loading
  function handleSpeak() {
    if (!currentWord) return;

    const synth = window.speechSynthesis;
    if (!synth) return;

    // Always stop anything already speaking (prevents queue overlap)
    synth.cancel();

    const speakNow = () => {
      const utterance = new SpeechSynthesisUtterance(currentWord);

      // Prefer a male voice when available (cached for consistency)
      if (!cachedMaleVoiceRef.current) {
        cachedMaleVoiceRef.current = pickBestMaleVoice();
      }
      if (cachedMaleVoiceRef.current) {
        utterance.voice = cachedMaleVoiceRef.current;
      }

      utterance.lang = "en-US";

      // Natural pacing; slightly lower pitch helps male voice feel more natural
      utterance.rate = 1.0;
      utterance.pitch = 0.95;
      utterance.volume = 1;

      // small delay helps iOS after cancel()
      setTimeout(() => {
        try {
          synth.speak(utterance);
        } catch (e) {
          // fail silently on iOS restrictions
        }
      }, 20);
    };

    // iOS/Safari sometimes has 0 voices until later
    const voices = synth.getVoices?.() || [];
    if (voices.length) {
      speakNow();
      return;
    }

    const onVoices = () => {
      synth.removeEventListener("voiceschanged", onVoices);
      // voices available now; clear cache so we can pick best male
      cachedMaleVoiceRef.current = null;
      speakNow();
    };

    synth.addEventListener("voiceschanged", onVoices);

    // fallback: try anyway shortly
    setTimeout(() => {
      synth.removeEventListener("voiceschanged", onVoices);
      // still try; iOS may speak even if voices list is empty
      speakNow();
    }, 300);
  }

  function handleLetterClick(index) {
    // ✅ use immediate ref lock to avoid async-state race (double-tap / rapid clicks)
    if (gameOver || immediateLockRef.current || !currentWord) return;

    const tile = tiles[index];
    if (!tile) return;

    const tilesCopy = tiles.map((t) => ({ ...t }));
    const answerCopy = [...currentAnswer];

    // toggle OFF (unselect)
    if (tile.used) {
      if (tile.slotIndex !== null) answerCopy[tile.slotIndex] = "";
      tilesCopy[index] = { ...tile, used: false, slotIndex: null };

      setTiles(tilesCopy);
      setCurrentAnswer(answerCopy);

      // ✅ once user changes letters, allow future completion check again
      completionGuardRef.current = false;
      return;
    }

    // select first blank
    const emptyIndex = answerCopy.findIndex((ch) => ch === "");
    if (emptyIndex === -1) return;

    answerCopy[emptyIndex] = tile.char;
    tilesCopy[index] = { ...tile, used: true, slotIndex: emptyIndex };

    setTiles(tilesCopy);
    setCurrentAnswer(answerCopy);

    // check when filled
    // ✅ guard prevents double-trigger when React batches state updates or user double-taps
    if (
      !answerCopy.includes("") &&
      !wordCompletedThisTurn &&
      !completionGuardRef.current
    ) {
      completionGuardRef.current = true;

      const guess = answerCopy.join("");
      if (guess === currentWord) handleCorrect();
      else handleWrong();
    }
  }

  function handleCorrect() {
    setWordCompletedThisTurn(true);
    setPose("cheer");
    setXp((prev) => prev + XP_PER_WORD);

    // ✅ lock immediately (ref) + state
    immediateLockRef.current = true;
    setIsLocked(true);

    setTimeout(() => {
      goToNextWord();
    }, CORRECT_DELAY_MS);
  }

  function handleWrong() {
    // ✅ lock immediately (ref) + state
    immediateLockRef.current = true;
    setIsLocked(true);

    setPose("cry");

    setLives((prev) => {
      const next = prev - 1;
      if (next <= 0) {
        setGameOver(true);
        return 0;
      }
      return next;
    });

    setTimeout(() => {
      // ✅ allow the SAME word to be tried again (guard reset)
      completionGuardRef.current = false;

      immediateLockRef.current = false;
      setIsLocked(false);
      setPose("idle");

      setCurrentAnswer((prevAns) =>
        prevAns.map((ch, i) => (prefilledMask[i] ? ch : ""))
      );

      setTiles((prevTiles) =>
        prevTiles.map((t) => ({ ...t, used: false, slotIndex: null }))
      );
    }, WRONG_DELAY_MS);
  }

  function goToNextWord() {
    if (!shuffledWords.length) {
      immediateLockRef.current = false;
      setIsLocked(false);
      return;
    }

    // cycle complete => reshuffle and increase level (up to MAX_LEVEL)
    if (currentIndex >= shuffledWords.length - 1) {
      const words = Object.keys(wordBank);
      const reshuffled = shuffleArray(words);
      setShuffledWords(reshuffled);
      setCurrentIndex(0);
      setLevel((prev) => (prev < MAX_LEVEL ? prev + 1 : prev));

      // ✅ unlock and reset completion guard for next word
      completionGuardRef.current = false;
      immediateLockRef.current = false;
      setIsLocked(false);
      return;
    }

    // normal next
    setCurrentIndex((prev) => prev + 1);

    // ✅ unlock and reset completion guard for next word
    completionGuardRef.current = false;
    immediateLockRef.current = false;
    setIsLocked(false);
  }

  function handleRestart() {
    const words = Object.keys(wordBank);
    const reshuffled = shuffleArray(words);

    setShuffledWords(reshuffled);
    setCurrentIndex(0);
    setLevel(1);
    setLives(3);
    setXp(0);

    setGameOver(false);

    completionGuardRef.current = false;
    immediateLockRef.current = false;

    setIsLocked(false);
    setPose("idle");
  }

  const characterSrc = characters[form]?.[pose] || characters.esquire.idle;

  return (
    <div className="ks-app">
      <div className="ks-shell">
        <header className="ks-header">
          <h1 className="ks-title">
            <span role="img" aria-label="crown">
              👑
            </span>{" "}
            kingdom spellers
          </h1>

          <div className="ks-status-row">
            <span className="ks-status">grade: {grade}</span>
            <span className="ks-status">xp: {xp}</span>
            <span className="ks-status">
              <span role="img" aria-label="heart">
                ❤️
              </span>{" "}
              lives: {lives}
            </span>
          </div>

          <div className="ks-status-row" style={{ marginTop: 8 }}>
            <button
              type="button"
              className="ks-audio-button"
              onClick={() => setGrade((g) => (g === 1 ? 2 : 1))}
            >
              switch to {grade === 1 ? "2nd" : "1st"} grade
            </button>
          </div>
        </header>

        <main className="ks-main">
          <div className="ks-character-wrap">
            <img src={characterSrc} alt="character" className="ks-character" />
          </div>

          <section className="ks-word-panel">
            <div className="ks-audio-word-row">
              <button
                type="button"
                className="ks-audio-button"
                onClick={handleSpeak}
              >
                🔊
              </button>

              <div className="ks-word-blanks">
                {currentAnswer.map((ch, idx) => (
                  <span key={`${idx}-${currentWord}`} className="ks-blank">
                    {ch || "_"}
                  </span>
                ))}
              </div>
            </div>

            <p className="ks-definition">clue: {currentDefinition}</p>
          </section>

          <section className="ks-tiles-row">
            {tiles.map((tile, idx) => (
              <button
                key={tile.id}
                className={`ks-tile ${tile.used ? "ks-tile-used" : ""}`}
                onClick={() => handleLetterClick(idx)}
                type="button"
              >
                {tile.char}
              </button>
            ))}
          </section>

          {gameOver && (
            <div className="ks-overlay">
              <div className="ks-overlay-card">
                <h2>game over</h2>
                <p>you used all your lives. want to try again?</p>
                <button
                  type="button"
                  className="ks-restart-button"
                  onClick={handleRestart}
                >
                  play again
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
