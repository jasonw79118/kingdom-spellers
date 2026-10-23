// Play — the practice screen a child uses.
//
// Loads the player's selected list, builds an adaptive practice set from the
// mastery store, runs the session, and writes attempts + rewards back.

import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { backend } from "../lib/backend";
import { performKingdomAction, expansionActionsAvailable } from "../lib/kingdomActions";
import "./SpellingAdventure.css";
import NpcCharacter from "../components/storybook/NpcCharacter";
import RewardFeedback from "../components/storybook/RewardFeedback";
import {savedMasteryLevel} from "../game/achievements";
import Avatar from "../components/Avatar";
import { buildPracticeSet, masteryLevel } from "../game/mastery";
import { createSession, buildPuzzle, gradeAnswer, advanceSession, sessionSummary, MODES } from "../game/practice";
import { goldForWord, REWARDS, XP_PER_WORD } from "../game/kingdom";
import { speakWord, speakSlow, stopSpeaking, prefetch, getSlowPref, setSlowPref } from "../lib/speech";
import VoicePicker from "../components/VoicePicker";
import { normalizeWord, shuffleArray } from "../lib/utils";

export default function PlayPage() {
  const [searchParams] = useSearchParams();
  const playerId = searchParams.get("playerId");
  const missionId = searchParams.get("mission") === "first-words" ? "first-words" : null;
  const [missionResult, setMissionResult] = useState(null);
  const missionAttempts = useRef([]);
  const knownMastery = useRef({});
  const [newMastery,setNewMastery]=useState(false);
  const [saveError,setSaveError]=useState("");
  const location = useLocation();
  const navigate = useNavigate();
  const statePlayerId = playerId || location.state?.playerId;

  const [player, setPlayer] = useState(null);
  const [lists, setLists] = useState([]);
  const [listId, setListId] = useState(null);
  const [inputMode, setInputMode] = useState("tiles");
  const [typedWord, setTypedWord] = useState("");
  const [completed, setCompleted] = useState(null);
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
    setSession(null);setPuzzle(null);setCompleted(null);setMissionResult(null);setSaveError("");setPlayer(null);setLists([]);setListId(null);setEarnedGold(0);setEarnedXp(0);
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
      knownMastery.current=Object.fromEntries(records.map(r=>[normalizeWord(r.word),savedMasteryLevel(r)]));
      setSaveError("");
      setNewMastery(false);
      const byWord = {};
      for (const r of records) byWord[normalizeWord(r.word)] = r;

      const isTest = mode === "test";
      const size = Math.min(isTest ? list.words.length : missionId ? 5 : 10, list.words.length);
      missionAttempts.current = [];
      setMissionResult(null);
      const chosen = isTest
        ? shuffleArray(list.words)
        : buildPracticeSet(list.words, byWord, { size });

      const s = createSession(chosen, {
        mode: isTest ? "test" : "solo",
        difficulty: player.difficulty,
        size,
      });
      setSession(s);
      setCompleted(null);
      setTypedWord("");
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
  }, [player, listId, missionId]);

  // --- answer interaction --------------------------------------------------
  const currentWord = session?.words[session.index];

  // Warm the audio for the current word (and the next) so tapping
  // "Hear word" is instant instead of waiting on a network round-trip.
  useEffect(() => {
    if (!currentWord?.word) return;
    prefetch(currentWord.word);
    const next = session?.words[session.index + 1];
    if (next?.word) prefetch(next.word);
  }, [currentWord?.word, session]);

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
    missionAttempts.current.push({word,correct:grade.correct});

    // Persist the attempt (this updates mastery server-side).
    try {
      const record=await backend.mastery.recordAttempt(player.id, word, listId, session.mode, grade.correct);
      const level=savedMasteryLevel(record);
      setNewMastery(level==='mastered' && knownMastery.current[normalizeWord(word)]!=='mastered');
      knownMastery.current[normalizeWord(word)]=level;
    } catch (err) {
      console.error("recordAttempt failed", err);
      setSaveError("Your attempt could not be confirmed. Please return and refresh before practicing again.");
      setReward(null);
      return;
    }

    // Reward — tests are graded practice and pay nothing, so points always
    // come from real practice.
    if (grade.correct) {
      const isTest = session.mode === "test";
      const gold = goldForWord({
        difficulty: player.difficulty,
        streak: player.streak || 0,
        isTest,
      });
      const xp = isTest ? REWARDS.testXp : XP_PER_WORD;
      if (gold > 0 || xp > 0) {
        try {
          const profiles = await backend.profiles.list();
          const fresh = profiles.find(p => p.id === player.id);
          if (!fresh) throw new Error("Player not found");
          const saved = await backend.profiles.update(player.id, { coins: (fresh.coins || 0) + gold, xp: (fresh.xp || 0) + xp });
          setPlayer(current => ({ ...current, ...saved }));
          setEarnedGold(value => value + gold);
          setEarnedXp(value => value + xp);
          setReward({gold,xp});
        } catch (error) {
          setSaveError("Your reward save could not be confirmed. Refresh before continuing.");
          setMissionResult({error:"Practice was recorded, but rewards could not be confirmed. Refresh before continuing."});
          return;
        }
      }
      if (gold === 0 && xp === 0) setReward({gold:0,xp:0,isTest:true});

    }

    setTimeout(() => next(grade), grade.correct ? 1100 : 1700);
  };

  const next = async (completedGrade) => {
    const updated = advanceSession(session, {
      word: wordRef.current,
      correct: completedGrade?.correct ?? false,
      guess: answerRef.current.join(""),
    });

    if (updated.index >= updated.total) {
      // A finished Royal Test counts toward unlocking the pet race, so the
      // counter is bumped here rather than on submit — a child may walk away
      // part-way through and still have sat (and finished) the test.
      if (updated.mode === "test" && statePlayerId) {
        try {
          const prog = await backend.progress.get(statePlayerId);
          await backend.progress.save(statePlayerId, {
            ...prog,
            royal_tests_completed: (prog.royal_tests_completed || 0) + 1,
          });
        } catch (err) {
          console.error(err);
        }
      }
      if (missionId && updated.mode !== "test") {
        const correct = missionAttempts.current.filter(attempt => attempt.correct).length;
        let message = correct ? "Your words are helping Greenwood grow." : "Every try is practice. Come back for another gentle quest.";
        if (correct && expansionActionsAvailable) {
          try { const outcome = await performKingdomAction(statePlayerId, {type:"quest",target:missionId}); message = outcome.replay ? "Your garden is already blooming. You kept your normal practice rewards." : "Quest complete! A flower garden is now growing in your village."; }
          catch { message = "Practice completed. Return to your village to collect your garden when saving is available."; }
        }
        setMissionResult({correct,total:updated.total,message});
      }
      setCompleted(sessionSummary(updated));
      setSession(null);
      setPuzzle(null);
      return;
    }
    const nextWord = updated.words[updated.index];
    const p = buildPuzzle(nextWord.word, updated.hintLevel);
    wordRef.current = nextWord.word;
    answerRef.current = p.answer;
    tilesRef.current = p.tiles;
    setNewMastery(false);
    setTypedWord("");
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
        <p className="ks-muted">Choose a player from the dashboard to start practicing.</p>
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
      <div className="ks-stack spell-setup">
        <section className="spell-welcome"><span className="spell-eyebrow">THE GREENWOOD WORD TRAIL</span><h2>Little words. A growing kingdom.</h2><p>Listen, discover, and spell. Every word is another step on your adventure.</p></section>
        <div className="academy-setup"><NpcCharacter id="eli" compact action="Choose your spelling list" onAction={()=>document.getElementById("pick-list")?.focus()}/></div>
        {searchParams.get("challenge")==="royal"&&<NpcCharacter id="finn" compact action="See Royal Test choices" onAction={()=>document.getElementById("pick-list")?.focus()}/>}
        {completed && <section className="spell-complete" role="status"><RewardFeedback event="session_complete" title="You followed the word trail!" message="Your confirmed spelling rewards are shown below."/><p>{completed.correct ?? 0} words spelled correctly. Every try helps you learn.</p><p className="spell-loot">{earnedGold} gold earned · {earnedXp} XP earned</p><button type="button" className="btn btn-forest" onClick={() => navigate(`/kingdom/${player.id}`)}>Return to your kingdom →</button></section>}
        <div className="ks-spread">
          <h1 className="page-title">Practice</h1>
          <button type="button" className="btn btn-ghost" onClick={() => navigate("/")}>
            ← Dashboard
          </button>
        </div>

        {missionId && <section className="ks-mission-result" aria-label="Spelling mission" role="status">
          <h2>{missionResult ? "Your Greenwood adventure" : "Words take root"}</h2>
          <p>{missionResult?.message || "Choose a list for a quest of up to five words. Your first correct spelling can plant a village garden. You earn your normal gold and XP."}</p>
          {missionResult && <p>{missionResult.correct || 0} of {missionResult.total || 0} spelled correctly · keep learning at your own pace.</p>}
          {missionResult && <button type="button" className="btn btn-forest" onClick={() => navigate(`/kingdom/${player.id}`)}>See your village grow →</button>}
        </section>}
        {missionResult?.error && <p role="alert">{missionResult.error}</p>}
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
                ▶ Practice
              </button>
              <button type="button" className="btn btn-lg btn-gold" onClick={() => start("test")}>
                👑 Royal Test
              </button>
            </div>
            <p className="ks-small ks-muted" style={{ margin: 0 }}>
              Practice adapts to you: words you find hard come back more often,
              and earns you gold. The Royal Test is a real test — no hints, and
              no gold either, so try it when you feel ready.
            </p>
          </div>
        )}

        <div className="ks-center">
          <button type="button" className="btn btn-ghost" onClick={() => navigate(`/kingdom/${player.id}`)}>
            🏰 Visit your kingdom
          </button>
        </div>

        <VoicePicker />
      </div>
    );
  }

  // practice screen
  const progress = session.total ? ((session.index + 1) / session.total) * 100 : 0;
  const isDone = session.index >= session.total;
  const s = sessionSummary(session);
  const hintLevel = puzzle ? puzzle.prefilledCount : 0;

  return (
    <div className="spell-adventure">
      <header className="spell-heading"><div><span className="spell-eyebrow">GREENWOOD ACADEMY · {session.mode === "test" ? "ROYAL TEST" : "WORD TRAIL"}</span><h1>{session.mode === "test" ? "The royal spelling challenge" : "Your words bring the kingdom to life"}</h1></div><span className="spell-satchel" aria-label="Your gold">Gold {player.coins || 0}{earnedGold > 0 && <small>+{earnedGold} this adventure</small>}</span></header>
      <div className="spell-hud ks-spread">
        <span className="badge">Word {Math.min(session.index + 1, session.total)} of {session.total}</span>

      </div>
      <div className="spell-trail" aria-label="Word journey">{session.words.map((_, i) => <span key={i} className={i < session.index ? "passed" : i === session.index ? "current" : ""} aria-label={`Word ${i + 1}${i < session.index ? ", visited" : i === session.index ? ", current" : ""}`}>{i < session.index ? "✓" : i + 1}</span>)}</div>
      <div className="progress" role="progressbar" aria-label="Session progress" aria-valuenow={session.index} aria-valuemin={0} aria-valuemax={session.total}><div className="progress-fill" style={{ width: `${session.index / session.total * 100}%` }} /></div>

      <div className="academy-workspace"><div className="academy-mentor"><NpcCharacter id="eli" dialogue={feedback ? feedback.correct ? newMastery ? 'Your practice is taking root. This word has reached mastery in your saved learning history!' : 'Well spelled! A little learning makes a big difference.' : 'That was a good try. Look at the word, listen again, and we will revisit it.' : 'Listen to your word. Say its sounds quietly, then put them in order.'} onAction={()=>speakWord(currentWord.word)} action="Listen with Eli"/></div>
      <div className="spell-book text-center ks-stack">
        <div className="spell-book-title"><span aria-hidden="true">✦</span><span>{session.mode === "test" ? "A royal word awaits" : "Listen. Imagine. Spell."}</span><span aria-hidden="true">✦</span></div>
        <p className="spell-instruction">{inputMode === "tiles" ? "Tap the letters to spell your word. Tap a filled space to change it." : "Type your word, then check your spelling."}</p>
        {/* definition clue */}
        {currentWord && (
          <p className="ks-muted" style={{ margin: 0 }}>
            {currentWord.kid_definition || currentWord.definition || "Spell this word"}
          </p>
        )}

        <div className="spell-mode" role="group" aria-label="How to spell"><button type="button" aria-pressed={inputMode === "tiles"} disabled={locked} onClick={() => setInputMode("tiles")}>Letter tiles</button><button type="button" aria-pressed={inputMode === "type"} disabled={locked} onClick={() => setInputMode("type")}>Type a word</button></div>
        {inputMode === "type" && !feedback && <form className="spell-type" onSubmit={e => {e.preventDefault(); if (typedWord.trim()) {answerRef.current = typedWord.trim().split(""); submit(answerRef.current);}}}><label htmlFor="spell-word">Your spelling</label><input id="spell-word" value={typedWord} onChange={e => setTypedWord(e.target.value)} autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck={false} disabled={locked} /><button className="btn btn-forest" disabled={locked || !typedWord.trim()}>Check word</button></form>}
        {/* answer slots */}
        <div hidden={inputMode === "type"} className="spell-slots ks-row-wrap" style={{ justifyContent: "center", gap: 6, margin: "8px 0" }}>
          {answer.map((ch, i) => {
            const wrong = feedback && !feedback.correct && i === feedback.wrongIndex;
            return (
              <button
                key={i}
                type="button"
                onClick={() => removeTile(i)}
                disabled={locked}
                style={{
                  width: 44, height: 54,
                  fontSize: "1.6rem", fontWeight: 700, fontFamily: "var(--font-display)",
                  borderRadius: 12,
                  border: "2px solid",
                  borderColor: feedback ? (wrong ? "var(--danger)" : "var(--forest)") : "#8e9770",
                  background: feedback ? (wrong ? "rgba(201,90,90,0.12)" : "rgba(90,168,106,0.12)") : "#fffcf2",
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
          <div className="ks-row" style={{ justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => speakWord(currentWord.word)}
            >
              🔊 Hear word
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                const next = !getSlowPref();
                setSlowPref(next);
                speakWord(currentWord.word, { slow: next });
              }}
            >
              🐢 Slower
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
        {!feedback && inputMode === "tiles" && (
          <div className="ks-row-wrap spell-tiles" style={{ justifyContent: "center", gap: 8, marginTop: 8 }}>
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

        {/* Feedback reflects confirmed saves, not a second payout. */}
        {saveError&&<p role="alert">{saveError}<button type="button" className="btn" onClick={()=>{stopSpeaking();setSession(null);setPuzzle(null);}}>Return to practice choices</button></p>}
        {feedback&&!saveError&&<div className="ks-stack spell-feedback" style={{alignItems:'center',gap:4}}><RewardFeedback event={feedback.correct ? newMastery ? 'word_mastered':'word_correct':'word_retry'} title={feedback.correct?'Correct!':'Not quite — let’s explore it'} message={feedback.correct ? newMastery ? 'Word mastered! Repeated practice is paying off.':'Every word is a step forward.' : 'Listen once more. You will see this word again.'} gold={reward?.gold || 0} xp={reward?.xp || 0}>{!feedback.correct&&<strong className="retry-word">{currentWord.word}</strong>}{reward?.isTest&&<span className="badge badge-forest">Royal Test · no points</span>}</RewardFeedback></div>}
      </div></div>

      <footer className="spell-footer"><p>{session.mode === "test" ? "Take your time. Royal Tests do not award gold." : "Correct words earn your normal gold and XP. Spend gold on your village."}</p>
        <button type="button" className="btn btn-ghost" onClick={() => { stopSpeaking(); setSession(null); setPuzzle(null); }}>
          Quit session
        </button>
      </footer>
    </div>
  );
}
