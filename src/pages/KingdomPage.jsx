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
import { BuildingArt, buildingSize, LandArt } from "../components/kingdom/buildingArt";
import CelebrationSequence from "../components/kingdom/CelebrationSequence";
import {
  KINGDOMS, TERRITORY_CLAIM_COST, RANKS, PLOT, plotState, isRegionComplete, castleBuilt,
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

// The shop strip: clear or build a plot, with the current scene above it.
function BuildOptions({ kingdom, built, gold, busy, onClear, onBuild }) {
  return (
    <div className="ks-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))" }}>
      {kingdom.buildings.map((b) => {
        const state = plotState(built, b.id);
        const size = buildingSize(b.id);
        const affordable = gold >= (state === PLOT.WILD ? b.clearCost : b.cost);
        return (
          <button
            key={b.id}
            type="button"
            className="card-flat"
            onClick={() => {
              if (state === PLOT.WILD) onClear(b);
              else if (state === PLOT.CLEARED) onBuild(b);
            }}
            disabled={state === PLOT.BUILT || busy}
            aria-label={
              state === PLOT.BUILT ? `${b.name} built`
              : state === PLOT.WILD ? `Clear land for ${b.name}, ${b.clearCost} gold`
              : `Build ${b.name} for ${b.cost} gold`
            }
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              textAlign: "left",
              cursor: state === PLOT.BUILT ? "default" : affordable ? "pointer" : "not-allowed",
              opacity: state === PLOT.BUILT ? 0.75 : affordable ? 1 : 0.62,
              border: state === PLOT.BUILT ? "2px solid var(--forest)" : "2px solid transparent",
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
              <div style={{ transform: `scale(${Math.min(1, 58 / size.h)})`, transformOrigin: "bottom center" }}>
                {state === PLOT.BUILT ? (
                  <BuildingArt id={b.id} />
                ) : (
                  <LandArt state={state} glyph={kingdom.wild} />
                )}
              </div>
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>
                {b.name}
                {b.castle && (
                  <span className="badge badge-gold" style={{ marginLeft: 6, fontSize: "0.62rem" }}>Castle</span>
                )}
              </div>
              {state === PLOT.BUILT ? (
                <span className="badge badge-forest" style={{ marginTop: 4 }}>Built ✓</span>
              ) : state === PLOT.WILD ? (
                <div className="ks-row-wrap" style={{ gap: 6, marginTop: 4 }}>
                  <span className="badge">🌳 Wild</span>
                  <span className="badge badge-gold">Clear {b.clearCost} 🪙</span>
                </div>
              ) : (
                <div className="ks-row-wrap" style={{ gap: 6, marginTop: 4 }}>
                  <span className="badge badge-forest">Cleared</span>
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
  const [reward, setReward] = useState(null); // { kind, title, subtitle, icon }
  const [cinema, setCinema] = useState(false); // full-screen kingdom view
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

  // plotState() itself understands the older `{ id: true }` format and maps it
  // to BUILT, so existing kingdoms keep their buildings and gain wild land.
  // Computed without a hook so it can sit above the early returns below.
  const built = (() => {
    const raw = progress?.buildings || {};
    const out = {};
    for (const id of Object.keys(raw)) out[id] = plotState(raw, id);
    return out;
  })();

  // Full-screen kingdom view. Prefers the real Fullscreen API so the browser
  // chrome also disappears; falls back to a CSS-only "cinema" mode on devices
  // or browsers that refuse it (iOS Safari notably).
  //
  // These hooks must stay ABOVE the early returns below, or React sees a
  // different number of hooks on the first and second render.
  const cinemaRef = useRef(null);
  const wasFullscreen = useRef(false);
  const toggleCinema = useCallback(() => {
    const el = cinemaRef.current;
    if (!el) return;
    const doc = document;
    const isFull = Boolean(doc.fullscreenElement || doc.webkitFullscreenElement);

    // `cinema` is the source of truth, not the fullscreen element: in the CSS
    // fallback there is no fullscreen element at all, so testing for one would
    // make "Exit full screen" re-enter instead of exiting.
    if (cinema) {
      setCinema(false);
      if (isFull) {
        const exit = doc.exitFullscreen?.() ?? doc.webkitExitFullscreen?.();
        // Not awaited: if the promise never settles the UI must still respond.
        exit?.catch?.(() => {});
      }
      return;
    }

    // Apply the CSS cinema mode straight away, then ask for real fullscreen on
    // top. Doing it in this order means the button always does something visible
    // — awaiting requestFullscreen() can hang forever (observed when the request
    // is refused), which previously left the button doing nothing at all.
    setCinema(true);
    try {
      const req = el.requestFullscreen?.() ?? el.webkitRequestFullscreen?.();
      req?.then?.(() => { wasFullscreen.current = true; })?.catch?.(() => {});
    } catch { /* CSS mode is already active */ }
  }, [cinema]);

  // Keep the two in step if the user leaves fullscreen with the Escape key.
  // Only tear down when fullscreen was genuinely entered at some point: a refused
  // request also fires this event, and treating that as "left fullscreen" would
  // immediately cancel the CSS fallback we just switched on.
  useEffect(() => {
    const onChange = () => {
      const isFull = Boolean(document.fullscreenElement || document.webkitFullscreenElement);
      if (isFull) {
        wasFullscreen.current = true;
      } else if (wasFullscreen.current) {
        wasFullscreen.current = false;
        setCinema(false);
      }
    };
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange);
    };
  }, []);

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


  const prosperity = prosperityOf(Object.keys(built).filter((k) => built[k] === PLOT.BUILT));
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
    if (plotState(built, building.id) !== PLOT.CLEARED) {
      flash(`Clear the land first before building the ${building.name}.`);
      return;
    }
    if (gold < building.cost) {
      flash(`You need ${building.cost - gold} more gold for the ${building.name}.`);
      return;
    }
    setBusy(true);
    try {
      const nextBuilt = { ...built, [building.id]: PLOT.BUILT };
      await backend.profiles.update(playerId, { coins: gold - building.cost });
      await saveProgress(nextBuilt, progress.unlocked_kingdoms);
      const p = await backend.profiles.list();
      const updated = p.find((x) => x.id === playerId) || player;

      // Rank-up callout if this build crossed a threshold.
      const before = prosperityOf(Object.keys(built).filter((k) => built[k] === PLOT.BUILT));
      const after = prosperityOf(Object.keys(nextBuilt).filter((k) => nextBuilt[k] === PLOT.BUILT));
      const prevRank = rankForProsperity(before, updated.avatar?.base);
      const newRank = rankForProsperity(after, updated.avatar?.base);

      setPlayer(updated);
      setCelebrating(building.id);
      clearTimeout(celebrateTimer.current);
      celebrateTimer.current = setTimeout(() => setCelebrating(null), 1600);

      // A promotion is the biggest moment in the game, so it gets the fullest
      // sequence; a finished castle is next; everything else is a short reward.
      if (newRank.title !== prevRank.title) {
        setReward({
          kind: "rank",
          title: newRank.title,
          subtitle: `${building.name} made you a ${newRank.title}`,
          icon: newRank.icon,
        });
      } else if (building.castle) {
        setReward({
          kind: "castle",
          title: `${kingdomById(building)?.name || "Region"} complete!`,
          subtitle: "Every plot is built — what a kingdom",
          icon: "🏰",
        });
      } else {
        setReward({
          kind: "build",
          title: building.name,
          subtitle: `Built! +${building.prosperity} prosperity`,
          icon: building.icon || "✨",
        });
      }
    } catch (err) {
      console.error(err);
      flash("Could not save that. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  // Clear wild land so a structure can be built on it.
  const clearLand = async (building) => {
    if (busy) return;
    if (plotState(built, building.id) !== PLOT.WILD) return;
    if (gold < building.clearCost) {
      flash(`You need ${building.clearCost - gold} more gold to clear that land.`);
      return;
    }
    setBusy(true);
    try {
      const nextBuilt = { ...built, [building.id]: PLOT.CLEARED };
      await backend.profiles.update(playerId, { coins: gold - building.clearCost });
      await saveProgress(nextBuilt, progress.unlocked_kingdoms);
      const p = await backend.profiles.list();
      setPlayer(p.find((x) => x.id === playerId) || player);
      setCelebrating(building.id);
      clearTimeout(celebrateTimer.current);
      celebrateTimer.current = setTimeout(() => setCelebrating(null), 1200);
      // Clearing is a step, not an achievement, so it gets a quiet card rather
      // than a full celebration — the real moment comes when something is built.
      setReward({
        kind: "build",
        title: "Land cleared",
        subtitle: `Now you can build the ${building.name}`,
        icon: "🌱",
      });
    } catch (err) {
      console.error(err);
      flash("Could not clear that land. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  // Which territory does a building belong to?
  const kingdomById = (b) => KINGDOMS.find((k) => k.buildings.some((x) => x.id === b.id));

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
      // Claiming a whole new territory is the biggest unlock in the game, so it
      // gets the longest sequence.
      setReward({
        kind: "territory",
        title: `${KINGDOMS[index].name} is yours!`,
        subtitle: `A new land to build — ${KINGDOMS[index].buildings.length} places to fill`,
        // Kingdoms carry a `wild` glyph that represents their landscape.
        icon: KINGDOMS[index].wild || "🗺️",
      });
    } catch (err) {
      console.error(err);
      flash("Could not claim that territory.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`ks-stack${cinema ? " ks-cinema" : ""}`} ref={cinemaRef}>
      {/* Reward moment. Rendered above everything and dismissed by tapping. */}
      {reward && (
        <CelebrationSequence
          kind={reward.kind}
          title={reward.title}
          subtitle={reward.subtitle}
          icon={reward.icon}
          onDone={() => setReward(null)}
        />
      )}

      <div className="ks-spread">
        <h1 className="page-title">Your Kingdom</h1>
        <div className="ks-row" style={{ gap: 8 }}>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={toggleCinema}
            aria-pressed={cinema}
            title="Show the kingdom on the whole screen"
          >
            {cinema ? "⤢ Exit full screen" : "⛶ Full screen"}
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => navigate("/")}>
            ← Dashboard
          </button>
        </div>
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
              ) : isRegionComplete(built, kingdom) ? (
                <span className="badge badge-gold">🏰 Complete</span>
              ) : castleBuilt(built, kingdom) ? (
                <span className="badge badge-gold">🏰 Castle raised</span>
              ) : (
                <span className="badge badge-forest">
                  {kingdom.buildings.filter((b) => plotState(built, b.id) === PLOT.BUILT).length}/
                  {kingdom.buildings.length}
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
                      const state = plotState(built, b.id);
                      if (state === PLOT.WILD) {
                        setToast(
                          gold >= b.clearCost
                            ? `${b.name} — clear the wild land for ${b.clearCost} gold to begin.`
                            : `Clearing that land needs ${b.clearCost - gold} more gold.`
                        );
                      } else {
                        setToast(
                          gold >= b.cost
                            ? `${b.name} — ${b.cost} gold. Tap “Build” below to start.`
                            : `The ${b.name} needs ${b.cost - gold} more gold.`
                        );
                      }
                    }}
                  />
                  {celebrating && <Sparkles />}
                </div>
                <div style={{ marginTop: 14 }}>
                  <BuildOptions
                    kingdom={kingdom}
                    built={built}
                    gold={gold}
                    busy={busy}
                    onClear={clearLand}
                    onBuild={build}
                  />
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
