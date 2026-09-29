// Scan Spelling List — photograph a printed list, extract words with OCR,
// review them, then save. OCR never auto-saves; the parent always confirms.

import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { backend } from "../lib/backend";
import { runOcr } from "../lib/ocr";

export default function ScanListPage() {
  const navigate = useNavigate();
  const cameraInputRef = useRef(null);
  const uploadInputRef = useRef(null);

  const [step, setStep] = useState("capture"); // capture | review
  const [imageUrl, setImageUrl] = useState(null);
  const [progress, setProgress] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [candidates, setCandidates] = useState([]); // { word, checked }
  const [rawText, setRawText] = useState("");
  const [players, setPlayers] = useState([]);
  const [playerId, setPlayerId] = useState("");

  // Which child is this list for? Every list must belong to a player, or it
  // will not show up when that child plays.
  useEffect(() => {
    backend.profiles
      .list()
      .then((list) => {
        setPlayers(list);
        if (list.length && !playerId) setPlayerId(list[0].id);
      })
      .catch(() => setPlayers([]));
  }, [playerId]);

  useEffect(() => {
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
  }, [imageUrl]);

  const handleFile = useCallback(async (file) => {
    if (!file) return;
    setError("");
    setProcessing(true);
    setProgress(0);
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    setImageUrl(URL.createObjectURL(file));

    try {
      const { text, candidates: found } = await runOcr(file, setProgress);
      setRawText(text);
      setCandidates(found.map((word) => ({ word, checked: true })));
      setStep("review");
    } catch (err) {
      console.error(err);
      setError("Could not read that image. Try a clearer, well-lit photo.");
      setStep("capture");
    } finally {
      setProcessing(false);
    }
  }, [imageUrl]);

  const toggle = (i) => {
    setCandidates((prev) =>
      prev.map((c, idx) => (idx === i ? { ...c, checked: !c.checked } : c))
    );
  };

  const removeCandidate = (i) => {
    setCandidates((prev) => prev.filter((_, idx) => idx !== i));
  };

  const editCandidate = (i, value) => {
    setCandidates((prev) =>
      prev.map((c, idx) =>
        idx === i
          ? { ...c, word: value.toLowerCase().replace(/[^a-z'-]/g, ""), checked: true }
          : c
      )
    );
  };

  const addManual = () => {
    setCandidates((prev) => [...prev, { word: "", checked: true }]);
  };

  const checkedWords = candidates.filter((c) => c.checked && c.word.trim());

  const handleSave = async () => {
    if (checkedWords.length === 0) {
      setError("Select at least one word to save.");
      return;
    }
    setError("");
    setProcessing(true);
    try {
      const created = await backend.lists.create({
        player_id: playerId,
        title: title.trim() || "Scanned List",
        source: "ocr",
      });
      await backend.lists.saveWords(
        created.id,
        checkedWords.map((c) => ({ word: c.word.trim() }))
      );
      navigate("/lists");
    } catch (err) {
      console.error(err);
      setError("Could not save the list. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  const startOver = () => {
    setStep("capture");
    setCandidates([]);
    setRawText("");
    setError("");
    setProgress(0);
    if (imageUrl) {
      URL.revokeObjectURL(imageUrl);
      setImageUrl(null);
    }
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    if (uploadInputRef.current) uploadInputRef.current.value = "";
  };

  return (
    <div className="ks-stack">
      <div className="ks-spread">
        <h1 className="page-title">Scan Spelling List</h1>
        {step === "review" && (
          <button type="button" className="btn btn-ghost" onClick={startOver}>
            Start over
          </button>
        )}
      </div>

      {step === "capture" && (
        <>
          <div className="card ks-stack">
            <h2 className="mt-0" style={{ fontSize: "1.15rem" }}>Photograph your list</h2>
            <p className="ks-muted" style={{ margin: 0 }}>
              Take a clear photo of the printed list — one word per line works
              best. Words are read on your device; nothing is uploaded.
            </p>

            <div className="ks-row-wrap">
              <button
                type="button"
                className="btn btn-lg"
                onClick={() => cameraInputRef.current?.click()}
                disabled={processing}
              >
                📷 Open camera
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-lg"
                onClick={() => uploadInputRef.current?.click()}
                disabled={processing}
              >
                🖼️ Upload image
              </button>
            </div>

            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              hidden
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
            <input
              ref={uploadInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => handleFile(e.target.files?.[0])}
            />

            {processing && (
              <div className="ks-stack" style={{ gap: 6 }}>
                <div className="ks-spread ks-small">
                  <span className="ks-muted">Reading words…</span>
                  <span>{Math.round(progress * 100)}%</span>
                </div>
                <div className="progress">
                  <div className="progress-fill" style={{ width: `${Math.round(progress * 100)}%` }} />
                </div>
              </div>
            )}

            {error && (
              <p style={{ color: "var(--danger)", fontWeight: 700, margin: 0 }} role="alert">
                {error}
              </p>
            )}

            <p className="ks-small ks-muted" style={{ margin: 0 }}>
              Tip: good lighting and a flat page give the best results.
            </p>
          </div>
        </>
      )}

      {step === "review" && (
        <>
          {imageUrl && (
            <div className="card">
              <h2 className="mt-0" style={{ fontSize: "1.15rem" }}>Scanned image</h2>
              <img
                src={imageUrl}
                alt="Scanned spelling list"
                style={{ width: "100%", borderRadius: "var(--radius)", marginTop: 8 }}
              />
            </div>
          )}

          <div className="card ks-stack">
            <div className="field" style={{ marginBottom: 0 }}>
              <label className="label" htmlFor="scan-title">List title</label>
              <input
                id="scan-title"
                className="input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Week 4 Spelling"
                maxLength={60}
              />
            </div>

            {players.length > 1 && (
              <div className="field" style={{ marginBottom: 0 }}>
                <label className="label" htmlFor="scan-player">Who is this list for?</label>
                <select
                  id="scan-player"
                  className="select"
                  value={playerId}
                  onChange={(e) => setPlayerId(e.target.value)}
                >
                  {players.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="card ks-stack">
            <div className="ks-spread">
              <h2 className="mt-0 mb-0" style={{ fontSize: "1.15rem" }}>
                Review words ({checkedWords.length} selected)
              </h2>
              <button type="button" className="btn btn-ghost btn-sm" onClick={addManual}>
                + Add word
              </button>
            </div>
            <p className="ks-muted ks-small" style={{ margin: 0 }}>
              Uncheck anything that isn't a spelling word. Tap a word to fix a
              misread. Nothing is saved until you press Save.
            </p>

            {candidates.length === 0 ? (
              <p className="ks-muted" style={{ margin: 0 }}>
                No words were found. Try a clearer photo, or add words manually.
              </p>
            ) : (
              <div className="ks-row-wrap">
                {candidates.map((c, i) => (
                  <div
                    key={i}
                    className="ks-row"
                    style={{
                      gap: 6,
                      padding: "4px 10px",
                      borderRadius: "var(--radius-pill)",
                      background: c.checked ? "rgba(74,124,89,0.14)" : "rgba(45,42,50,0.08)",
                      opacity: c.checked ? 1 : 0.6,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={c.checked}
                      onChange={() => toggle(i)}
                      aria-label={`Include ${c.word}`}
                    />
                    <input
                      className="input"
                      value={c.word}
                      onChange={(e) => editCandidate(i, e.target.value)}
                      style={{
                        width: 120,
                        padding: "2px 6px",
                        border: "none",
                        background: "transparent",
                        fontWeight: 700,
                      }}
                      aria-label={`Edit word ${i + 1}`}
                    />
                    <button
                      type="button"
                      onClick={() => removeCandidate(i)}
                      aria-label={`Remove ${c.word}`}
                      style={{ opacity: 0.6 }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            {rawText && (
              <details>
                <summary className="ks-small ks-muted" style={{ cursor: "pointer" }}>
                  View raw text from OCR
                </summary>
                <pre
                  className="ks-small"
                  style={{
                    whiteSpace: "pre-wrap",
                    background: "rgba(45,42,50,0.06)",
                    padding: 12,
                    borderRadius: "var(--radius)",
                    marginTop: 8,
                    maxHeight: 220,
                    overflow: "auto",
                  }}
                >
                  {rawText}
                </pre>
              </details>
            )}

            {error && (
              <p style={{ color: "var(--danger)", fontWeight: 700, margin: 0 }} role="alert">
                {error}
              </p>
            )}

            <div className="ks-center">
              <button
                type="button"
                className="btn btn-lg btn-forest"
                onClick={handleSave}
                disabled={processing || checkedWords.length === 0}
              >
                {processing ? "Saving…" : `Save ${checkedWords.length} word${checkedWords.length !== 1 ? "s" : ""}`}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
