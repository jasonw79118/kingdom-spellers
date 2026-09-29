// Word card — shows a spelling word with its definition, example sentence,
// and part of speech. Includes text-to-speech for word/definition/sentence
// and inline editing of the definition fields.

import { useState } from "react";
import { speakWord, speakSlow, speakSentence, stopSpeaking } from "../lib/speech";

const MASTERY_TONES = {
  new: "",
  learning: "badge-rose",
  practicing: "badge-gold",
  strong: "badge-forest",
  mastered: "badge",
};

export default function WordCard({ word, mastery, onChange, editable = false }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    kid_definition: word.kid_definition || word.definition || "",
    example_sentence: word.example_sentence || "",
    part_of_speech: word.part_of_speech || "",
  });

  const startEdit = () => {
    setDraft({
      kid_definition: word.kid_definition || word.definition || "",
      example_sentence: word.example_sentence || "",
      part_of_speech: word.part_of_speech || "",
    });
    setEditing(true);
  };

  const save = () => {
    onChange?.(word.id, draft);
    setEditing(false);
  };

  const masteryLevel = mastery?.mastery_level;

  return (
    <div className="card-flat" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div className="ks-spread">
        <div className="ks-row" style={{ gap: 10 }}>
          <h3 style={{ margin: 0, fontSize: "1.4rem", letterSpacing: "0.02em" }}>
            {word.word}
          </h3>
          {masteryLevel && (
            <span className={`badge ${MASTERY_TONES[masteryLevel] || ""}`}>
              {masteryLevel}
            </span>
          )}
        </div>
        <div className="ks-row" style={{ gap: 4 }}>
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-icon"
            onClick={() => speakWord(word.word)}
            title="Hear word"
            aria-label={`Hear ${word.word}`}
          >
            🔊
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-icon"
            onClick={() => speakSlow(draft.kid_definition || word.kid_definition || word.definition)}
            title="Hear definition"
            aria-label="Hear definition"
          >
            📖
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-icon"
            onClick={() => speakSentence(draft.example_sentence || word.example_sentence)}
            title="Hear sentence"
            aria-label="Hear sentence"
          >
            💬
          </button>
          {editable && (
            <button
              type="button"
              className="btn btn-ghost btn-sm btn-icon"
              onClick={editing ? save : startEdit}
              title={editing ? "Save" : "Edit definition"}
              aria-label={editing ? "Save definition" : "Edit definition"}
            >
              {editing ? "💾" : "✏️"}
            </button>
          )}
        </div>
      </div>

      {editing ? (
        <div className="ks-stack" style={{ gap: 8 }}>
          <div className="field" style={{ marginBottom: 0 }}>
            <label className="label">Definition</label>
            <textarea
              className="textarea"
              value={draft.kid_definition}
              onChange={(e) => setDraft({ ...draft, kid_definition: e.target.value })}
              rows={2}
            />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label className="label">Example sentence</label>
            <input
              className="input"
              value={draft.example_sentence}
              onChange={(e) => setDraft({ ...draft, example_sentence: e.target.value })}
              placeholder={`We use "${word.word}" in a sentence…`}
            />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label className="label">Part of speech</label>
            <input
              className="input"
              value={draft.part_of_speech}
              onChange={(e) => setDraft({ ...draft, part_of_speech: e.target.value })}
              placeholder="noun, verb, adjective…"
            />
          </div>
          <div className="ks-row">
            <button type="button" className="btn btn-sm btn-forest ks-grow" onClick={save}>
              Save
            </button>
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => setEditing(false)}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <p style={{ margin: 0 }}>
            <strong>Definition:</strong>{" "}
            <span className="ks-muted">
              {word.kid_definition || word.definition || "—"}
            </span>
          </p>
          {word.example_sentence && (
            <p style={{ margin: 0 }} className="ks-small ks-muted">
              <em>"{word.example_sentence}"</em>
            </p>
          )}
          {word.part_of_speech && (
            <span className="badge" style={{ alignSelf: "flex-start" }}>
              {word.part_of_speech}
            </span>
          )}
        </>
      )}
    </div>
  );
}
