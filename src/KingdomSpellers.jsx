import React, { useEffect, useState } from "react";
import { firstGradeWords } from "./data/firstgradelist";
import { secondGradeWords } from "./data/secondgradelist";

const imageBase = process.env.PUBLIC_URL + "/images";

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
const EXTRA_WRONG_BY_LEVEL = { 1: 3, 2: 5, 3: 7, 4: 7 };

const MAX_LEVEL = 4;
const XP_PER_WORD = 10;

const CORRECT_DELAY_MS = 1000; // kid can see reaction
const WRONG_DELAY_MS = 700;

function shuffleArray(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// level fill amounts
function getFillFraction(level) {
  if (level <= 1) return 0.75;
  if (level === 2) return 0.5;
  if (level === 3) return 0.25;
  return 0;
}

export default function KingdomSpellers() {
  const [grade, setGrade] = useState(1); // 1 or 2

  const [xp, setXp] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);

  const [shuffledWords, setShuffledWords] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [currentWord, setCurrentWord] = useState("");
  const [currentDefinition, setCurrentDefinition] = useState("");

  const [currentAnswer, setCurrentAnswer] = useState([]);
  const [tiles, setTiles] = useState([]);

  const [pose, setPose] = useState("idle");
  const [form, setForm] = useState("esquire");

  const [gameOver, setGameOver] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [wordCompletedThisTurn, setWordCompletedThisTurn] = useState(false);

  // pick bank
  const wordBank = grade === 1 ? firstGradeWords : secondGradeWords;

  // character evolution
  useEffect(() => {
    if (xp < 150) setForm("esquire");
    else if (xp < 300) setForm("knight");
    else setForm("king");
  }, [xp]);

  // shuffle words on mount AND whenever grade changes
  useEffect(() => {
    const words = Object.keys(wordBank);
    const shuffled = shuffleArray(words);

    setShuffledWords(shuffled);
    setCurrentIndex(0);

    // restart difficulty/lives for new grade (keeps it kid-friendly)
    setLevel(1);
    setLives(3);
    setXp(0);

    setGameOver(false);
    setIsLocked(false);
    setPose("idle");
  }, [grade]); // only grade, so no ESLint hook warnings

  // setup the current word whenever index/level/list changes
  useEffect(() => {
    if (!shuffledWords.length) return;
    if (currentIndex < 0 || currentIndex >= shuffledWords.length) return;

    const word = shuffledWords[currentIndex];
    const def = wordBank[word] || "a word to learn";

    setCurrentWord(word);
    setCurrentDefinition(def);
    setPose("idle");
    setWordCompletedThisTurn(false);

    const letters = word.split("");

    // pre-fill indices by difficulty
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
    setCurrentAnswer(initialAnswer);

    // tiles contain only the letters that are NOT pre-filled
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
      id: `${word}-${idx}-${ch}-${Math.random().toString(36).slice(2, 6)}`,
      char: ch,
      used: false,
      slotIndex: null,
    }));

    setTiles(shuffledTiles);
  }, [shuffledWords, currentIndex, level, grade]); // grade ensures bank is correct

  function handleSpeak() {
    if (!currentWord) return;
    const utterance = new SpeechSynthesisUtterance(currentWord);
    utterance.lang = "en-US";
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  function handleLetterClick(index) {
    if (gameOver || isLocked || !currentWord) return;

    const tile = tiles[index];
    if (!tile) return;

    const tilesCopy = tiles.map((t) => ({ ...t }));
    const answerCopy = [...currentAnswer];

    // toggle off
    if (tile.used) {
      if (tile.slotIndex !== null) answerCopy[tile.slotIndex] = "";
      tilesCopy[index] = { ...tile, used: false, slotIndex: null };
      setTiles(tilesCopy);
      setCurrentAnswer(answerCopy);
      return;
    }

    // place into first blank
    const emptyIndex = answerCopy.findIndex((ch) => ch === "");
    if (emptyIndex === -1) return;

    answerCopy[emptyIndex] = tile.char;
    tilesCopy[index] = { ...tile, used: true, slotIndex: emptyIndex };

    setTiles(tilesCopy);
    setCurrentAnswer(answerCopy);

    // check when full
    if (!answerCopy.includes("") && !wordCompletedThisTurn) {
      const guess = answerCopy.join("");
      if (guess === currentWord) handleCorrect();
      else handleWrong();
    }
  }

  function handleCorrect() {
    setWordCompletedThisTurn(true);
    setPose("cheer");
    setXp((prev) => prev + XP_PER_WORD);
    setIsLocked(true);

    setTimeout(() => {
      goToNextWord();
    }, CORRECT_DELAY_MS);
  }

  function handleWrong() {
    setPose("cry");
    setIsLocked(true);

    setLives((prev) => {
      const next = prev - 1;
      if (next <= 0) {
        setGameOver(true);
        return 0;
      }
      return next;
    });

    setTimeout(() => {
      if (!gameOver) {
        setIsLocked(false);
        setPose("idle");
        setCurrentAnswer((prev) => prev.map((ch) => (ch ? ch : ""))); // keep prefilled letters
        setTiles((prevTiles) =>
          prevTiles.map((t) => ({ ...t, used: false, slotIndex: null }))
        );
      }
    }, WRONG_DELAY_MS);
  }

  function goToNextWord() {
    if (!shuffledWords.length) return;

    if (currentIndex === shuffledWords.length - 1) {
      const words = Object.keys(wordBank);
      const reshuffled = shuffleArray(words);
      setShuffledWords(reshuffled);
      setCurrentIndex(0);
      setIsLocked(false);

      setLevel((prev) => (prev < MAX_LEVEL ? prev + 1 : prev));
    } else {
      setCurrentIndex((prev) => prev + 1);
      setIsLocked(false);
    }
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
