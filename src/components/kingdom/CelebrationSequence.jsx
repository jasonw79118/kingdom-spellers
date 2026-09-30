// Celebration sequence — the reward moment when a child buys something,
// finishes a castle, claims a new territory, or is promoted.
//
// Why an animated sequence rather than a video file:
//   A video would be a few megabytes, would play the same thing regardless of
//   what was actually bought, and would need re-exporting every time a building
//   or message changed. A staged sequence is built from the real event, adapts
//   to it, stays sharp on any screen, costs nothing to download, and respects
//   the device's motion settings.
//
// The sequence runs in four beats:
//   1. flash    — a bright bloom, so the eye goes to the centre
//   2. burst    — particles thrown from that point (canvas)
//   3. reveal   — the title card lands with the name of what was earned
//   4. settle   — particles drift away, the card lifts, control returns
//
// It can be dismissed at any time by tapping or pressing Escape/Enter, and it
// renders a short, calm version when the device asks for reduced motion.

import { useCallback, useEffect, useRef, useState } from "react";

// Beats in milliseconds. `build` is quick so it doesn't get in the way of
// building several plots in a row; the bigger milestones are allowed to breathe.
const TIMINGS = {
  build: { flash: 320, burst: 900, reveal: 300, hold: 900, settle: 420 },
  castle: { flash: 420, burst: 1400, reveal: 360, hold: 1500, settle: 520 },
  territory: { flash: 560, burst: 2000, reveal: 420, hold: 1900, settle: 640 },
  rank: { flash: 500, burst: 1700, reveal: 400, hold: 1700, settle: 600 },
};

const PALETTES = {
  build: ["#ffd76a", "#ffb347", "#8fe3a8", "#7fd4ff", "#ffffff"],
  castle: ["#ffd76a", "#ffb703", "#ffe9a8", "#ffffff", "#c9a227"],
  territory: ["#ffd76a", "#ff8fa3", "#8fe3a8", "#7fd4ff", "#c9a227", "#ffffff"],
  rank: ["#ffd76a", "#ffe9a8", "#ffffff", "#ffb347", "#c9a227"],
};

// Particles are capped so this stays smooth on the low-end tablets and school
// Chromebooks this app is likely to run on.
const MAX_PARTICLES = { build: 90, castle: 170, territory: 260, rank: 220 };

const rand = (a, b) => a + Math.random() * (b - a);

function spawnParticles(kind, palette, count, w, h) {
  const out = [];
  const cx = w / 2;
  const cy = h * 0.46;
  for (let i = 0; i < count; i += 1) {
    const angle = rand(0, Math.PI * 2);
    const speed = rand(3.5, 13) * (kind === "territory" ? 1.25 : 1);
    const isMote = Math.random() < 0.28;

    out.push({
      x: cx + rand(-40, 40),
      y: cy + rand(-24, 24),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - rand(2, 7), // bias upward
      g: isMote ? rand(0.008, 0.03) : rand(0.12, 0.3),
      drag: rand(0.982, 0.995),
      w: isMote ? rand(2, 5) : rand(5, 11),
      h: isMote ? rand(2, 5) : rand(8, 16),
      rot: rand(0, Math.PI * 2),
      vr: rand(-0.22, 0.22),
      color: palette[Math.floor(Math.random() * palette.length)],
      life: 1,
      decay: rand(0.0035, 0.011),
      isMote,
      // A few pieces are stars rather than rectangles, which reads as "magic".
      star: !isMote && Math.random() < 0.22,
    });
  }
  return out;
}

