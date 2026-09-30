// Voice settings — choose where speech comes from (cloud vs device), which
// cloud service to use, and which voice within it.
//
// Keys can be pasted here at runtime, so you can try a service without a
// rebuild. A proxy URL is preferred because it keeps the key server-side.

import { useEffect, useState } from "react";
import {
  PROVIDERS,
  CLOUD_SERVICES,
  getProviderPref,
  setProviderPref,
  getCloudProvider,
  setCloudProvider,
  getCloudVoice,
  setCloudVoice,
  cloudVoicesFor,
  getApiKey,
  setApiKey,
  getProxyUrl,
  setProxyUrl,
  isCloudConfigured,
  getSlowPref,
  setSlowPref,
  getLocalVoicePref,
  setLocalVoicePref,
  rankedLocalVoices,
  localVoiceQuality,
  warmVoices,
  speakWord,
  cacheStats,
  cacheClear,
  activeProvider,
  testCloudKey,
  resetBreaker,
  breakerReason,
} from "../lib/speech";

const SERVICES = [
  {
    id: CLOUD_SERVICES.ELEVENLABS,
    name: "ElevenLabs",
    blurb: "Most natural. Free tier: 10,000 characters/month — the whole word list costs about 3,800, and each word is only ever generated once.",
    keyLabel: "ElevenLabs API key",
    keyHint: "elevenlabs.io → Profile → API Keys. Free plan is enough.",
  },
  {
    id: CLOUD_SERVICES.GOOGLE,
    name: "Google Cloud TTS",
    blurb: "Neural2 and Studio voices. Free trial credit covers this app easily.",
    keyLabel: "Google Cloud TTS API key",
    keyHint: "Enable the Cloud Text-to-Speech API, then create an API key.",
  },
];

