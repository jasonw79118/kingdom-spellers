// Child player card shown on the dashboard.

import { Link } from "react-router-dom";
import Avatar from "./Avatar";
import StatPill from "./StatPill";
import ProgressBar from "./ProgressBar";
import { xpProgress } from "../lib/utils";

export default function PlayerCard({ profile, onPlay }) {
  const xp = xpProgress(profile.xp || 0);

  return (
    <div className="card">
      <div className="ks-spread">
        <div className="ks-row">
          <Avatar config={profile.avatar} size={72} />
          <div>
            <h3 className="mt-0 mb-0" style={{ fontSize: "1.25rem" }}>
              {profile.name}
            </h3>
            <div className="ks-row-wrap" style={{ marginTop: 4 }}>
              <span className="badge">Grade {profile.grade_level}</span>
              <span className="badge badge-gold">{profile.difficulty}</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ margin: "14px 0 6px" }}>
        <ProgressBar percent={xp.percent} tone="royal" label={`Level ${xp.level} — ${xp.into}/${xp.span} XP`} />
      </div>

      <div className="ks-row-wrap" style={{ marginTop: 12 }}>
        <StatPill icon="🔥" value={profile.streak || 0} label="Streak" />
        <StatPill icon="🪙" value={profile.coins || 0} label="Coins" />
        <StatPill icon="⭐" value={profile.xp || 0} label="Total XP" />
      </div>

      <div className="ks-row" style={{ marginTop: 16 }}>
        <button type="button" className="btn btn-forest ks-grow" onClick={() => onPlay?.(profile)}>
          ▶ Play
        </button>
        <Link to={`/players?edit=${profile.id}`} className="btn btn-ghost">
          Edit
        </Link>
      </div>
    </div>
  );
}
