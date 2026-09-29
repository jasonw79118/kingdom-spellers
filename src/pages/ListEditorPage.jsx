// List editor — create or edit a spelling list.
//
// Flow:
//   1. Enter a title
//   2. Add words — type one at a time, paste many, or paste from clipboard
//   3. Review — definitions are looked up automatically and can be edited
//   4. Save — words + definitions are stored (definitions saved once)

import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { backend } from "../lib/backend";
import { normalizeWord, uid } from "../lib/utils";
import WordCard from "../components/WordCard";

// Split raw input into clean, deduplicated words.
function parseWords(raw) {
  const parts = raw
    .split(/[\n,;]+/)
    .map((w) => w.trim().toLowerCase().replace(/[^a-z'-]/g, ""))
    .filter(Boolean);
  return [...new Set(parts)];
}

export default function ListEditorPage() {
  const { listId } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(listId);

  const [title, setTitle] = useState("");
  const [words, setWords] = useState([]); // { id, word, kid_definition, example_sentence, part_of_speech }
  const [step, setStep] = useState("add"); // add | review
  const [inputValue, setInputValue] = useState("");
  const [pasteValue, setPasteValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Load existing list when editing.
  useEffect(() => {
    if (!listId) return;
    backend.lists.list().then((lists) => {
      const list = lists.find((l) => l.id === listId);
      if (list) {
        setTitle(list.title);
        setWords(
          (list.words || []).map((w) => ({
            id: w.id || uid(),
            word: w.word,
            kid_definition: w.kid_definition || w.definition || "",
            example_sentence: w.example_sentence || "",
            part_of_speech: w.part_of_speech || "",
          }))
        );
      }
    });
  }, [listId]);

  const addWords = useCallback((raw) => {
    const parsed = parseWords(raw);
    if (!parsed.length) return;
    setWords((prev) => {
      const existing = new Set(prev.map((w) => w.word));
      const fresh = parsed
        .filter((w) => !existing.has(w))
        .map((word) => ({
          id: uid(),
          word,
          kid_definition: "",
          example_sentence: "",
          part_of_speech: "",
        }));
      return [...prev, ...fresh];
    });
  }, []);

  const handleTypeAdd = () => {
    addWords(inputValue);
    setInputValue("");
  };

  const handlePasteAdd = () => {
    addWords(pasteValue);
    setPasteValue("");
  };

  const handleClipboardPaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setPasteValue(text);
        addWords(text);
      }
    } catch {
      setError("Clipboard access blocked — paste manually with Ctrl+V.");
    }
  };

  const removeWord = (id) => {
    setWords((prev) => prev.filter((w) => w.id !== id));
  };

  const updateWord = (id, fields) => {
    setWords((prev) => prev.map((w) => (w.id === id ? { ...w, ...fields } : w)));
  };

  // Look up dictionary definitions for all words before review.
  const handleReview = async () => {
    setBusy(true);
    try {
      const dict = await backend.dictionary.lookup(words.map((w) => w.word));
      setWords((prev) =>
        prev.map((w) => {
          const entry = dict[normalizeWord(w.word)];
          if (!entry) return w;
          return {
            ...w,
            kid_definition: w.kid_definition || entry.kid_definition || entry.definition || "",
            example_sentence: w.example_sentence || entry.example_sentence || "",
            part_of_speech: w.part_of_speech || entry.part_of_speech || "",
          };
        })
      );
      setStep("review");
    } catch (err) {
      console.error(err);
      setError("Could not load definitions.");
    } finally {
      setBusy(false);
    }
  };

  const handleSave = async () => {
    setBusy(true);
    setError("");
    try {
      let id = listId;
      if (!id) {
        const created = await backend.lists.create({
          title: title.trim() || "Untitled List",
          source: "manual",
        });
        id = created.id;
      }
      await backend.lists.saveWords(
        id,
        words.map((w) => ({
          word: w.word,
          kid_definition: w.kid_definition,
          example_sentence: w.example_sentence,
          part_of_speech: w.part_of_speech,
        }))
      );
      navigate("/lists");
    } catch (err) {
      console.error(err);
      setError("Could not save the list. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ks-stack">
      <div className="ks-spread">
        <h1 className="page-title">{isEditing ? "Edit List" : "New Spelling List"}</h1>
        {step === "review" && (
          <button type="button" className="btn btn-ghost" onClick={() => setStep("add")}>
            ← Back to words
          </button>
        )}
      </div>

      {step === "add" && (
        <>
          <div className="card ks-stack">
            <div className="field">
              <label className="label" htmlFor="list-title">List title</label>
              <input
                id="list-title"
                className="input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Week 4 Spelling"
                maxLength={60}
              />
            </div>
          </div>

          {/* Type words */}
          <div className="card ks-stack">
            <h2 className="mt-0" style={{ fontSize: "1.15rem" }}>Type words</h2>
            <p className="ks-muted ks-small" style={{ margin: 0 }}>
              Type a word and press Enter or Add. Commas work too.
            </p>
            <div className="ks-row">
              <input
                className="input ks-grow"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleTypeAdd();
                  }
                }}
                placeholder="apple"
              />
              <button type="button" className="btn" onClick={handleTypeAdd}>
                Add
              </button>
            </div>
          </div>

          {/* Paste words */}
          <div className="card ks-stack">
            <h2 className="mt-0" style={{ fontSize: "1.15rem" }}>Paste words</h2>
            <p className="ks-muted ks-small" style={{ margin: 0 }}>
              Paste many words at once — one per line, or separated by commas.
            </p>
            <textarea
              className="textarea"
              value={pasteValue}
              onChange={(e) => setPasteValue(e.target.value)}
              placeholder={"apple\nbecause\nfriend\nschool"}
              rows={4}
            />
            <div className="ks-row">
              <button type="button" className="btn ks-grow" onClick={handlePasteAdd}>
                Add pasted words
              </button>
              <button type="button" className="btn btn-ghost" onClick={handleClipboardPaste}>
                📋 Paste from clipboard
              </button>
            </div>
          </div>

          {/* Word chips */}
          {words.length > 0 && (
            <div className="card">
              <div className="ks-spread">
                <h2 className="mt-0 mb-0" style={{ fontSize: "1.15rem" }}>
                  {words.length} word{words.length !== 1 ? "s" : ""}
                </h2>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setWords([])}>
                  Clear all
                </button>
              </div>
              <div className="ks-row-wrap" style={{ marginTop: 12 }}>
                {words.map((w) => (
                  <span key={w.id} className="badge" style={{ fontSize: "0.95rem", padding: "8px 14px" }}>
                    {w.word}
                    <button
                      type="button"
                      onClick={() => removeWord(w.id)}
                      aria-label={`Remove ${w.word}`}
                      style={{ marginLeft: 6, opacity: 0.7 }}
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {words.length > 0 && (
            <div className="ks-center">
              <button
                type="button"
                className="btn btn-lg btn-forest"
                onClick={handleReview}
                disabled={busy}
              >
                {busy ? "Loading…" : "Continue to Review →"}
              </button>
            </div>
          )}
        </>
      )}

      {step === "review" && (
        <>
          <div className="card">
            <h2 className="mt-0 mb-0" style={{ fontSize: "1.15rem" }}>
              Review & edit definitions
            </h2>
            <p className="ks-muted ks-small" style={{ margin: "4px 0 0" }}>
              Definitions are filled in automatically. Tap ✏️ on any word to edit
              its definition, example, or part of speech.
            </p>
          </div>

          <div className="ks-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
            {words.map((w) => (
              <WordCard
                key={w.id}
                word={w}
                editable
                onChange={(id, fields) => updateWord(id, fields)}
              />
            ))}
          </div>

          {error && (
            <p style={{ color: "var(--danger)", fontWeight: 700 }} role="alert">
              {error}
            </p>
          )}

          <div className="ks-center">
            <button
              type="button"
              className="btn btn-lg btn-forest"
              onClick={handleSave}
              disabled={busy}
            >
              {busy ? "Saving…" : `Save ${words.length} word${words.length !== 1 ? "s" : ""}`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
