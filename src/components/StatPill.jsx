// Small stat display used on player cards and dashboards.

export default function StatPill({ icon, value, label, tone = "" }) {
  return (
    <div className="stat">
      {icon && <span aria-hidden style={{ fontSize: "1.1rem" }}>{icon}</span>}
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}
