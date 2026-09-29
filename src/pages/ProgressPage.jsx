// Progress report — what a parent actually wants to know:
// where the child is weak, what's been mastered, and how they're trending.

import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { backend } from "../lib/backend";
import Avatar from "../components/Avatar";
import StatPill from "../components/StatPill";
import ProgressBar from "../components/ProgressBar";
import { needsPractice, masteredWords, masteryLevel } from "../game/mastery";
import { prosperityOf, rankForProsperity, rankProgress } from "../game/kingdom";
import { xpProgress, todayKey } from "../lib/utils";

export default function ProgressPage() {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState([]);
  const [playerId, setPlayerId] = useState(null);
  const [records, setRecords] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const list = await backend.profiles.list();
        setProfiles(list);
        if (list.length) setPlayerId(list[0].id);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const loadDetail = useCallback(async () => {
    if (!playerId) return;
    setLoading(true);
    try {
      const [m, a, p] = await Promise.all([
        backend.mastery.list(playerId),
        backend.mastery.listAttempts(playerId),
        backend.progress.get(playerId),
      ]);
      setRecords(m);
      setAttempts(a);
      setProgress(p);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [playerId]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  if (!profiles.length && !loading) {
    return (
      <div className="card text-center">
        <p className="ks-muted">No players yet.</p>
        <button type="button" className="btn" onClick={() => navigate("/players")}>
          Add a player
        </button>
      </div>
    );
  }

  const player = profiles.find((p) => p.id === playerId);
  const totalAttempts = records.reduce((s, r) => s + (r.attempts || 0), 0);
  const totalCorrect = records.reduce((s, r) => s + (r.correct_attempts || 0), 0);
  const overallAccuracy = totalAttempts ? Math.round((totalCorrect / totalAttempts) * 100) : 0;
  const practiced = records.filter((r) => r.attempts > 0).length;
  const mastered = records.filter(
    (r) => masteryLevel({ attempts: r.attempts, correct: r.correct_attempts, streak: r.current_streak ?? 0, score: r.mastery_score }) === "mastered"
  ).length;

  const weak = needsPractice(records, { limit: 8 });
  const strong = masteredWords(records, { limit: 8 });

  // Last 7 days of practice
  const days = [];
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date(Date.now() - i * 86400000);
    const key = todayKey(d);
    const dayAttempts = attempts.filter((a) => todayKey(new Date(a.created_at)) === key);
    const correct = dayAttempts.filter((a) => a.correct).length;
    days.push({
      key,
      label: d.toLocaleDateString(undefined, { weekday: "narrow" }),
      count: dayAttempts.length,
      accuracy: dayAttempts.length ? Math.round((correct / dayAttempts.length) * 100) : 0,
    });
  }
  const maxDay = Math.max(1, ...days.map((d) => d.count));

  const builtIds = Object.keys(progress?.buildings || {}).filter((k) => progress.buildings[k]);
  const prosperity = prosperityOf(builtIds);
  const rank = rankForProsperity(prosperity, player?.avatar?.base);
  const rprog = rankProgress(prosperity);
  const xp = xpProgress(player?.xp || 0);

  const levelLabel = { new: "New", learning: "Learning", practicing: "Practicing", strong: "Strong", mastered: "Mastered" };

  return (
    <div className="ks-stack">
      <div className="ks-spread">
        <h1 className="page-title">Progress</h1>
        <button type="button" className="btn btn-ghost" onClick={() => navigate("/")}>
          ← Dashboard
        </button>
      </div>

      {profiles.length > 1 && (
        <div className="card">
          <div className="field" style={{ marginBottom: 0 }}>
            <label className="label" htmlFor="p">Player</label>
            <select id="p" className="select" value={playerId || ""} onChange={(e) => setPlayerId(e.target.value)}>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {player && (
        <div className="card ks-row" style={{ gap: 16, flexWrap: "wrap" }}>
          <Avatar config={player.avatar} size={64} />
          <div className="ks-grow" style={{ minWidth: 180 }}>
            <h2 className="mt-0 mb-0">{player.name}</h2>
            <div className="ks-row-wrap" style={{ marginTop: 4 }}>
              <span className="badge badge-gold">{rank.icon} {rank.title}</span>
              <span className="badge">Level {xp.level}</span>
            </div>
            <div style={{ marginTop: 8 }}>
              <ProgressBar percent={rprog.percent} tone="royal" label="Rank progress" />
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <p className="ks-muted">Loading…</p>
      ) : (
        <>
          <div className="ks-row-wrap">
            <StatPill icon="✅" value={`${overallAccuracy}%`} label="Accuracy" />
            <StatPill icon="📚" value={practiced} label="Words tried" />
            <StatPill icon="🏆" value={mastered} label="Mastered" />
            <StatPill icon="✍️" value={totalAttempts} label="Attempts" />
            <StatPill icon="🔥" value={player?.streak || 0} label="Streak" />
            <StatPill icon="🪙" value={player?.coins || 0} label="Gold" />
          </div>

          {/* weekly activity */}
          <div className="card">
            <h3 className="mt-0" style={{ fontSize: "1.1rem" }}>Last 7 days</h3>
            <div className="ks-row" style={{ alignItems: "flex-end", gap: 8, height: 120, marginTop: 8 }}>
              {days.map((d) => (
                <div key={d.key} className="ks-center ks-stack" style={{ flex: 1, gap: 4, height: "100%", justifyContent: "flex-end" }}>
                  <div className="ks-small ks-muted">{d.count || ""}</div>
                  <div
                    title={`${d.count} attempts, ${d.accuracy}% correct`}
                    style={{
                      width: "100%",
                      height: `${(d.count / maxDay) * 80}px`,
                      minHeight: d.count ? 8 : 4,
                      borderRadius: 6,
                      background: d.count
                        ? d.accuracy >= 80 ? "var(--forest)" : d.accuracy >= 50 ? "var(--gold)" : "var(--danger)"
                        : "rgba(45,42,50,0.1)",
                    }}
                  />
                  <div className="ks-small ks-muted">{d.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* needs practice */}
          <div className="card">
            <h3 className="mt-0" style={{ fontSize: "1.1rem" }}>Needs practice</h3>
            {weak.length === 0 ? (
              <p className="ks-muted" style={{ margin: 0 }}>Nothing struggling right now — nice work!</p>
            ) : (
              <div className="ks-stack" style={{ gap: 8 }}>
                {weak.map((w) => (
                  <div key={w.word} className="ks-spread">
                    <span style={{ fontWeight: 700, textTransform: "capitalize" }}>{w.word}</span>
                    <span className="ks-row" style={{ gap: 8 }}>
                      <span className="ks-small ks-muted">{levelLabel[w.level] || w.level}</span>
                      <span style={{ minWidth: 110 }}>
                        <ProgressBar percent={w.accuracy} tone="" />
                      </span>
                      <span className="ks-small" style={{ minWidth: 38, textAlign: "right" }}>{w.accuracy}%</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* mastered */}
          <div className="card">
            <h3 className="mt-0" style={{ fontSize: "1.1rem" }}>Mastered</h3>
            {strong.length === 0 ? (
              <p className="ks-muted" style={{ margin: 0 }}>
                No words fully mastered yet. A word becomes mastered after several correct tries in a row.
              </p>
            ) : (
              <div className="ks-row-wrap">
                {strong.map((w) => (
                  <span key={w.word} className="badge badge-forest" style={{ fontSize: "0.95rem", padding: "6px 12px" }}>
                    {w.word} · {w.accuracy}%
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* per-word mastery table */}
          {records.length > 0 && (
            <div className="card">
              <h3 className="mt-0" style={{ fontSize: "1.1rem" }}>All words</h3>
              <div className="ks-stack" style={{ gap: 6, maxHeight: 420, overflowY: "auto" }}>
                {records
                  .slice()
                  .sort((a, b) => (b.mastery_score ?? 0) - (a.mastery_score ?? 0))
                  .map((r) => {
                    const level = masteryLevel({
                      attempts: r.attempts,
                      correct: r.correct_attempts,
                      streak: r.current_streak ?? 0,
                      score: r.mastery_score,
                    });
                    const acc = r.attempts ? Math.round((r.correct_attempts / r.attempts) * 100) : 0;
                    return (
                      <div key={r.word} className="ks-spread">
                        <span style={{ fontWeight: 600, textTransform: "capitalize", minWidth: 120 }}>{r.word}</span>
                        <span className="ks-row" style={{ gap: 8, flex: 1 }}>
                          <span className={`badge ${level === "mastered" ? "badge-forest" : level === "strong" ? "badge-gold" : level === "practicing" ? "" : "badge-rose"}`}>
                            {levelLabel[level]}
                          </span>
                          <span style={{ flex: 1, maxWidth: 160 }}>
                            <ProgressBar percent={acc} />
                          </span>
                          <span className="ks-small ks-muted">{r.attempts} tries</span>
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