function drawStar(ctx, r) {
  ctx.beginPath();
  for (let i = 0; i < 8; i += 1) {
    const a = (i / 8) * Math.PI * 2;
    const rad = i % 2 === 0 ? r : r * 0.42;
    const px = Math.cos(a) * rad;
    const py = Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

/**
 * A full-screen reward moment.
 *
 * @param {object}  props
 * @param {"build"|"castle"|"territory"|"rank"} props.kind
 * @param {string}  props.title    e.g. "Watchtower"
 * @param {string}  props.subtitle  e.g. "+4 prosperity"
 * @param {string}  [props.icon]   emoji shown on the card
 * @param {() => void} [props.onDone]
 */
export default function CelebrationSequence({ kind = "build", title, subtitle, icon, onDone }) {
  const canvasRef = useRef(null);
  const [visible, setVisible] = useState(true);
  const [phase, setPhase] = useState("flash");
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  // Honour the OS "reduce motion" setting — show the card, skip the movement.
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(Boolean(mq?.matches));
    apply();
    mq?.addEventListener?.("change", apply);
    return () => mq?.removeEventListener?.("change", apply);
  }, []);

  const finish = useCallback(() => {
    setVisible(false);
    // Let the fade-out finish before the parent resets its state.
    setTimeout(() => doneRef.current?.(), 260);
  }, []);

  // --- beat scheduling ----------------------------------------------------
  useEffect(() => {
    if (!visible) return undefined;
    if (reduced) {
      setPhase("reveal");
      const t = setTimeout(finish, 2600);
      return () => clearTimeout(t);
    }

    const time = TIMINGS[kind] || TIMINGS.build;
    const timers = [];
    timers.push(setTimeout(() => setPhase("burst"), time.flash));
    timers.push(
      setTimeout(() => setPhase("reveal"), time.flash + time.burst * 0.35)
    );
    timers.push(
      setTimeout(() => setPhase("hold"), time.flash + time.burst * 0.35 + time.reveal)
    );
    timers.push(
      setTimeout(
        () => setPhase("settle"),
        time.flash + time.burst * 0.35 + time.reveal + time.hold
      )
    );
    timers.push(
      setTimeout(
        finish,
        time.flash + time.burst * 0.35 + time.reveal + time.hold + time.settle
      )
    );
    return () => timers.forEach(clearTimeout);
  }, [kind, reduced, visible, finish]);

  // --- particle engine ----------------------------------------------------
  useEffect(() => {
    if (!visible || reduced) return undefined;
    if (phase === "flash") return undefined;

    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return { w, h };
    };

    let { w, h } = resize();
    const onResize = () => { ({ w, h } = resize()); };
    window.addEventListener("resize", onResize);

    const palette = PALETTES[kind] || PALETTES.build;
    let particles = spawnParticles(kind, palette, MAX_PARTICLES[kind] || 90, w, h);

    let raf = 0;
    let ring = 0;

    const tick = () => {
      ctx.clearRect(0, 0, w, h);

      // Expanding shockwave ring on the first beat.
      if (phase === "burst" || ring < 1) {
        ring += 0.035;
        if (ring <= 1) {
          ctx.beginPath();
          ctx.arc(w / 2, h * 0.46, ring * Math.min(w, h) * 0.55, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(255, 231, 168, ${Math.max(0, 0.7 * (1 - ring))})`;
          ctx.lineWidth = 6 * (1 - ring) + 1;
          ctx.stroke();
        }
      }

      for (const p of particles) {
        p.vx *= p.drag;
        p.vy = p.vy * p.drag + p.g;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        p.life -= p.decay;

        if (p.life <= 0 || p.y > h + 60) continue;

        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, p.life));
        ctx.fillStyle = p.color;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        if (p.star) drawStar(ctx, p.w * 0.7);
        else ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, [visible, reduced, phase, kind]);

  // --- keyboard -----------------------------------------------------------
  useEffect(() => {
    if (!visible) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        finish();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, finish]);

  if (!visible) return null;

  const time = TIMINGS[kind] || TIMINGS.build;
  const cardAnim =
    phase === "reveal"
      ? "ks-cel-pop"
      : phase === "settle"
      ? "ks-cel-out"
      : "ks-cel-in";

  return (
    <div
      className="ks-cel"
      role="dialog"
      aria-live="polite"
      aria-label={`${title} unlocked`}
      onClick={finish}
      style={{ animationDuration: `${time.settle}ms` }}
    >
      <div
        className={`ks-cel-flash ${phase === "flash" ? "on" : ""}`}
        style={{ animationDuration: `${time.flash + 260}ms` }}
      />
      <canvas ref={canvasRef} className="ks-cel-canvas" />
      <div className={`ks-cel-card ${cardAnim}`} style={{ animationDuration: `${time.reveal + 200}ms` }}>
        {icon && <div className="ks-cel-icon">{icon}</div>}
        <div className="ks-cel-title">{title}</div>
        {subtitle && <div className="ks-cel-sub">{subtitle}</div>}
      </div>
      {!reduced && (
        <button
          type="button"
          className="ks-cel-skip"
          onClick={finish}
          aria-label="Skip celebration"
        >
          Skip
        </button>
      )}
    </div>
  );
}
