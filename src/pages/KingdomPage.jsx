// Kingdom screen — spend gold to build, watch prosperity raise your rank,
// and claim new territories as you grow.
//
// Progress (gold, built buildings, unlocked kingdoms) lives in
// backend.progress so it persists per player and is shared across all
// spelling lists.

import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { backend } from "../lib/backend";
import Avatar from "../components/Avatar";
import ProgressBar from "../components/ProgressBar";
import StatPill from "../components/StatPill";
import {
  KINGDOMS, TERRITORY_CLAIM_COST, RANKS,
  rankForProsperity, rankProgress, prosperityOf, canClaimTerritory,
} from "../game/kingdom";

export default function KingdomPage() {
  const { playerId } = useParams();
  const navigate = useNavigate();

  const [player, setPlayer] = useState(null);
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");

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
      setPlayer(p.find((x) => x.id === playerId) || player);
      flash(`${building.name} built! +${building.prosperity} prosperity`);
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
              <div className="ks-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", marginTop: 14 }}>
                {kingdom.buildings.map((b) => {
                  const done = Boolean(built[b.id]);
                  const affordable = gold >= b.cost;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      className="card-flat"
                      onClick={() => !done && build(b)}
                      disabled={done || busy}
                      style={{
                        textAlign: "left",
                        cursor: done ? "default" : affordable ? "pointer" : "not-allowed",
                        opacity: done ? 1 : affordable ? 1 : 0.6,
                        border: done ? "2px solid var(--forest)" : "2px solid transparent",
                        position: "relative",
                      }}
                    >
                      <div style={{ fontSize: "1.8rem" }} aria-hidden>{b.icon}</div>
                      <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>{b.name}</div>
                      {done ? (
                        <span className="badge badge-forest" style={{ marginTop: 6 }}>Built ✓</span>
                      ) : (
                        <div className="ks-row-wrap" style={{ marginTop: 6, gap: 6 }}>
                          <span className="badge badge-gold">{b.cost} 🪙</span>
                          <span className="badge">+{b.prosperity}</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
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