export default function VoicePicker() {
  const [provider, setProvider] = useState(() => getProviderPref());
  const [service, setService] = useState(() => getCloudProvider());
  const [cloudVoice, setCloudVoiceState] = useState(() => getCloudVoice());
  const [localVoices, setLocalVoices] = useState([]);
  const [localPref, setLocalPref] = useState(() => getLocalVoicePref());
  const [key, setKey] = useState(() => getApiKey());
  const [proxy, setProxy] = useState(() => getProxyUrl());
  const [slow, setSlow] = useState(() => getSlowPref());
  const [stats, setStats] = useState({ count: 0, max: 0 });
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

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

  // Each service has its own voice list, so refresh it when switching.
  useEffect(() => {
    setCloudVoiceState(getCloudVoice(service));
    setKey(getApiKey());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [service]);

  const quality = localVoiceQuality();
  const cloudReady = isCloudConfigured();
  const usingCloud = provider !== PROVIDERS.LOCAL && cloudReady;
  const tripped = breakerReason();
  const current = SERVICES.find((s) => s.id === service) || SERVICES[0];

  // Show the prompt when the device voice is poor and nothing better is
  // available — that combination is what produced silent robotic audio.
  const needsCloudKey =
    !cloudReady && (quality.level === "poor" || quality.level === "none" || tripped);

  const handleProvider = (e) => {
    const v = e.target.value;
    setProvider(v);
    setProviderPref(v);
    setStatus("");
  };

  const handleService = (e) => {
    const v = e.target.value;
    setService(v);
    setCloudProvider(v);
    resetBreaker();
    setStatus("");
  };

  const handlePreview = async () => {
    setStatus("…");
    await speakWord("elephant", { slow });
    setStatus(`Played “elephant” with the ${usingCloud ? current.name : "device"} voice.`);
  };

  const handleTest = async () => {
    setBusy(true);
    setStatus("Testing key…");
    setApiKey(key);
    setProxyUrl(proxy);
    resetBreaker();
    const res = await testCloudKey();
    setBusy(false);
    setStatus(res.ok ? "Key works — natural voice is ready." : `Key problem: ${res.error}`);
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

      {/* A robotic voice used to fail silently, so say it plainly instead. */}
      {needsCloudKey && (
        <div
          className="ks-stack"
          style={{
            gap: 8,
            padding: 12,
            borderRadius: "var(--radius)",
            background: "rgba(214, 158, 46, 0.14)",
            border: "1px solid rgba(214, 158, 46, 0.4)",
          }}
        >
          <strong style={{ fontSize: "0.95rem" }}>🔊 This device only has robotic voices</strong>
          <span className="ks-small">
            {quality.level === "none"
              ? "No reading voices were found on this device, so words can't be read aloud."
              : `The best voice here is "${localVoices[0]?.name || "device default"}", which sounds like a computer. `}
            A free ElevenLabs key fixes this and makes every device sound natural.
          </span>
          <a
            className="btn btn-sm btn-forest"
            style={{ alignSelf: "flex-start" }}
            href="https://elevenlabs.io/app/sign-up"
            target="_blank"
            rel="noreferrer"
          >
            Get a free key →
          </a>
          <span className="ks-small ks-muted">
            Then paste it under “{current.keyLabel}” below and press Save &amp; test.
            Free plan: 10,000 characters a month, and the whole word list costs about 3,800.
          </span>
        </div>
      )}

      <select className="select" value={provider} onChange={handleProvider}>
        <option value={PROVIDERS.AUTO}>
          Best available{cloudReady ? ` (${current.name})` : " (this device — add a key below)"}
        </option>
        <option value={PROVIDERS.CLOUD}>Cloud voice (most natural)</option>
        <option value={PROVIDERS.LOCAL}>This device’s voices</option>
      </select>

      {provider !== PROVIDERS.LOCAL && (
        <>
          <select className="select" value={service} onChange={handleService}>
            {SERVICES.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <p className="ks-small ks-muted" style={{ margin: 0 }}>{current.blurb}</p>

          <select
            className="select"
            value={cloudVoice}
            onChange={(e) => {
              setCloudVoiceState(e.target.value);
              setCloudVoice(e.target.value);
            }}
          >
            {cloudVoicesFor(service).map((v) => (
              <option key={v.id} value={v.id}>{v.label}</option>
            ))}
          </select>

          {!cloudReady && (
            <p className="ks-small" style={{ fontWeight: 700, margin: 0 }}>
              Add a free {current.name} key below to switch this on — takes a minute.
            </p>
          )}
        </>
      )}

      {provider === PROVIDERS.LOCAL && (
        <>
          <select
            className="select"
            value={localPref || localVoices[0]?.voiceURI || ""}
            onChange={(e) => { setLocalPref(e.target.value); setLocalVoicePref(e.target.value); }}
            disabled={!localVoices.length}
          >
            {localVoices.length ? (
              localVoices.map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>{v.name} ({v.lang})</option>
              ))
            ) : (
              <option value="">No voices found on this device</option>
            )}
          </select>
          {quality.level === "poor" && (
            <p className="ks-small" style={{ color: "var(--gold-dark)", fontWeight: 700, margin: 0 }}>
              ⚠ This device only has robotic voices. Add a free ElevenLabs key below for a
              natural voice.
            </p>
          )}
        </>
      )}

      {tripped && provider !== PROVIDERS.LOCAL && (
        <p className="ks-small" style={{ color: "var(--gold-dark)", fontWeight: 700, margin: 0 }}>
          ⚠ Using the device voice for now — {tripped}
        </p>
      )}

      <div className="ks-row" style={{ gap: 8, flexWrap: "wrap" }}>
        <button type="button" className="btn btn-ghost btn-sm" onClick={handlePreview}>
          🔊 Preview
        </button>
        <label className="ks-row" style={{ gap: 6, cursor: "pointer" }}>
          <input type="checkbox" checked={slow} onChange={(e) => setSlow(e.target.checked)} />
          <span className="ks-small" style={{ fontWeight: 700 }}>Slow (0.6×)</span>
        </label>
        <span className="ks-small ks-muted">
          Now using: {activeProvider() === "cloud" ? `${current.name} cloud` : "this device"}
        </span>
      </div>

      {status && <p className="ks-small" style={{ margin: 0, fontWeight: 700 }}>{status}</p>}

      <details>
        <summary className="ks-small" style={{ cursor: "pointer", fontWeight: 700 }}>
          {current.keyLabel} {cloudReady ? "✓" : "(free — set one up)"}
        </summary>
        <div className="ks-stack" style={{ gap: 8, marginTop: 10 }}>
          <div className="field" style={{ marginBottom: 0 }}>
            <label className="label" htmlFor="tts-key">{current.keyLabel}</label>
            <input
              id="tts-key"
              className="input"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder={service === CLOUD_SERVICES.ELEVENLABS ? "sk_…" : "AIza…"}
              type="password"
            />
            <span className="ks-small ks-muted">{current.keyHint} Stored only in this browser.</span>
          </div>

          <div className="field" style={{ marginBottom: 0 }}>
            <label className="label" htmlFor="tts-proxy">Serverless proxy URL (optional, safer)</label>
            <input
              id="tts-proxy"
              className="input"
              value={proxy}
              onChange={(e) => setProxy(e.target.value)}
              placeholder="https://your-worker.dev/tts"
            />
            <span className="ks-small ks-muted">
              Keeps the key server-side so it can never be read from the page.
            </span>
          </div>

          <div className="ks-row" style={{ flexWrap: "wrap" }}>
            <button type="button" className="btn btn-sm btn-forest" onClick={handleTest} disabled={busy}>
              {busy ? "Testing…" : "Save & test key"}
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
