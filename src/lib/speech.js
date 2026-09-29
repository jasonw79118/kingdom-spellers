// Voice engine.
//
// Why there are two providers:
//   The Web Speech API can ONLY use voices installed on the device. No amount
//   of voice selection makes a robotic OS voice sound natural — the ceiling is
//   the operating system. macOS/iOS and up-to-date Windows ship good neural
//   voices, but plenty of devices (Linux, older Windows, some Android builds)
//   have only low-quality ones.
//
//   So the engine has two providers:
//     cloud — Google Cloud TTS (Neural2 / Studio / Journey) for genuinely
//             natural speech on every device
//     local — the best OS voice available, used automatically as a fallback
//
// Generated cloud audio is cached (memory + IndexedDB), so each word is
// synthesised once per device and replays instantly.
//
// Configuration (optional, via .env):
//   VITE_TTS_PROVIDER=auto|cloud|local
//   VITE_GOOGLE_TTS_KEY=...        // direct key (visible in the browser!)
//   VITE_TTS_PROXY=https://...     // preferred: a serverless proxy
//
// A parent can also paste a key into the voice picker at runtime.

import {
  cacheGet, cachePut, cacheClear, cacheStats, memoryGet, memoryPut,
} from "./audioCache";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const PREF_KEY = "ks2_voice_pref";
const SLOW_KEY = "ks2_speak_slow";
const PROVIDER_KEY = "ks2_tts_provider";
const API_KEY_STORE = "ks2_tts_apikey";

export const PROVIDERS = { AUTO: "auto", CLOUD: "cloud", LOCAL: "local" };

function envProvider() {
  const v = import.meta.env.VITE_TTS_PROVIDER;
  if (v === "cloud" || v === "local" || v === "auto") return v;
  return PROVIDERS.AUTO;
}

export function getProviderPref() {
  return localStorage.getItem(PROVIDER_KEY) || envProvider();
}

export function setProviderPref(value) {
  localStorage.setItem(PROVIDER_KEY, value);
}

// A proxy is preferred: it keeps the key server-side. A browser-visible key
// still works, but anyone can extract it, so we warn in the UI.
export function getProxyUrl() {
  return import.meta.env.VITE_TTS_PROXY || localStorage.getItem("ks2_tts_proxy") || "";
}

export function setProxyUrl(url) {
  if (url) localStorage.setItem("ks2_tts_proxy", url);
  else localStorage.removeItem("ks2_tts_proxy");
}

export function getApiKey() {
  return import.meta.env.VITE_GOOGLE_TTS_KEY || localStorage.getItem(API_KEY_STORE) || "";
}

export function setApiKey(key) {
  if (key) localStorage.setItem(API_KEY_STORE, key.trim());
  else localStorage.removeItem(API_KEY_STORE);
}

export function isCloudConfigured() {
  return Boolean(getProxyUrl() || getApiKey());
}

export function getSlowPref() {
  return localStorage.getItem(SLOW_KEY) === "1";
}

export function setSlowPref(on) {
  localStorage.setItem(SLOW_KEY, on ? "1" : "0");
}

// ---------------------------------------------------------------------------
// Local (Web Speech API) voices
// ---------------------------------------------------------------------------

// Voice names that indicate a modern, natural-sounding engine.
const PREMIUM = [
  "natural", "neural", "premium", "enhanced", "journey", "studio", "high quality",
  "samantha", "ava", "allison", "aaron", "nicky", "zoe", "serena", "tom",
  "google us english", "google uk english female", "google uk english male",
  "microsoft aria", "microsoft jenny", "microsoft guy", "microsoft andrew",
  "microsoft emma", "microsoft libby", "microsoft brian", "microsoft ava",
  "microsoft eric", "microsoft michelle", "microsoft zira", "microsoft david",
];
// Voices that sound robotic / are the low-quality legacy Android set.
const ROBOTIC = ["compact", "eloquence", "legacy", "espeak", "pico"];

