// Progress bar with optional label and tone.

export default function ProgressBar({ percent = 0, tone = "", label }) {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  return (
    <div>
      {label && (
        <div className="ks-spread ks-small ks-muted" style={{ marginBottom: 4 }}>
          <span>{label}</span>
          <span>{clamped}%</span>
        </div>
      )}
      <div className={`progress ${tone}`} role="progressbar" aria-valuenow={clamped} aria-valuemin={0} aria-valuemax={100}>
        <div className="progress-fill" style={{ width: `${clamped}%` }} />
      </div>
    </div>
  );
}
