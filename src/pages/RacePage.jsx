// Pet Race — practice with your pet on the track.
//
// The race is not a separate game with its own rules. The child picks a pet,
// picks opponents, then spells words exactly as they do in Practice. Every
// correct word feeds their pet (a burst of speed, some ground gained); every
// mistake makes it stumble. The scoreboard is the pet, so the reward for a good
// word is immediate and the cost of a mistake is felt rather than told.
//
// Locked until enough Royal Tests have been completed.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { backend } from "../lib/backend";
import { createSession, buildPuzzle, gradeAnswer, advanceSession } from "../game/practice";
import { speakWord, stopSpeaking } from "../lib/speech";
import PetArt, { PETS, petLabelFor } from "../components/kingdom/petArt";
import {
  TRACK_LENGTH, raceProgress, makeRacers,
  applyResult, playerRacer, raceResult, placeLabel, moodFor,
} from "../game/race";

const LANE_H = 92;

export default function RacePage() {
  const { playerId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(null);
  const [petState, setPetState] = useState({});
  const [lists, setLists] = useState([]);
  const [listId, setListId] = useState("");
  const [yourPet, setYourPet] = useState("cat");
  const [opponents, setOpponents] = useState(["dog", "fox"]);

  const [racers, setRacers] = useState(null);
  const [session, setSession] = useState(null);
  const [puzzle, setPuzzle] = useState(null);
  const [answer, setAnswer] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [locked, setLocked] = useState(false);
  const [finished, setFinished] = useState(null);

  const wordRef = useRef("");
  const answerRef = useRef([]);
  const tilesRef = useRef([]);

  // --- load ----------------------------------------------------------------
  useEffect(() => {
    if (!playerId) {
      setLoading(false);
      return;
    }
    let alive = true;
    (async () => {
      try {
        const [prog, allLists] = await Promise.all([
          backend.progress.get(playerId),
          backend.lists.list(playerId),
        ]);
        if (!alive) return;
        setProgress(raceProgress(prog.royal_tests_completed || 0));
        setPetState(prog.pet_state || {});
        const usable = (allLists || []).filter((l) => l.words?.length);
        setLists(usable);
        if (usable.length) setListId(usable[0].id);
      } catch (err) {
        console.error(err);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [playerId]);

  // Stop any audio when leaving.
  useEffect(() => () => stopSpeaking(), []);

  const list = useMemo(() => lists.find((l) => l.id === listId), [lists, listId]);
  const player = useMemo(() => playerRacer(racers || []), [racers]);

  // --- start a race --------------------------------------------------------
  const start = useCallback(async () => {
    if (!list?.words?.length) return;
    const s = createSession(
      list.words.map((w) => ({ word: w.word })),
      { mode: "solo", size: Math.min(10, list.words.length) }
    );
    const p = buildPuzzle(s.words[0].word, s.hintLevel);
    wordRef.current = s.words[0].word;
    answerRef.current = p.answer;
    tilesRef.current = p.tiles;
    setRacers(makeRacers(yourPet, opponents));
    setSession(s);
    setPuzzle(p);
    setAnswer(p.answer);
    setFeedback(null);
    setLocked(false);
    setFinished(null);
  }, [list, yourPet, opponents]);

  // --- answering -----------------------------------------------------------
  // Mirrors PlayPage: the refs are committed before the next click so rapid
  // taps always see fresh state.
  const placeTile = (tileIdx) => {
    if (locked || !puzzle) return;
    const tile = tilesRef.current[tileIdx];
    if (!tile || tile.used) return;

    const nextAnswer = [...answerRef.current];
    const empty = nextAnswer.findIndex((c) => c === "");
    if (empty === -1) return;

    const nextTiles = tilesRef.current.map((t, i) =>
      i === tileIdx ? { ...t, used: true, slot: empty } : t
    );
    nextAnswer[empty] = tile.char;

    answerRef.current = nextAnswer;
    tilesRef.current = nextTiles;
    setPuzzle({ ...puzzle, tiles: nextTiles });
    setAnswer(nextAnswer);

    if (!nextAnswer.includes("")) {
      setTimeout(() => submit(nextAnswer), 120);
    }
  };

  const removeTile = (slotIdx) => {
    if (locked || !puzzle) return;
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

  const submit = useCallback(async (finalAnswer) => {
    if (locked) return;
    setLocked(true);
    stopSpeaking();

    const word = wordRef.current;
    const grade = gradeAnswer(word, finalAnswer);
    setFeedback(grade);

    if (grade.correct) speakWord(word);

    // The pet is fed by the answer, right or wrong. This is the whole game.
    setRacers((r) => (r ? applyResult(r, grade.correct) : r));
  }, [locked]);

  const next = useCallback(() => {
    const updated = advanceSession(session, {
      word: wordRef.current,
      correct: feedback?.correct ?? false,
      guess: answerRef.current.join(""),
    });

    if (updated.index >= updated.total) {
      // The finish line is the last racer state, which setRacers already holds.
      setSession(null);
      setPuzzle(null);
      setFinished((f) => f);
      return;
    }

    const p = buildPuzzle(updated.words[updated.index].word, updated.hintLevel);
    wordRef.current = updated.words[updated.index].word;
    answerRef.current = p.answer;
    tilesRef.current = p.tiles;
    setSession(updated);
    setPuzzle(p);
    setAnswer(p.answer);
    setFeedback(null);
    setLocked(false);
  }, [session, feedback]);

  // Persist the outcome so a pet's wins are remembered between races.
  const saveResult = useCallback(
    async (finalRacers) => {
      if (!playerId) return;
      const outcome = raceResult(finalRacers);
      try {
        const prog = await backend.progress.get(playerId);
        const current = prog.pet_state || {};
        const yours = current[yourPet] || { wins: 0, races: 0 };
        await backend.progress.save(playerId, {
          ...prog,
          pet_state: {
            ...current,
            [yourPet]: {
              ...yours,
              races: (yours.races || 0) + 1,
              wins: (yours.wins || 0) + (outcome.won ? 1 : 0),
            },
          },
        });
        setPetState((s) => ({
          ...s,
          [yourPet]: {
            ...yours,
            races: (yours.races || 0) + 1,
            wins: (yours.wins || 0) + (outcome.won ? 1 : 0),
          },
        }));
      } catch (err) {
        console.error(err);
      }
    },
    [playerId, yourPet]
  );

  // --- render: locked ------------------------------------------------------
  if (loading) return <p className="ks-muted">Loading race…</p>;
  if (!playerId) {
    return (
      <div className="card text-center">
        <p className="ks-muted">Choose a player from the dashboard first.</p>
        <button type="button" className="btn" onClick={() => navigate("/")}>← Dashboard</button>
      </div>
    );
  }
  if (progress?.locked) {
    return (
      <div className="card ks-center ks-stack" style={{ gap: 12 }}>
        <h1 className="page-title" style={{ margin: 0 }}>🏁 Pet Race</h1>
        <p style={{ fontSize: "1.3rem", margin: 0 }}>
          {progress.done} of {progress.need} Royal Tests done
        </p>
        <div className="progress" style={{ width: "100%" }}>
          <div className="progress-fill" style={{ width: `${(progress.done / progress.need) * 100}%` }} />
        </div>
        <p className="ks-muted ks-small" style={{ margin: 0 }}>
          Finish {progress.need - progress.done} more Royal Test{progress.need - progress.done === 1 ? "" : "s"} to
          unlock racing. Your pets are waiting.
        </p>
        <div className="ks-row" style={{ gap: 8 }}>
          <button type="button" className="btn btn-forest" onClick={() => navigate(`/play?player=${playerId}`)}>
            👑 Take a Royal Test
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => navigate(`/kingdom/${playerId}`)}>
            🏰 Kingdom
          </button>
        </div>
      </div>
    );
  }

  // --- render: setup -------------------------------------------------------
  if (!racers) {
    const owned = PETS.filter((p) => petState[p.id]?.owned !== false);
    return (
      <div className="ks-stack">
        <div className="ks-spread">
          <h1 className="page-title">🏁 Pet Race</h1>
          <button type="button" className="btn btn-ghost" onClick={() => navigate(`/kingdom/${playerId}`)}>
            ← Kingdom
          </button>
        </div>

        <div className="card ks-stack">
          <h2 className="mt-0" style={{ fontSize: "1.15rem" }}>Choose your racer</h2>
          <p className="ks-muted ks-small" style={{ margin: 0 }}>
            Every correct word feeds your pet and pushes it forward. A mistake makes it stumble.
          </p>
          <div className="ks-row-wrap" style={{ gap: 8 }}>
            {PETS.map((p) => {
              const rec = petState[p.id] || {};
              const active = yourPet === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setYourPet(p.id)}
                  aria-pressed={active}
                  className={`btn ${active ? "btn-forest" : "btn-ghost"}`}
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px" }}
                >
                  <PetArt id={p.id} size={40} label={`${p.label} preview`} />
                  <span style={{ textAlign: "left" }}>
                    <span style={{ display: "block", fontWeight: 800 }}>{p.label}</span>
                    <span className="ks-small" style={{ opacity: 0.85 }}>
                      {p.blurb}
                      {rec.wins ? ` · ${rec.wins} win${rec.wins === 1 ? "" : "s"}` : ""}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="card ks-stack">
          <h2 className="mt-0" style={{ fontSize: "1.15rem" }}>Who else is racing?</h2>
          <div className="ks-row-wrap" style={{ gap: 8 }}>
            {PETS.filter((p) => p.id !== yourPet).map((p) => {
              const on = opponents.includes(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  className={`btn ${on ? "btn-gold" : "btn-ghost"}`}
                  aria-pressed={on}
                  onClick={() =>
                    setOpponents((o) =>
                      o.includes(p.id)
                        ? o.filter((x) => x !== p.id)
                        : // keep the field small; at most 4 opponents
                          o.length >= 4 ? o : [...o, p.id]
                    )
                  }
                >
                  <PetArt id={p.id} size={26} /> {p.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="card ks-stack">
          <div className="field" style={{ marginBottom: 0 }}>
            <label className="label" htmlFor="race-list">Word list</label>
            <select id="race-list" className="select" value={listId} onChange={(e) => setListId(e.target.value)}>
              {lists.map((l) => (
                <option key={l.id} value={l.id}>{l.title} ({l.words.length} words)</option>
              ))}
            </select>
          </div>
          <button type="button" className="btn btn-lg btn-forest" onClick={start} disabled={!listId}>
            🏁 Start the race
          </button>
        </div>
      </div>
    );
  }

  // --- render: results -----------------------------------------------------
  // The race ends when the practice words run out, or as soon as the pet
  // crosses the line. Either way the result is derived from the final racers.
  const over = !session && racers;
  if (over) {
    const outcome = raceResult(racers);
    return (
      <div className="ks-stack">
        <div className="card ks-center ks-stack" style={{ gap: 10 }}>
          <div style={{ fontSize: "3rem" }}>
            {outcome.won ? "🏆" : outcome.place <= 3 ? "🎉" : "💪"}
          </div>
          <h1 className="page-title" style={{ margin: 0 }}>
            {outcome.won ? "You won!" : `${placeLabel(outcome.place)} place`}
          </h1>
          <p style={{ margin: 0, fontSize: "1.1rem" }}>
            {petLabelFor(yourPet)} finished {outcome.playerPct}% of the way.
          </p>
          <div className="ks-row" style={{ gap: 10, justifyContent: "center" }}>
            {racers
              .slice()
              .sort((a, b) => b.distance - a.distance)
              .map((r, i) => (
                <div key={r.id} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "0.8rem", fontWeight: 800 }}>
                    {["🥇", "🥈", "🥉"][i] || `${i + 1}.`}
                  </div>
                  <PetArt id={r.id} size={44} />
                  <div className="ks-small" style={{ fontWeight: 700 }}>
                    {r.pet.label}
                  </div>
                  <div className="ks-small ks-muted">
                    {Math.round((r.distance / TRACK_LENGTH) * 100)}%
                  </div>
                </div>
              ))}
          </div>
          <div className="ks-row" style={{ gap: 8, justifyContent: "center" }}>
            <button
              type="button"
              className="btn btn-forest"
              onClick={() => { setRacers(null); saveResult(racers); }}
            >
              🔁 Race again
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => navigate(`/kingdom/${playerId}`)}>
              🏰 Kingdom
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- render: the race ----------------------------------------------------
  const laneW = 76;
  return (
    <div className="ks-stack">
      <div className="ks-spread">
        <h1 className="page-title">🏁 Race</h1>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate(`/kingdom/${playerId}`)}>
          ← Kingdom
        </button>
      </div>

      {/* the track */}
      <div className="card" style={{ padding: 8, overflowX: "auto" }}>
        <div style={{ position: "relative", minWidth: (TRACK_LENGTH + laneW) * 1.1 }}>
          {racers.map((r) => {
            const x = 10 + r.distance;
            const isYou = r.isPlayer;
            return (
              <div
                key={r.id}
                style={{
                  position: "relative",
                  height: LANE_H,
                  borderTop: r.lane === 0 ? "2px solid rgba(255,255,255,0.25)" : "1px dashed rgba(255,255,255,0.12)",
                }}
              >
                {/* finish line */}
                <div
                  aria-hidden
                  style={{
                    position: "absolute", right: 10, top: 0, bottom: 0, width: 6,
                    background:
                      "repeating-linear-gradient(45deg, #fff 0 6px, #2d2a32 6px 12px)",
                    opacity: 0.6, borderRadius: 2,
                  }}
                />
                <div
                  style={{
                    position: "absolute", left: x, top: 8,
                    display: "flex", alignItems: "center", gap: 6,
                    transition: "left .45s cubic-bezier(.34,1.2,.64,1)",
                  }}
                >
                  <PetArt id={r.id} size={56} label={`${r.pet.label} racer`} />
                  <span
                    style={{
                      fontSize: "1.3rem",
                      transform: r.momentum >= 1.4 ? "scale(1.15)" : "scale(1)",
                      transition: "transform .2s",
                    }}
                    aria-hidden
                  >
                    {moodFor(r)}
                  </span>
                  {isYou && (
                    <span className="label" style={{ fontSize: "0.75rem" }}>You</span>
                  )}
                </div>
                <span
                  className="ks-small ks-muted"
                  style={{ position: "absolute", left: 6, top: 6, fontWeight: 700 }}
                >
                  {r.pet.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* the word */}
      {puzzle && (
        <div className="card ks-center ks-stack">
          <div style={{ fontSize: "1.6rem", fontWeight: 800, letterSpacing: "0.08em" }}>
            {wordRef.current?.toUpperCase()}
          </div>

          <div className="ks-row" style={{ gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
            {puzzle.tiles.map((t, i) => (
              <button
                key={t.id}
                type="button"
                className="tile"
                onClick={() => placeTile(i)}
                disabled={locked || t.used}
                style={{ opacity: t.used ? 0.3 : 1 }}
              >
                {t.char}
              </button>
            ))}
          </div>

          <div
            className="ks-row"
            style={{ gap: 6, justifyContent: "center", minHeight: 40 }}
            aria-live="polite"
          >
            {answer.map((ch, slot) => (
              <button
                key={slot}
                type="button"
                className="tile"
                onClick={() => removeTile(slot)}
                style={{
                  background: ch ? "rgba(255,215,106,0.28)" : "transparent",
                  cursor: ch ? "pointer" : "default",
                }}
              >
                {ch}
              </button>
            ))}
          </div>

          {feedback && (
            <div className="ks-stack" style={{ gap: 8, alignItems: "center" }}>
              <p
                style={{
                  margin: 0, fontWeight: 800, fontSize: "1.15rem",
                  color: feedback.correct ? "var(--success, #4a7c59)" : "var(--danger)",
                }}
              >
                {feedback.correct
                  ? `Correct! ${petLabelFor(yourPet)} speeds up 🍖`
                  : `Not quite — ${petLabelFor(yourPet)} stumbles 🐾`}
              </p>
              <button type="button" className="btn btn-forest" onClick={next}>
                {session && session.index + 1 >= session.total ? "Finish race" : "Next word →"}
              </button>
            </div>
          )}

          {!feedback && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => speakWord(wordRef.current)}>
              🔊 Hear word
            </button>
          )}
        </div>
      )}
    </div>
  );
}