function scoreVoice(v) {
  const name = (v.name || "").toLowerCase();
  const lang = (v.lang || "").toLowerCase();
  let score = 0;
  if (lang.startsWith("en")) score += 2;
  if (lang.startsWith("en-us")) score += 1;
  const hits = PREMIUM.filter((p) => name.includes(p)).length;
  score += Math.min(3, hits) * 5;
  if (ROBOTIC.some((q) => name.includes(q))) score -= 12;
  if (v.localService) score += 2;
  return score;
}

// All English voices, best first.
export function rankedLocalVoices() {
  const synth = typeof window !== "undefined" ? window.speechSynthesis : null;
  if (!synth) return [];
  return synth
    .getVoices()
    .filter((v) => (v.lang || "").toLowerCase().startsWith("en"))
    .sort((a, b) => scoreVoice(b) - scoreVoice(a));
}

// How good is the best local voice? Used to warn when the device is limited.
export function localVoiceQuality() {
  const voices = rankedLocalVoices();
  if (!voices.length) return { level: "none", label: "No voices found" };
  const best = scoreVoice(voices[0]);
  const premium = voices[0] && !ROBOTIC.some((q) => (voices[0].name || "").toLowerCase().includes(q));
  if (premium && best >= 8) return { level: "great", label: "Good quality" };
  if (premium) return { level: "okay", label: "Fair quality" };
  return { level: "poor", label: "Robotic — use a cloud voice" };
}

let cachedVoice = null;
function getLocalVoice() {
  const pref = localStorage.getItem(PREF_KEY);
  const voices = rankedLocalVoices();
  if (!voices.length) return null;
  if (pref) {
    const found = voices.find((v) => v.voiceURI === pref || v.name === pref);
    if (found) { cachedVoice = found; return found; }
  }
  cachedVoice = voices[0];
  return cachedVoice;
}

export function setLocalVoicePref(id) {
  if (id) localStorage.setItem(PREF_KEY, id);
  else localStorage.removeItem(PREF_KEY);
  cachedVoice = null;
}

export function getLocalVoicePref() {
  return localStorage.getItem(PREF_KEY) || "";
}

// Warm the voice list (iOS populates it asynchronously).
export function warmVoices() {
  const synth = typeof window !== "undefined" ? window.speechSynthesis : null;
  if (!synth) return;
  synth.getVoices();
  if (typeof synth.addEventListener === "function") {
    synth.addEventListener("voiceschanged", () => { cachedVoice = null; });
  }
}

// ---------------------------------------------------------------------------
// Cloud voices (Google Cloud Text-to-Speech)
// ---------------------------------------------------------------------------
// Neural2 / Studio / Journey voices. These sound like a person reading.
export const CLOUD_VOICES = [
  { id: "en-US-Neural2-F", label: "Aria — warm female (US)" },
  { id: "en-US-Neural2-D", label: "D — male (US)" },
  { id: "en-US-Neural2-C", label: "C — female (US)" },
  { id: "en-US-Neural2-B", label: "B — male (US)" },
  { id: "en-US-Neural2-A", label: "A — male (US)" },
  { id: "en-US-Studio-F", label: "Studio F — studio female" },
  { id: "en-US-Studio-D", label: "Studio D — studio male" },
  { id: "en-GB-Neural2-A", label: "Daniel — British male" },
  { id: "en-GB-Neural2-B", label: "Isla — British female" },
  { id: "en-AU-Neural2-A", label: "Nathan — Australian male" },
];

const CLOUD_VOICE_KEY = "ks2_cloud_voice";
export function getCloudVoice() {
  const pref = localStorage.getItem(CLOUD_VOICE_KEY);
  const valid = CLOUD_VOICES.some((v) => v.id === pref);
  return valid ? pref : CLOUD_VOICES[0].id;
}
export function setCloudVoice(id) {
  localStorage.setItem(CLOUD_VOICE_KEY, id);
}

