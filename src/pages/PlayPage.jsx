// Play — the practice screen a child uses.
//
// Loads the player's selected list, builds an adaptive practice set from the
// mastery store, runs the session, and writes attempts + rewards back.

import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { backend } from "../lib/backend";
import Avatar from "../components/Avatar";
import { buildPracticeSet, masteryLevel } from "../game/mastery";
import { createSession, buildPuzzle, gradeAnswer, advanceSession, sessionSummary, MODES } from "../game/practice";
import { goldForWord } from "../game/kingdom";
import { speakWord, speakSlow, stopSpeaking } from "../lib/speech";
import { normalizeWord, shuffleArray } from "../lib/utils";

export default function PlayPage() {
  const { playerId } = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const statePlayerId = playerId || location.state?.playerId;

  const [player, setPlayer] = useState(null);
  const [lists, setLists] = useState([]);
  const [listId, setListId] = useState(null);
  const [setupMode, setSetupMode] = useState("practice");
  const [session, setSession] = useState(null);
  const [puzzle, setPuzzle] = useState(null);
  const [answer, setAnswer] = useState([]);
  const [feedback, setFeedback] = useState(null); // { correct, wrongIndex }
  const [locked, setLocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reward, setReward] = useState(null);
  const [earnedGold, setEarnedGold] = useState(0);
  const [earnedXp, setEarnedXp] = useState(0);
  const lockRef = useRef(false);
  // Authoritative (non-stale) answer/tiles so rapid clicks can't overwrite
  // each other before React re-renders.
  const answerRef = useRef([]);
  const tilesRef = useRef([]);
  const wordRef = useRef("");

  // --- load player + lists -------------------------------------------------
  useEffect(() => {
    let active = true;
    (async () => {
      if (!statePlayerId) { setLoading(false); return; }
      try {
        const [profiles, allLists] = await Promise.all([
          backend.profiles.list(),
          backend.lists.list(statePlayerId),
        ]);
        if (!active) return;
        const p = profiles.find((x) => x.id === statePlayerId);
        setPlayer(p || null);
        setLists(allLists);
        if (allLists.length) setListId(allLists[0].id);
      } catch (err) {
        console.error(err);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [statePlayerId]);

  // --- start a session -----------------------------------------------------
  const start = useCallback(async (mode = "practice") => {
    if (!player || !listId) return;
    setLoading(true);
    try {
      const allLists = await backend.lists.list(player.id);
      const list = allLists.find((l) => l.id === listId) || allLists[0];
      if (!list || !list.words?.length) return;

      const records = await backend.mastery.list(player.id);
      const byWord = {};
      for (const r of records) byWord[normalizeWord(r.word)] = r;

      const isTest = mode === "test";
      const size = Math.min(isTest ? list.words.length : 10, list.words.length);
      const chosen = isTest
        ? shuffleArray(list.words)
        : buildPracticeSet(list.words, byWord, { size });

      const s = createSession(chosen, {
        mode: isTest ? "test" : "solo",
        difficulty: player.difficulty,
        size,
      });
      setSession(s);
      // createSession preserves the caller's order — use the session's own
      // first word so the puzzle always matches what's displayed.
      const firstPuzzle = buildPuzzle(s.words[0].word, s.hintLevel);
      wordRef.current = s.words[0].word;
      answerRef.current = firstPuzzle.answer;
      tilesRef.current = firstPuzzle.tiles;
      setPuzzle(firstPuzzle);
      setAnswer(firstPuzzle.answer);
      setFeedback(null);
      setLocked(false);
      setEarnedGold(0);
      setEarnedXp(0);
      setReward(null);
      lockRef.current = false;
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [player, listId]);

  // --- answer interaction --------------------------------------------------
  const currentWord = session?.words[session.index];

  const placeTile = (tileIdx) => {
    if (lockRef.current || !puzzle || !currentWord) return;
    const tile = tilesRef.current[tileIdx];
    if (!tile || tile.used) return;

    const nextAnswer = [...answerRef.current];
    const empty = nextAnswer.findIndex((c) => c === "");
    if (empty === -1) return;

    const nextTiles = tilesRef.current.map((t, i) =>
      i === tileIdx ? { ...t, used: true, slot: empty } : t
    );
    nextAnswer[empty] = tile.char;

    // Commit to the refs first so consecutive clicks see fresh state.
    answerRef.current = nextAnswer;
    tilesRef.current = nextTiles;
    setPuzzle({ ...puzzle, tiles: nextTiles });
    setAnswer(nextAnswer);

    if (!nextAnswer.includes("")) {
      setTimeout(() => submit(nextAnswer), 120);
    }
  };

  const removeTile = (slotIdx) => {
    if (lockRef.current || !puzzle) return;
    const tileIdx = tilesRef.current.findIndex((t) => t.slot === slotIdx);
    if (tileIdx === -1) return;
    const nextAnswer = [...answerRef.current];
    nextAnswer[slotIdx] = "";
    const nextTiles = tilesRef.current.map((t, i) =>
      i === tileIdx ? { ...t, used: false, slot: null } : t
    );
    answerRef.current = nextAnswer;
    tilesRef.current = nextTiles;
    setPuzzle({ ...puzzle, tiles: nextTiles });
    setAnswer(nextAnswer);
  };

  const submit = async (finalAnswer) => {
    if (lockRef.current) return;
    lockRef.current = true;
    setLocked(true);
    stopSpeaking();

    const word = wordRef.current;
    const grade = gradeAnswer(word, finalAnswer);
    setFeedback(grade);

    // Persist the attempt (this updates mastery server-side).
    try {
      await backend.mastery.recordAttempt(player.id, word, listId, session.mode, grade.correct);
    } catch (err) {
      console.error("recordAttempt failed", err);
    }

    // Reward
    if (grade.correct) {
      const gold = goldForWord({
        difficulty: player.difficulty,
        streak: player.streak || 0,
        isTest: session.mode === "test",
      });
      const xp = 10;
      setEarnedGold((g) => g + gold);
      setEarnedXp((x) => x + xp);
      setReward({ gold, xp });
      try {
        await backend.profiles.update(player.id, {
          coins: (player.coins || 0) + gold,
          xp: (player.xp || 0) + xp,
        });
      } catch (err) {
        console.error(err);
      }
    }

    setTimeout(next, grade.correct ? 1100 : 1700);
  };

  const next = async () => {
    const updated = advanceSession(session, {
      word: wordRef.current,
      correct: feedback?.correct ?? false,
      guess: answerRef.current.join(""),
    });

    if (updated.index >= updated.total) {
      setSession(null);
      setPuzzle(null);
      return;
    }
    const nextWord = updated.words[updated.index];
    const p = buildPuzzle(nextWord.word, updated.hintLevel);
    wordRef.current = nextWord.word;
    answerRef.current = p.answer;
    tilesRef.current = p.tiles;
    setSession(updated);
    setPuzzle(p);
    setAnswer(p.answer);
    setFeedback(null);
    setLocked(false);
    setReward(null);
    lockRef.current = false;
  };

  // --- render --------------------------------------------------------------
  if (!statePlayerId) {
    return (
      <div className="card text-center">
        <p className="ks-muted">Choose a player from the dashboard to start practising.</p>
        <button type="button" className="btn" onClick={() => navigate("/")}>
          Back to dashboard
        </button>
      </div>
    );
  }

  if (loading) return <p className="ks-muted">Loading…</p>;

  if (!player) {
    return (
      <div className="card text-center">
        <p className="ks-muted">That player could not be found.</p>
        <button type="button" className="btn" onClick={() => navigate("/")}>
          Back to dashboard
        </button>
      </div>
    );
  }

  // setup screen
  if (!session) {
    const summary = null;
    return (
      <div className="ks-stack">
        <div className="ks-spread">
          <h1 className="page-title">Practice</h1>
          <button type="button" className="btn btn-ghost" onClick={() => navigate("/")}>
            ← Dashboard
          </button>
        </div>

        <div className="card ks-row">
          <Avatar config={player.avatar} size={64} />
          <div className="ks-spread ks-grow">
            <div>
              <h2 className="mt-0 mb-0">{player.name}</h2>
              <span className="badge">Grade {player.grade_level}</span>{" "}
              <span className="badge badge-gold">{player.difficulty}</span>
            </div>
            <div className="ks-row-wrap">
              <span className="badge badge-gold">🪙 {player.coins || 0}</span>
              <span className="badge">⭐ {player.xp || 0}</span>
              <span className="badge badge-rose">🔥 {player.streak || 0}</span>
            </div>
          </div>
        </div>

        {lists.length === 0 ? (
          <div className="card text-center">
            <p className="ks-muted">No spelling lists yet. Ask a parent to create one.</p>
          </div>
        ) : (
          <div className="card ks-stack">
            <div className="field" style={{ marginBottom: 0 }}>
              <label className="label" htmlFor="pick-list">Choose a list</label>
              <select
                id="pick-list"
                className="select"
                value={listId || ""}
                onChange={(e) => setListId(e.target.value)}
              >
                {lists.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.title} ({l.words?.length || 0} words)
                  </option>
                ))}
              </select>
            </div>
            <div className="ks-row-wrap">
              <button type="button" className="btn btn-lg btn-forest" onClick={() => start("practice")}>
                ▶ Practise
              </button>
              <button type="button" className="btn btn-lg btn-gold" onClick={() => start("test")}>
                👑 Royal Test
              </button>
            </div>
            <p className="ks-small ks-muted" style={{ margin: 0 }}>
              Practise adapts to you: words you find hard come back more often.
              The Royal Test has no hints and gives bonus gold.
            </p>
          </div>
        )}

        <div className="ks-center">
          <button type="button" className="btn btn-ghost" onClick={() => navigate(`/kingdom/${player.id}`)}>
            🏰 Visit your kingdom
          </button>
        </div>
      </div>
    );
  }

  // practice screen
  const progress = session.total ? ((session.index + 1) / session.total) * 100 : 0;
  const isDone = session.index >= session.total;
  const s = sessionSummary(session);
  const hintLevel = puzzle ? puzzle.prefilledCount : 0;

  return (
    <div className="ks-stack">
      <div className="ks-spread">
        <span className="badge">Word {Math.min(session.index + 1, session.total)} of {session.total}</span>
        <div className="ks-row" style={{ gap: 6 }}>
          <span className="badge badge-gold">🪙 {player.coins || 0}</span>
          {earnedGold > 0 && <span className="badge badge-forest">+{earnedGold}</span>}
        </div>
      </div>
      <div className="progress"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>

      <div className="card text-center ks-stack">
        {/* definition clue */}
        {currentWord && (
          <p className="ks-muted" style={{ margin: 0 }}>
            {currentWord.kid_definition || currentWord.definition || "Spell this word"}
          </p>
        )}

        {/* answer slots */}
        <div className="ks-row-wrap" style={{ justifyContent: "center", gap: 6, margin: "8px 0" }}>
          {answer.map((ch, i) => {
            const wrong = feedback && !feedback.correct && i === feedback.wrongIndex;
            return (
              <button
                key={i}
                type="button"
                onClick={() => removeTile(i)}
                style={{
                  width: 42, height: 52,
                  fontSize: "1.6rem", fontWeight: 700, fontFamily: "var(--font-display)",
                  borderRadius: 12,
                  border: "2px solid",
                  borderColor: feedback ? (wrong ? "var(--danger)" : "var(--forest)") : "var(--royal)",
                  background: feedback ? (wrong ? "rgba(201,90,90,0.12)" : "rgba(90,168,106,0.12)") : "#fff",
                  color: "var(--ink)",
                }}
                aria-label={ch ? `Letter ${ch}` : `Empty slot ${i + 1}`}
              >
                {ch.toUpperCase()}
              </button>
            );
          })}
        </div>

        {/* audio controls */}
        {currentWord && (
          <div className="ks-row" style={{ justifyContent: "center", gap: 8 }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => speakWord(currentWord.word)}>
              🔊 Hear word
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => speakSlow(currentWord.kid_definition || currentWord.definition || "")}
            >
              📖 Definition
            </button>
          </div>
        )}

        {/* letter tray */}
        {!feedback && (
          <div className="ks-row-wrap" style={{ justifyContent: "center", gap: 8, marginTop: 8 }}>
            {puzzle?.tiles.map((t, i) => (
              <button
                key={t.id}
                type="button"
                onClick={() => placeTile(i)}
                disabled={t.used}
                style={{
                  width: 48, height: 56,
                  fontSize: "1.5rem", fontWeight: 700,
                  borderRadius: 12,
                  background: t.used ? "rgba(45,42,50,0.08)" : "linear-gradient(180deg,#fff,#f0e6d6)",
                  border: "2px solid rgba(107,91,158,0.3)",
                  color: t.used ? "rgba(45,42,50,0.3)" : "var(--ink)",
                  cursor: t.used ? "default" : "pointer",
                }}
                aria-label={`Letter ${t.char}`}
              >
                {t.char.toUpperCase()}
              </button>
            ))}
          </div>
        )}

        {/* feedback */}
        {feedback && (
          <div className="ks-stack" style={{ alignItems: "center", gap: 4 }}>
            {feedback.correct ? (
              <>
                <h2 style={{ margin: 0, color: "var(--forest)" }}>🎉 Correct!</h2>
                {reward && (
                  <span className="badge badge-gold">+{reward.gold} gold · +{reward.xp} XP</span>
                )}
              </>
            ) : (
              <>
                <h2 style={{ margin: 0, color: "var(--danger)" }}>Not quite — the word is</h2>
                <h1 style={{ margin: 0, fontSize: "2.2rem" }}>{currentWord.word}</h1>
                <span className="badge badge-rose">You'll see it again soon</span>
              </>
            )}
          </div>
        )}
      </div>

      <div className="ks-center">
        <button type="button" className="btn btn-ghost" onClick={() => { stopSpeaking(); setSession(null); setPuzzle(null); }}>
          Quit session
        </button>
      </div>
    </div>
  );
}
