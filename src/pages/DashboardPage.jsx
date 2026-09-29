// Parent dashboard — welcome, child player cards, and parent controls.

import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { backend } from "../lib/backend";
import PlayerCard from "../components/PlayerCard";

const PARENT_CONTROLS = [
  { icon: "📝", label: "New Spelling List", to: "/lists/new", soon: false },
  { icon: "📷", label: "Scan Spelling List", to: "/lists/scan", soon: false },
  { icon: "📚", label: "My Lists", to: "/lists", soon: false },
  { icon: "📊", label: "Progress", to: "/progress", soon: true },
  { icon: "👤", label: "Players", to: "/players", soon: false },
  { icon: "⚙️", label: "Settings", to: "/settings", soon: true },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await backend.profiles.list();
      setProfiles(list);
    } catch (err) {
      console.error("Failed to load profiles", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handlePlay = (profile) => {
    // The new practice/game modes arrive in Phase 5; for now, play routes to
    // the spelling lists so children always have something to do.
    navigate("/lists", { state: { playerId: profile.id, playerName: profile.name } });
  };

  const firstName = user?.name?.split(" ")[0] || "there";

  return (
    <div className="ks-stack">
      <div className="ks-spread">
        <div>
          <h1 className="page-title">Welcome back, {firstName}!</h1>
          <p className="ks-muted" style={{ margin: 0 }}>
            Choose a player to start their spelling adventure.
          </p>
        </div>
      </div>

      {/* parent controls */}
      <div className="ks-row-wrap">
        {PARENT_CONTROLS.map((c) => (
          <button
            key={c.label}
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => !c.soon && navigate(c.to)}
            disabled={c.soon}
            title={c.soon ? "Coming soon" : c.label}
            style={c.soon ? { opacity: 0.6 } : undefined}
          >
            <span aria-hidden>{c.icon}</span> {c.label}
            {c.soon && <span className="badge badge-gold" style={{ fontSize: "0.65rem" }}>soon</span>}
          </button>
        ))}
      </div>

      {/* player cards */}
      {loading ? (
        <p className="ks-muted">Loading players…</p>
      ) : profiles.length === 0 ? (
        <div className="card text-center">
          <div style={{ fontSize: "2.6rem" }} aria-hidden>🏰</div>
          <h2>No players yet</h2>
          <p className="ks-muted">
            Create a child profile to begin. Each player gets their own kingdom,
            XP, streaks, and spelling progress.
          </p>
          <button type="button" className="btn btn-lg" onClick={() => navigate("/players")}>
            + Add a Player
          </button>
        </div>
      ) : (
        <div className="ks-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
          {profiles.map((p) => (
            <PlayerCard key={p.id} profile={p} onPlay={handlePlay} />
          ))}
        </div>
      )}

      {profiles.length > 0 && (
        <div className="ks-center">
          <button type="button" className="btn btn-ghost" onClick={() => navigate("/players")}>
            + Add another player
          </button>
        </div>
      )}
    </div>
  );
}
