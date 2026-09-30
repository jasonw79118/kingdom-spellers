// Small shared helpers used across the app.

// Fisher-Yates. `rng` is injectable so callers that need a reproducible order
// (and the tests) can pin it.
export function shuffleArray(arr, rng = Math.random) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function normalizeWord(word) {
  return (word || "").toString().trim().toLowerCase();
}

// Level curve: each level needs progressively more total XP.
// level 1 -> 0, level 2 -> 100, level 3 -> 250, level 4 -> 450, ...
export function xpForLevel(level) {
  if (level <= 1) return 0;
  return Math.round(50 * (level - 1) * (1 + (level - 1) * 0.5));
}

export function levelForXp(xp) {
  let level = 1;
  while (xpForLevel(level + 1) <= xp && level < 99) level += 1;
  return level;
}

export function xpProgress(xp) {
  const level = levelForXp(xp);
  const floor = xpForLevel(level);
  const ceil = xpForLevel(level + 1);
  const into = xp - floor;
  const span = ceil - floor;
  return { level, into, span, percent: span > 0 ? Math.min(100, Math.round((into / span) * 100)) : 100 };
}

export function todayKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

export function uid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

// Pick n items from arr, weighted so that items with higher weight are
// more likely to appear. Used by adaptive practice to surface weak words.
export function weightedSample(items, weightOf, n) {
  if (!items.length) return [];
  const pool = items.map((item) => ({ item, w: Math.max(0, weightOf(item)) }));
  const picked = [];
  const working = [...pool];
  while (picked.length < n && working.length) {
    const total = working.reduce((s, p) => s + p.w, 0);
    if (total <= 0) {
      picked.push(working.splice(Math.floor(Math.random() * working.length), 1)[0].item);
      continue;
    }
    let r = Math.random() * total;
    let idx = 0;
    for (; idx < working.length; idx += 1) {
      r -= working[idx].w;
      if (r <= 0) break;
    }
    if (idx >= working.length) idx = working.length - 1;
    picked.push(working.splice(idx, 1)[0].item);
  }
  return picked;
}
