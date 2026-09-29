// Spelling lists — view all lists, create new, edit, delete.

import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { backend } from "../lib/backend";
import { formatDate } from "../lib/utils";

const SOURCE_LABELS = {
  manual: "Typed",
  paste: "Pasted",
  ocr: "Scanned",
  default: "Starter",
};

export default function ListsPage() {
  const navigate = useNavigate();
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Ensure every player has at least a starter list so the game is
      // always playable (also backfills players created before this feature).
      const [profiles, existing] = await Promise.all([
        backend.profiles.list(),
        backend.lists.list(),
      ]);
      const playersWithLists = new Set(existing.map((l) => l.player_id).filter(Boolean));
      for (const profile of profiles) {
        if (!playersWithLists.has(profile.id)) {
          try {
            await backend.lists.createDefaultFor(profile);
          } catch (err) {
            console.error("Could not create starter list", err);
          }
        }
      }
      setLists(await backend.lists.list());
    } catch (err) {
      console.error("Failed to load lists", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (list) => {
    if (!window.confirm(`Delete "${list.title}"? This cannot be undone.`)) return;
    await backend.lists.remove(list.id);
    await load();
  };

  return (
    <div className="ks-stack">
      <div className="ks-spread">
        <h1 className="page-title">Spelling Lists</h1>
        <button type="button" className="btn" onClick={() => navigate("/lists/new")}>
          + New List
        </button>
      </div>

      {loading ? (
        <p className="ks-muted">Loading…</p>
      ) : lists.length === 0 ? (
        <div className="card text-center">
          <div style={{ fontSize: "2.6rem" }} aria-hidden>📚</div>
          <h2>No spelling lists yet</h2>
          <p className="ks-muted">
            Create a list by typing or pasting words. Definitions are added
            automatically and can be edited before saving.
          </p>
          <button type="button" className="btn btn-lg" onClick={() => navigate("/lists/new")}>
            + Create Your First List
          </button>
        </div>
      ) : (
        <div className="ks-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
          {lists.map((list) => (
            <div key={list.id} className="card">
              <div className="ks-spread">
                <h3 className="mt-0 mb-0" style={{ fontSize: "1.2rem" }}>
                  {list.title}
                </h3>
                <span className="badge badge-gold">
                  {SOURCE_LABELS[list.source] || list.source}
                </span>
              </div>
              <p className="ks-muted ks-small" style={{ margin: "8px 0 0" }}>
                {list.words?.length || 0} words · {formatDate(list.created_at)}
              </p>
              <div className="ks-row" style={{ marginTop: 14 }}>
                <button
                  type="button"
                  className="btn btn-forest btn-sm ks-grow"
                  onClick={() => navigate(`/lists/${list.id}`)}
                >
                  Open
                </button>
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  onClick={() => handleDelete(list)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
