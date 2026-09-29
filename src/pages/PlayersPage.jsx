// Player profiles — create, edit, and remove child profiles.
// Includes the avatar customizer (base, skin, hair, tunic, gear, companion).

import { useEffect, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { backend } from "../lib/backend";
import Avatar, { AVATAR_OPTIONS, DEFAULT_AVATAR } from "../components/Avatar";
import StatPill from "../components/StatPill";

const GRADES = [1, 2, 3, 4, 5, 6];
const DIFFICULTIES = [
  { id: "easy", label: "Easy" },
  { id: "medium", label: "Medium" },
  { id: "hard", label: "Hard" },
];

function AvatarEditor({ value, onChange }) {
  const set = (key) => (e) => onChange({ ...value, [key]: e.target.value });

  return (
    <div className="card-flat">
      <div className="ks-row" style={{ marginBottom: 14 }}>
        <Avatar config={value} size={88} />
        <div className="ks-small ks-muted">
          Customize this player's adventurer. New gear unlocks through gameplay.
        </div>
      </div>

      <div className="ks-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
        <div className="field">
          <label className="label">Base</label>
          <select className="select" value={value.base} onChange={set("base")}>
            {AVATAR_OPTIONS.bases.map((b) => (
              <option key={b.id} value={b.id}>{b.label}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="label">Skin tone</label>
          <select className="select" value={value.skin} onChange={set("skin")}>
            {AVATAR_OPTIONS.skins.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="label">Hair style</label>
          <select className="select" value={value.hair} onChange={set("hair")}>
            {AVATAR_OPTIONS.hairs.map((h) => (
              <option key={h.id} value={h.id}>{h.label}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="label">Hair color</label>
          <select className="select" value={value.hairColor} onChange={set("hairColor")}>
            {AVATAR_OPTIONS.hairColors.map((h) => (
              <option key={h.id} value={h.id}>{h.label}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="label">Tunic</label>
          <select className="select" value={value.tunic} onChange={set("tunic")}>
            {AVATAR_OPTIONS.tunics.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="label">Cape</label>
          <select className="select" value={value.cape || ""} onChange={(e) => onChange({ ...value, cape: e.target.value || null })}>
            {AVATAR_OPTIONS.capes.map((c) => (
              <option key={c.id || "none"} value={c.id || ""}>{c.label}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="label">Shield</label>
          <select className="select" value={value.shield || ""} onChange={(e) => onChange({ ...value, shield: e.target.value || null })}>
            {AVATAR_OPTIONS.shields.map((s) => (
              <option key={s.id || "none"} value={s.id || ""}>{s.label}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="label">Crown</label>
          <select className="select" value={value.crown || ""} onChange={(e) => onChange({ ...value, crown: e.target.value || null })}>
            {AVATAR_OPTIONS.crowns.map((c) => (
              <option key={c.id || "none"} value={c.id || ""}>{c.label}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="label">Companion</label>
          <select className="select" value={value.companion || ""} onChange={(e) => onChange({ ...value, companion: e.target.value || null })}>
            {AVATAR_OPTIONS.companions.map((c) => (
              <option key={c.id || "none"} value={c.id || ""}>{c.label}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

const emptyForm = {
  name: "",
  grade_level: 1,
  difficulty: "medium",
  avatar: { ...DEFAULT_AVATAR },
};

export default function PlayersPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");

  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(Boolean(editId));
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setProfiles(await backend.profiles.list());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Load the profile being edited.
  useEffect(() => {
    if (!editId) return;
    const p = profiles.find((x) => x.id === editId);
    if (p) {
      setForm({
        name: p.name,
        grade_level: p.grade_level,
        difficulty: p.difficulty,
        avatar: { ...DEFAULT_AVATAR, ...(p.avatar || {}) },
      });
      setShowForm(true);
    }
  }, [editId, profiles]);

  const openCreate = () => {
    setForm(emptyForm);
    setError("");
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.name.trim()) {
      setError("Please enter a player name.");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        parent_id: user.id,
        name: form.name.trim(),
        grade_level: Number(form.grade_level),
        difficulty: form.difficulty,
        avatar: form.avatar,
      };
      if (editId) {
        await backend.profiles.update(editId, payload);
      } else {
        const created = await backend.profiles.create(payload);
        // Give every new player a starter list so they can play right away.
        try {
          await backend.lists.createDefaultFor(created);
        } catch (err) {
          console.error("Could not create starter list", err);
        }
      }
      setShowForm(false);
      setForm(emptyForm);
      await load();
    } catch (err) {
      setError(err?.message || "Could not save the player. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (p) => {
    if (!window.confirm(`Remove ${p.name}? This cannot be undone.`)) return;
    await backend.profiles.remove(p.id);
    if (editId === p.id) setShowForm(false);
    await load();
  };

  return (
    <div className="ks-stack">
      <div className="ks-spread">
        <h1 className="page-title">Players</h1>
        {!showForm && (
          <button type="button" className="btn" onClick={openCreate}>
            + Add Player
          </button>
        )}
      </div>

      {showForm && (
        <form className="card ks-stack" onSubmit={handleSubmit}>
          <h2 className="mt-0">{editId ? "Edit Player" : "New Player"}</h2>

          <div className="field">
            <label className="label" htmlFor="pname">Player name</label>
            <input
              id="pname"
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Mia"
              maxLength={24}
              required
            />
          </div>

          <div className="ks-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
            <div className="field">
              <label className="label" htmlFor="pgrade">Grade</label>
              <select
                id="pgrade"
                className="select"
                value={form.grade_level}
                onChange={(e) => setForm({ ...form, grade_level: Number(e.target.value) })}
              >
                {GRADES.map((g) => (
                  <option key={g} value={g}>Grade {g}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="label" htmlFor="pdiff">Difficulty</label>
              <select
                id="pdiff"
                className="select"
                value={form.difficulty}
                onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
              >
                {DIFFICULTIES.map((d) => (
                  <option key={d.id} value={d.id}>{d.label}</option>
                ))}
              </select>
            </div>
          </div>

          <AvatarEditor value={form.avatar} onChange={(avatar) => setForm({ ...form, avatar })} />

          {error && (
            <p style={{ color: "var(--danger)", fontWeight: 700, margin: 0 }} role="alert">
              {error}
            </p>
          )}

          <div className="ks-row">
            <button type="submit" className="btn ks-grow" disabled={busy}>
              {busy ? "Saving…" : editId ? "Save Changes" : "Create Player"}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setShowForm(false);
                setForm(emptyForm);
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="ks-muted">Loading…</p>
      ) : profiles.length === 0 ? (
        <div className="card text-center">
          <p className="ks-muted">No players yet. Create one to get started!</p>
        </div>
      ) : (
        <div className="ks-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
          {profiles.map((p) => (
            <div key={p.id} className="card">
              <div className="ks-row">
                <Avatar config={p.avatar} size={64} />
                <div className="ks-grow">
                  <h3 className="mt-0 mb-0">{p.name}</h3>
                  <div className="ks-row-wrap" style={{ marginTop: 4 }}>
                    <span className="badge">Grade {p.grade_level}</span>
                    <span className="badge badge-gold">{p.difficulty}</span>
                  </div>
                </div>
              </div>
              <div className="ks-row-wrap" style={{ marginTop: 12 }}>
                <StatPill icon="🔥" value={p.streak || 0} label="Streak" />
                <StatPill icon="🪙" value={p.coins || 0} label="Coins" />
                <StatPill icon="⭐" value={p.xp || 0} label="XP" />
              </div>
              <div className="ks-row" style={{ marginTop: 14 }}>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm ks-grow"
                  onClick={() => navigate(`/players?edit=${p.id}`)}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  onClick={() => handleDelete(p)}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
