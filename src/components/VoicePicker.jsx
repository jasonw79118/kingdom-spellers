// Voice settings — choose where speech comes from (cloud vs device) and which
// voice it uses, with a preview button and an honest quality readout.
//
// The cloud option needs a Google Cloud TTS key or a serverless proxy URL;
// both can be pasted here at runtime so you can try without a rebuild.

import { useEffect, useState } from "react";
import {
  PROVIDERS, getProviderPref, setProviderPref,
  getCloudVoice, setCloudVoice, CLOUD_VOICES,
  getApiKey, setApiKey, getProxyUrl, setProxyUrl, isCloudConfigured,
  getSlowPref, setSlowPref,
  getLocalVoicePref, setLocalVoicePref,
  rankedLocalVoices, localVoiceQuality, warmVoices,
  speakWord, cacheStats, cacheClear, activeProvider,
} from "../lib/speech";

export function prefersSlow() {
  return getSlowPref();
}
export function setPrefersSlow(on) {
  setSlowPref(on);
}

export default function VoicePicker() {
  const [provider, setProvider] = useState(() => getProviderPref());
  const [localVoices, setLocalVoices] = useState([]);
  const [localPref, setLocalPref] = useState(() => getLocalVoicePref());
  const [cloudVoice, setCloudVoiceState] = useState(() => getCloudVoice());
  const [key, setKey] = useState(() => getApiKey());
  const [proxy, setProxy] = useState(() => getProxyUrl());
  const [slow, setSlow] = useState(() => getSlowPref());
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [stats, setStats] = useState({ count: 0, max: 0 });
  const [status, setStatus] = useState("");

  useEffect(() => {
    warmVoices();
    const load = () => {
      setLocalVoices(rankedLocalVoices());
      setLocalPref(getLocalVoicePref());
    };
    load();
    cacheStats().then(setStats);
    const synth = window.speechSynthesis;
    if (synth?.addEventListener) {
      synth.addEventListener("voiceschanged", load);
      return () => synth.removeEventListener("voiceschanged", load);
    }
  }, []);

  const quality = localVoiceQuality();
  const cloudReady = isCloudConfigured();
  const effective = provider === PROVIDERS.LOCAL ? "local" : cloudReady ? "cloud" : "local";

  const handleProvider = (e) => {
    const v = e.target.value;
    setProvider(v);
    setProviderPref(v);
    setStatus("");
  };

  const handlePreview = async () => {
    setStatus("…");
    await speakWord("elephant", { slow });
    setStatus("Played the word “elephant”.");
  };

  const handleSaveCredentials = () => {
    setApiKey(key);
    setProxyUrl(proxy);
    setStatus("Saved. Speech will use the cloud from now on.");
    setShowAdvanced(false);
  };

  return (
    <div className="card-flat ks-stack" style={{ gap: 12 }}>
      <div>
        <div className="label">Reading voice</div>
        <p className="ks-small ks-muted" style={{ margin: 0 }}>
          Natural voices sound like a person reading. Cloud voices are the most
          natural and work on any device.
        </p>
      </div>

      <select className="select" value={provider} onChange={handleProvider}>
        <option value={PROVIDERS.AUTO}>
          Best available {cloudReady ? "(cloud)" : "(device — no cloud key set)"}
        </option>
        <option value={PROVIDERS.CLOUD}>Cloud voice (most natural)</option>
        <option value={PROVIDERS.LOCAL}>This device’s voices</option>
      </select>

      {effective === "cloud" && (
        <select
          className="select"
          value={cloudVoice}
          onChange={(e) => { setCloudVoiceState(e.target.value); setCloudVoice(e.target.value); }}
        >
          {CLOUD_VOICES.map((v) => (
            <option key={v.id} value={v.id}>{v.label}</option>
          ))}
        </select>
      )}

      {effective === "local" && (
        <>
          <select
            className="select"
            value={localPref || localVoices[0]?.voiceURI || ""}
            onChange={(e) => { setLocalPref(e.target.value); setLocalVoicePref(e.target.value); }}
            disabled={!localVoices.length}
          >
            {localVoices.length ? (
              localVoices.map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>
                  {v.name} ({v.lang})
                </option>
              ))
            ) : (
              <option value="">No voices found on this device</option>
            )}
          </select>
          {quality.level === "poor" && (
            <p className="ks-small" style={{ color: "var(--gold-dark)", fontWeight: 700, margin: 0 }}>
              ⚠ This device only has robotic voices. Add a cloud key below for a
              natural voice.
            </p>
          )}
        </>
      )}

      <div className="ks-row" style={{ gap: 8, flexWrap: "wrap" }}>
        <button type="button" className="btn btn-ghost btn-sm" onClick={handlePreview}>
          🔊 Preview
        </button>
        <label className="ks-row" style={{ gap: 6, cursor: "pointer" }}>
          <input type="checkbox" checked={slow} onChange={(e) => setSlow(e.target.checked)} />
          <span className="ks-small" style={{ fontWeight: 700 }}>Slow (0.6×)</span>
        </label>
        {status && <span className="ks-small ks-muted">{status}</span>}
      </div>

      <details open={showAdvanced} onToggle={(e) => setShowAdvanced(e.target.isOpen)}>
        <summary className="ks-small" style={{ cursor: "pointer", fontWeight: 700 }}>
          Cloud voice setup {cloudReady ? "✓" : "(optional)"}
        </summary>
        <div className="ks-stack" style={{ gap: 8, marginTop: 10 }}>
          <div className="field" style={{ marginBottom: 0 }}>
            <label className="label" htmlFor="tts-proxy">Serverless proxy URL (recommended)</label>
            <input
              id="tts-proxy"
              className="input"
              value={proxy}
              onChange={(e) => setProxy(e.target.value)}
              placeholder="https://your-worker.dev/tts"
            />
            <span className="ks-small ks-muted">Keeps the key server-side.</span>
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label className="label" htmlFor="tts-key">Google Cloud TTS API key</label>
            <input
              id="tts-key"
              className="input"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="AIza…"
              type="password"
            />
            <span className="ks-small ks-muted">
              Stored only in this browser. Prefer a proxy — a key used directly
              from the browser can be read by anyone.
            </span>
          </div>
          <div className="ks-row">
            <button type="button" className="btn btn-sm btn-forest" onClick={handleSaveCredentials}>
              Save
            </button>
            <span className="ks-small ks-muted">{stats.count} cached clips</span>
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={async () => { await cacheClear(); cacheStats().then(setStats); }}
            >
              Clear cache
            </button>
          </div>
        </div>
      </details>
    </div>
  );
}
