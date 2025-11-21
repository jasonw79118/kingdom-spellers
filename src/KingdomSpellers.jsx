import React, { useState, useEffect } from "react";
import firstGradeWords from "./data/firstgradelist";
import "./index.css";

// character images served from public/images
const characterImages = {
  esquire: {
    idle: "images/esquire_idle.png",
    dance: "images/esquire_cheer.png",
    cry: "images/esquire_cry.png",
  },
  knight: {
    idle: "images/knight_idle.png",
    dance: "images/knight_cheer.png",
    cry: "images/knight_cry.png",
  },
  king: {
    idle: "images/king_idle.png",
    dance: "images/king_cheer.png",
    cry: "images/king_cry.png",
  },
};

// 🔊 speak the word only
const speakWord = (text) => {
  if (!text || typeof window === "undefined" || !window.speechSynthesis) return;
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "en-US";
  utter.rate = 0.9;
  utter.pitch = 1.1;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utter);
};

// difficulty based on how many full cycles of the list are done
const getRevealPercentForCycle = (cycle) => {
  if (cycle === 0) return 0.75; // easy
  if (cycle === 1) return 0.5;  // normal
  if (cycle === 2) return 0.3;  // hard
  return 0.15;                  // bonkers
};

const allWords = Object.keys(firstGradeWords);

const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);