async function requestCloudAudio(text, voice, rate) {
  const body = {
    input: { text },
    voice: { languageCode: voice.startsWith("en-GB") ? "en-GB" : voice.startsWith("en-AU") ? "en-AU" : "en-US", name: voice },
    audioConfig: {
      audioEncoding: "MP3",
      speakingRate: rate,
      pitch: 0,
    },
  };

  const proxy = getProxyUrl();
  if (proxy) {
    const res = await fetch(proxy, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Proxy ${res.status}`);
    const json = await res.json();
    return json.audioContent || json.audio || null;
  }

  const key = getApiKey();
  if (!key) throw new Error("No API key");
  const res = await fetch(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(key)}`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
  );
  if (!res.ok) throw new Error(`TTS ${res.status}`);
  const json = await res.json();
  return json.audioContent;
}

function base64ToBlob(b64, mime = "audio/mpeg") {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

async function getCloudClip(text, voice, rate) {
  const key = `g:${voice}:${rate}:${text}`;
  const mem = memoryGet(key);
  if (mem) return mem;

  const hit = await cacheGet(key);
  if (hit?.blob) {
    memoryPut(key, hit.blob);
    return hit.blob;
  }

  const b64 = await requestCloudAudio(text, voice, rate);
  if (!b64) throw new Error("No audio returned");
  const blob = base64ToBlob(b64);
  memoryPut(key, blob);
  cachePut(key, blob);
  return blob;
}

// Warm the cache for a word so the button plays instantly.
export function prefetch(text) {
  if (!shouldUseCloud()) return;
  const voice = getCloudVoice();
  const rate = getSlowPref() ? 0.6 : 0.95;
  getCloudClip(text, voice, rate).catch(() => {});
}

// ---------------------------------------------------------------------------
// Playback
// ---------------------------------------------------------------------------
let currentAudio = null;

function playBlob(blob) {
  if (typeof window === "undefined") return;
  stopEverything();
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  currentAudio = { audio, url };
  audio.onended = () => {
    if (currentAudio?.url === url) {
      URL.revokeObjectURL(url);
      currentAudio = null;
    }
  };
  audio.play().catch(() => {});
}

function stopEverything() {
  if (currentAudio) {
    currentAudio.audio.pause();
    URL.revokeObjectURL(currentAudio.url);
    currentAudio = null;
  }
  const synth = typeof window !== "undefined" ? window.speechSynthesis : null;
  if (synth) synth.cancel();
}

export function stopSpeaking() {
  stopEverything();
}

function shouldUseCloud() {
  const pref = getProviderPref();
  if (pref === PROVIDERS.LOCAL) return false;
  if (!isCloudConfigured()) return false;
  return true;
}

export function activeProvider() {
  return shouldUseCloud() ? "cloud" : "local";
}

// Speak text. Falls back from cloud to local if anything goes wrong, so a
// missing key or a network blip never leaves a child without audio.
export async function speak(text, { rate } = {}) {
  const clean = String(text || "").trim();
  if (!clean) return;
  const finalRate = rate ?? (getSlowPref() ? 0.6 : 0.95);

  if (shouldUseCloud()) {
    try {
      const blob = await getCloudClip(clean, getCloudVoice(), finalRate);
      playBlob(blob);
      return;
    } catch (err) {
      console.warn("Cloud TTS failed, falling back to device voice:", err?.message);
    }
  }

  const synth = typeof window !== "undefined" ? window.speechSynthesis : null;
  if (!synth) return;
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(clean);
  const voice = getLocalVoice();
  if (voice) utterance.voice = voice;
  utterance.lang = voice?.lang || "en-US";
  utterance.rate = finalRate;
  utterance.pitch = 1.0;
  utterance.volume = 1;
  setTimeout(() => {
    try { synth.speak(utterance); } catch { /* iOS restrictions */ }
  }, 20);
}

export const RATE = { normal: 0.95, slow: 0.6 };

export function speakWord(word, opts = {}) {
  return speak(word, { rate: opts.slow ? RATE.slow : RATE.normal, ...opts });
}

export function speakSlow(text, opts = {}) {
  return speak(text, { rate: RATE.slow, ...opts });
}

export function speakSentence(text, opts = {}) {
  return speak(text, { rate: 0.9, ...opts });
}

export { cacheClear, cacheStats };
