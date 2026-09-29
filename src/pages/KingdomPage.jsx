// Kingdom screen — spend gold to build, watch prosperity raise your rank,
// and claim new territories as you grow.
//
// Progress (gold, built buildings, unlocked kingdoms) lives in
// backend.progress so it persists per player and is shared across all
// spelling lists.

import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { backend } from "../lib/backend";
import Avatar from "../components/Avatar";
import ProgressBar from "../components/ProgressBar";
import StatPill from "../components/StatPill";
import KingdomScene from "../components/kingdom/KingdomScene";
import { BuildingArt, buildingSize } from "../components/kingdom/buildingArt";
import {
  KINGDOMS, TERRITORY_CLAIM_COST, RANKS,
  rankForProsperity, rankProgress, prosperityOf,
} from "../game/kingdom";

// Celebration sparkles when a building is completed.
function Sparkles() {
  const bits = Array.from({ length: 18 }, (_, i) => ({
    left: 6 + Math.random() * 88,
    delay: Math.random() * 0.35,
    dx: (Math.random() - 0.5) * 90,
    dy: -60 - Math.random() * 90,
    color: ["#e8b64c", "#7fb05a", "#6fa8c9", "#d97a9a"][i % 4],
    size: 7 + Math.random() * 7,
  }));
  return (
    <div className="ks-sparkle-layer" style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      {bits.map((b, i) => (
        <span
          key={i}
          style={{
            position: "absolute",
            left: `${b.left}%`,
            top: "45%",
            width: b.size,
            height: b.size,
            borderRadius: 2,
            background: b.color,
            animation: `ks-sparkle 1.1s ease-out ${b.delay}s forwards`,
            ["--dx"]: `${b.dx}px`,
            ["--dy"]: `${b.dy}px`,
          }}
        />
      ))}
    </div>
  );
}