export default function KingdomSpellers() {
  const [xp, setXP] = useState(0);
  const [lives, setLives] = useState(3);
  const [cycle, setCycle] = useState(0);            // how many full passes through word list
  const [wordOrder, setWordOrder] = useState([]);   // current shuffled list of words
  const [wordIndex, setWordIndex] = useState(0);    // index within wordOrder

  const [currentWord, setCurrentWord] = useState("");
  const [maskedArray, setMaskedArray] = useState([]);
  const [letterTiles, setLetterTiles] = useState([]);
  const [definition, setDefinition] = useState("");
  const [feedback, setFeedback] = useState("");
  const [characterAction, setCharacterAction] = useState("idle"); // idle | dance | cry
  const [gameOver, setGameOver] = useState(false);

  // rank based on xp – character size fixed in CSS
  const rank =
    xp < 30 ? "esquire" :
    xp < 70 ? "knight" :
    "king";

  // set up a word: mask letters & create tiles with extra wrong letters
  const setupWord = (word, cycleValue) => {
    const revealPercent = getRevealPercentForCycle(cycleValue);
    const letters = word.split("");
    const revealCount = Math.max(1, Math.floor(letters.length * revealPercent));

    // choose indices to reveal
    const revealIndices = new Set();
    while (revealIndices.size < revealCount) {
      revealIndices.add(Math.floor(Math.random() * letters.length));
    }

    const masked = letters.map((letter, i) =>
      revealIndices.has(i) ? letter : "_"
    );

    // correct tiles (one per letter, with index-based IDs to support duplicates)
    const correctTiles = letters.map((letter, index) => ({
      id: `c-${letter}-${index}-${Math.random()}`,
      letter,
    }));

    // add at least 3 wrong-letter tiles
    const alphabet = "abcdefghijklmnopqrstuvwxyz".split("");
    const uniqueLettersInWord = [...new Set(letters)];
    const possibleWrongLetters = alphabet.filter(
      (ch) => !uniqueLettersInWord.includes(ch)
    );
    const wrongTiles = [];
    const wrongCount = 3; // at least 3 wrong choices

    for (let i = 0; i < wrongCount && possibleWrongLetters.length > 0; i++) {
      const rIndex = Math.floor(Math.random() * possibleWrongLetters.length);
      const wrongLetter = possibleWrongLetters.splice(rIndex, 1)[0];
      wrongTiles.push({
        id: `w-${wrongLetter}-${i}-${Math.random()}`,
        letter: wrongLetter,
      });
    }

    const allTiles = shuffle([...correctTiles, ...wrongTiles]);

    setCurrentWord(word);
    setMaskedArray(masked);
    setLetterTiles(allTiles);
    setDefinition(firstGradeWords[word] || "");
    setFeedback("");
    setCharacterAction("idle");
  };

  // initialize first cycle on mount
  useEffect(() => {
    const initialOrder = shuffle(allWords);
    setWordOrder(initialOrder);
    setCycle(0);
    setWordIndex(0);
    if (initialOrder.length > 0) {
      setupWord(initialOrder[0], 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // load next word, respecting cycles and difficulty progression
  const goToNextWord = () => {
    let nextCycle = cycle;
    let nextIndex = wordIndex + 1;
    let order = wordOrder;

    if (!order || order.length === 0) {
      order = shuffle(allWords);
      nextIndex = 0;
      nextCycle = 0;
    } else if (nextIndex >= order.length) {
      // finished one pass over all words → new cycle & reshuffle
      nextCycle = cycle + 1;
      order = shuffle(allWords);
      nextIndex = 0;
    }

    setWordOrder(order);
    setCycle(nextCycle);
    setWordIndex(nextIndex);

    const nextWord = order[nextIndex];
    setupWord(nextWord, nextCycle);
  };

  const handleLetterClick = (tile) => {
    if (gameOver) return;
    if (characterAction !== "idle") return;

    const firstBlankIndex = maskedArray.indexOf("_");
    if (firstBlankIndex === -1) return;

    const newMask = [...maskedArray];
    newMask[firstBlankIndex] = tile.letter;
    setMaskedArray(newMask);

    setLetterTiles((prev) => prev.filter((t) => t.id !== tile.id));

    if (newMask.includes("_")) {
      return; // not a full word yet
    }

    const formed = newMask.join("");

    if (formed === currentWord) {
      // correct
      setCharacterAction("dance");
      setFeedback("🎉 Correct!");
      speakWord(currentWord);
      setXP((prevXP) => prevXP + 10);

      setTimeout(() => {
        setCharacterAction("idle");
        goToNextWord();
      }, 1000);
    } else {
      // wrong full word
      setCharacterAction("cry");
      setFeedback("❌ Try again!");

      setLives((prevLives) => {
        const nextLives = prevLives - 1;
        if (nextLives <= 0) {
          setGameOver(true);
          speakWord("game over");
          return 0;
        } else {
          setTimeout(() => {
            setCharacterAction("idle");
            goToNextWord();
          }, 1000);
          return nextLives;
        }
      });
    }
  };

  const undoLast = () => {
    if (gameOver) return;
    if (characterAction !== "idle") return;

    let lastIndex = -1;
    for (let i = maskedArray.length - 1; i >= 0; i--) {
      if (maskedArray[i] !== "_") {
        lastIndex = i;
        break;
      }
    }
    if (lastIndex === -1) return;

    const letter = maskedArray[lastIndex];
    const newMask = [...maskedArray];
    newMask[lastIndex] = "_";
    setMaskedArray(newMask);

    setLetterTiles((prev) => [
      ...prev,
      { id: `undo-${letter}-${Math.random()}`, letter },
    ]);
  };

  const restart = () => {
    const newOrder = shuffle(allWords);
    setXP(0);
    setLives(3);
    setCycle(0);
    setWordOrder(newOrder);
    setWordIndex(0);
    setGameOver(false);
    setCharacterAction("idle");
    setFeedback("");
    if (newOrder.length > 0) {
      setupWord(newOrder[0], 0);
    }
  };

  return (
    <div className="ks-container">
      <h1 className="ks-title">🛡️ Kingdom Spellers</h1>

      {gameOver ? (
        <div className="game-over-box">
          <h2>Game Over!</h2>
          <p>Your hearts are gone. Want to try again?</p>
          <button className="restart-btn" onClick={restart}>
            Play Again
          </button>
        </div>
      ) : (
        <>
          <div className="hud">
            <div className="stat-box">⭐ XP: {xp}</div>
            <div className="stat-box">❤️ Lives: {lives}</div>
            <div className="stat-box">🛡 Rank: {rank}</div>
          </div>

          <img
            src={characterImages[rank][characterAction]}
            alt="character"
            className="character-img"
          />

          {/* word + speaker */}
          <div className="word-row">
            <div className="word-display">{maskedArray.join(" ")}</div>
            <button
              className="speaker-btn"
              onClick={() => speakWord(currentWord)}
              title="Hear the word"
            >
              🔊
            </button>
          </div>

          {/* definition (no background, no icon) */}
          <div className="definition-box">
            {definition}
          </div>

          {/* letter tiles */}
          <div className="tile-grid">
            {letterTiles.map((tile) => (
              <button
                key={tile.id}
                className="letter-tile"
                onClick={() => handleLetterClick(tile)}
              >
                {tile.letter}
              </button>
            ))}
          </div>

          {/* feedback & undo */}
          {feedback && <div className="feedback">{feedback}</div>}

          <button className="undo-btn" onClick={undoLast}>
            ⬅ Undo
          </button>
        </>
      )}
    </div>
  );
}
