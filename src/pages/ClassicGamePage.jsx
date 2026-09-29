// Classic game — the original Kingdom Spellers experience, preserved at
// /classic while the new game modes are built. Receives an optional player
// via navigation state so the dashboard "Play" button can pass context.

import { useLocation } from "react-router-dom";
import KingdomSpellers from "../legacy/KingdomSpellers";
import "../legacy/legacy.css";

export default function ClassicGamePage() {
  const location = useLocation();
  const player = location.state?.playerName;

  return (
    <div>
      {player && (
        <p className="text-center ks-muted" style={{ marginTop: 0 }}>
          Playing as <strong>{player}</strong> — the new adventure modes are coming soon!
        </p>
      )}
      <KingdomSpellers />
    </div>
  );
}