// The shop strip: what you can build next, with the current scene above it.
function BuildOptions({ kingdom, built, gold, busy, onBuild }) {
  return (
    <div className="ks-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))" }}>
      {kingdom.buildings.map((b) => {
        const done = Boolean(built[b.id]);
        const affordable = gold >= b.cost;
        const size = buildingSize(b.id);
        return (
          <button
            key={b.id}
            type="button"
            className="card-flat"
            onClick={() => !done && onBuild(b)}
            disabled={done || busy}
            aria-label={done ? `${b.name} built` : `Build ${b.name} for ${b.cost} gold`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              textAlign: "left",
              cursor: done ? "default" : affordable ? "pointer" : "not-allowed",
              opacity: done ? 0.75 : affordable ? 1 : 0.62,
              border: done ? "2px solid var(--forest)" : "2px solid transparent",
              position: "relative",
            }}
          >
            <div
              style={{
                width: 74,
                height: 62,
                flexShrink: 0,
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "center",
                overflow: "hidden",
              }}
            >
              <div style={{ transform: `scale(${Math.min(1, 62 / size.h)})`, transformOrigin: "bottom center" }}>
                <BuildingArt id={b.id} />
              </div>
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>{b.name}</div>
              {done ? (
                <span className="badge badge-forest" style={{ marginTop: 4 }}>Built ✓</span>
              ) : (
                <div className="ks-row-wrap" style={{ gap: 6, marginTop: 4 }}>
                  <span className="badge badge-gold">{b.cost} 🪙</span>
                  <span className="badge">+{b.prosperity}</span>
                </div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

export default function KingdomPage() {
  const { playerId } = useParams();
  const navigate = useNavigate();

  const [player, setPlayer] = useState(null);
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");
  const [celebrating, setCelebrating] = useState(null); // building id just placed
  const [focus, setFocus] = useState(null);
  const celebrateTimer = useRef(null);

  const load = useCallback(async () => {
    if (!playerId) return;
    setLoading(true);
    try {
      const [profiles, prog] = await Promise.all([
        backend.profiles.list(),
        backend.progress.get(playerId),
      ]);
      const p = profiles.find((x) => x.id === playerId);
      setPlayer(p || null);
      setProgress(prog);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [playerId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <p className="ks-muted">Loading kingdom…</p>;
  if (!player || !progress) {
    return (
      <div className="card text-center">
        <p className="ks-muted">Pick a player from the dashboard first.</p>
        <button type="button" className="btn" onClick={() => navigate("/")}>
          Back to dashboard
        </button>
      </div>
    );
  }

  const built = progress.buildings || {};
  const builtIds = Object.keys(built).filter((k) => built[k]);
  const prosperity = prosperityOf(builtIds);
  const gold = player.coins || 0;
  const unlockedCount = (progress.unlocked_kingdoms || [1]).length;
  const rank = rankForProsperity(prosperity, player.avatar?.base);
  const rprog = rankProgress(prosperity);

  const flash = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2200);
  };

  const saveProgress = async (nextBuildings, nextUnlocked) => {
    const updated = await backend.progress.save(playerId, {
      buildings: nextBuildings,
      unlocked_kingdoms: nextUnlocked,
    });
    setProgress(updated);
  };

  const build = async (building) => {
    if (busy) return;
    if (gold < building.cost) {
      flash(`You need ${building.cost - gold} more gold for the ${building.name}.`);
      return;
    }
    setBusy(true);
    try {
      const nextBuilt = { ...built, [building.id]: true };
      await backend.profiles.update(playerId, { coins: gold - building.cost });
      await saveProgress(nextBuilt, progress.unlocked_kingdoms);
      const p = await backend.profiles.list();
      const updated = p.find((x) => x.id === playerId) || player;

      // Rank-up callout if this build crossed a threshold.
      const before = prosperityOf(Object.keys(built).filter((k) => built[k]));
      const after = prosperityOf(Object.keys(nextBuilt).filter((k) => nextBuilt[k]));
      const prevRank = rankForProsperity(before, updated.avatar?.base);
      const newRank = rankForProsperity(after, updated.avatar?.base);

      setPlayer(updated);
      setCelebrating(building.id);
      clearTimeout(celebrateTimer.current);
      celebrateTimer.current = setTimeout(() => setCelebrating(null), 1600);

      if (newRank.title !== prevRank.title) {
        flash(`${newRank.icon} ${building.name} built — you are now a ${newRank.title}!`);
      } else {
        flash(`${building.name} built! +${building.prosperity} prosperity`);
      }
    } catch (err) {
      console.error(err);
      flash("Could not save that. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const claimTerritory = async (index) => {
    if (busy) return;
    const cost = TERRITORY_CLAIM_COST[index];
    if (gold < cost) {
      flash(`You need ${cost - gold} more gold to claim ${KINGDOMS[index].name}.`);
      return;
    }
    setBusy(true);
    try {
      const nextUnlocked = [...(progress.unlocked_kingdoms || [1]), KINGDOMS[index].id];
      await backend.profiles.update(playerId, { coins: gold - cost });
      await saveProgress(built, nextUnlocked);
      const p = await backend.profiles.list();
      setPlayer(p.find((x) => x.id === playerId) || player);
      flash(`${KINGDOMS[index].name} is yours!`);
    } catch (err) {
      console.error(err);
      flash("Could not claim that territory.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ks-stack">
      <div className="ks-spread">
        <h1 className="page-title">Your Kingdom</h1>
        <button type="button" className="btn btn-ghost" onClick={() => navigate("/")}>
          ← Dashboard
        </button>
      </div>

      {/* hero header */}
      <div className="card ks-row" style={{ gap: 16, flexWrap: "wrap" }}>
        <Avatar config={player.avatar} size={80} />
        <div className="ks-grow" style={{ minWidth: 200 }}>
          <div className="ks-row-wrap">
            <h2 className="mt-0 mb-0">{player.name}</h2>
            <span className="badge badge-gold">{rank.icon} {rank.title}</span>
          </div>
          <p className="ks-muted ks-small" style={{ margin: "2px 0 8px" }}>
            {rank.blurb}
          </p>
          <ProgressBar percent={rprog.percent} tone="gold" label={rprog.next ? `Next: ${rprog.next.title}` : "Highest rank reached"} />
        </div>
        <div className="ks-row-wrap">
          <StatPill icon="🪙" value={gold} label="Gold" />
          <StatPill icon="🏆" value={prosperity} label="Prosperity" />
          <StatPill icon="🔥" value={player.streak || 0} label="Streak" />
        </div>
      </div>

      {rprog.next && (
        <p className="ks-small ks-muted text-center" style={{ margin: 0 }}>
          Build more to reach <strong>{rprog.next.title}</strong> —{" "}
          {rprog.needed} more prosperity needed.
        </p>
      )}

      {/* rank ladder */}
      <div className="card">
        <h3 className="mt-0" style={{ fontSize: "1.1rem" }}>Your rank</h3>
        <div className="ks-row-wrap">
          {RANKS.map((r) => {
            const reached = prosperity >= r.min;
            const isCurrent = r.id === rank.id;
            return (
              <div
                key={r.id}
                className="card-flat"
                style={{
                  opacity: reached ? 1 : 0.45,
                  border: isCurrent ? "2px solid var(--gold)" : "2px solid transparent",
                  textAlign: "center",
                  minWidth: 96,
                }}
              >
                <div style={{ fontSize: "1.4rem" }} aria-hidden>{r.icon}</div>
                <div style={{ fontWeight: 700 }}>{r.title}</div>
                <div className="ks-small ks-muted">{r.min} prosperity</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* kingdoms */}
      {KINGDOMS.map((kingdom, index) => {
        const unlocked = (progress.unlocked_kingdoms || [1]).includes(kingdom.id);
        const nextTerritory = index === unlockedCount;
        const claimCost = TERRITORY_CLAIM_COST[index];

        return (
          <div key={kingdom.id} className="card">
            <div className="ks-spread" style={{ alignItems: "flex-start" }}>
              <div>
                <h3 className="mt-0" style={{ fontSize: "1.2rem" }}>{kingdom.name}</h3>
                <p className="ks-muted ks-small" style={{ margin: 0 }}>{kingdom.subtitle}</p>
              </div>
              {!unlocked ? (
                <span className="badge badge-rose">🔒 Locked</span>
              ) : (
                <span className="badge badge-forest">
                  {kingdom.buildings.filter((b) => built[b.id]).length}/{kingdom.buildings.length}
                </span>
              )}
            </div>

            {!unlocked ? (
              <div className="ks-row" style={{ marginTop: 14 }}>
                <p className="ks-muted ks-small ks-grow" style={{ margin: 0 }}>
                  Claim this territory to start building.
                </p>
                <button
                  type="button"
                  className="btn btn-gold"
                  onClick={() => claimTerritory(index)}
                  disabled={busy}
                >
                  Claim for {claimCost} 🪙
                </button>
              </div>
            ) : (
              <>
                <div style={{ position: "relative", marginTop: 14 }}>
                  <KingdomScene
                    kingdomId={kingdom.id}
                    built={built}
                    justBuilt={celebrating}
                    onSelectPlot={(b) => {
                      setFocus(b.id);
                      setToast(
                        gold >= b.cost
                          ? `${b.name} — ${b.cost} gold. Tap “Build” below to start.`
                          : `The ${b.name} needs ${b.cost - gold} more gold.`
                      );
                    }}
                  />
                  {celebrating && <Sparkles />}
                </div>
                <div style={{ marginTop: 14 }}>
                  <BuildOptions kingdom={kingdom} built={built} gold={gold} busy={busy} onBuild={build} />
                </div>
              </>
            )}
          </div>
        );
      })}

      {toast && (
        <div
          role="status"
          className="card"
          style={{ position: "fixed", bottom: 90, left: "50%", transform: "translateX(-50%)", zIndex: 40, maxWidth: 320, textAlign: "center" }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
