// Voice picker — lets a parent or child choose the reading voice and how fast
// words are spoken. Voices are listed best-first, and the current choice is
// previewed so you can hear it before saving.

import { useEffect, useState, useMemo } from "react";
import {
  rankedVoices, getVoicePref, setVoicePref, speakWord, RATE, warmVoices,
} from "../lib/speech";

const SLOW_KEY = "ks2_speak_slow";

export function prefersSlow() {
  return localStorage.getItem(SLOW_KEY) === "1";
}

export function setPrefersSlow(on) {
  localStorage.setItem(SLOW_KEY, on ? "1" : "0");
}

export default function VoicePicker({ onChange }) {
  const [voices, setVoices] = useState([]);
  const [pref, setPref] = useState(() => getVoicePref());
  const [slow, setSlow] = useState(() => prefersSlow());

  // Voices load asynchronously in most browsers.
  useEffect(() => {
    warmVoices();
    const load = () => setVoices(rankedVoices());
    load();
    const synth = window.speechSynthesis;
    if (synth?.addEventListener) {
      synth.addEventListener("voiceschanged", load);
      return () => synth.removeEventListener("voiceschanged", load);
    }
  }, []);

  const active = useMemo(
    () => voices.find((v) => v.voiceURI === pref)?.name || voices[0]?.name || "",
    [voices, pref]
  );

  const handleVoice = (e) => {
    const v = e.target.value;
    setPref(v);
    setVoicePref(v);
    setPrefersSlow(slow);
    speakWord("kingdom", { slow });
    onChange?.(v);
  };

  const handleSlow = () => {
    const next = !slow;
    setSlow(next);
    setPrefersSlow(next);
    speakWord("elephant", { slow: next });
  };

  if (!voices.length) {
    return (
      <div className="card-flat">
        <div className="label">Reading voice</div>
        <p className="ks-small ks-muted" style={{ margin: "4px 0 0" }}>
          No speech voices found on this device.
        </p>
      </div>
    );
  }

  return (
    <div className="card-flat ks-stack" style={{ gap: 10 }}>
      <div>
        <div className="label">Reading voice</div>
        <p className="ks-small ks-muted" style={{ margin: 0 }}>
          Highest-quality voices are listed first.
        </p>
      </div>

      <select className="select" value={pref || voices[0]?.voiceURI || ""} onChange={handleVoice}>
        {voices.map((v) => (
          <option key={v.voiceURI} value={v.voiceURI}>
            {v.name} ({v.lang}){v.localService ? "" : " · online"}
          </option>
        ))}
      </select>

      <button type="button" className="btn btn-ghost btn-sm" onClick={() => speakWord("kingdom", { slow })}>
        🔊 Preview this voice
      </button>

      <label className="ks-row" style={{ gap: 8, cursor: "pointer" }}>
        <input
          type="checkbox"
          checked={slow}
          onChange={handleSlow}
        />
        <span className="ks-small" style={{ fontWeight: 700 }}>
          Speak words slowly ({RATE.slow}× speed)
        </span>
      </label>

      <p className="ks-small ks-muted" style={{ margin: 0 }}>
        Using: <strong>{active || "system default"}</strong>
      </p>
    </div>
  );
}
