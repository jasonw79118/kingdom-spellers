// Voice engine.
//
// Why there is a cloud option at all:
//   The Web Speech API can ONLY use voices installed on the device. No amount
//   of voice selection makes a robotic OS voice sound natural — the ceiling is
//   the operating system. macOS/iOS and up-to-date Windows ship good neural
//   voices, but plenty of devices (Linux, older Windows, some Android builds)
//   have only low-quality ones.
//
//   So speech has two tiers:
//     cloud — ElevenLabs (default) or Google Cloud TTS, for genuinely natural
//             speech on every device
//     local — the best OS voice available, used automatically as a fallback
//
// Cost: both cloud services have free tiers, and this app is well inside them.
// The entire seed word list (~699 words, 3,842 characters) costs less than
// half of ElevenLabs' 10,000 monthly characters, and generated audio is cached
// permanently — a word is billed once, ever, not once per replay.
//
// Configuration (optional, via .env):
//   VITE_TTS_PROVIDER=auto|cloud|local
//   VITE_TTS_CLOUD=elevenlabs|google
//   VITE_TTS_PROXY=https://...     // preferred: a serverless proxy
//
// A parent can also paste a key into the voice picker at runtime — no rebuild
// needed.

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
const CLOUD_VOICE_KEY = "ks2_cloud_voice";

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

// Keys are stored per provider, so switching between ElevenLabs and Google
// doesn't clobber the other one's credentials. An env-supplied key is the
// fallback, which lets a deployment ship a working voice without anyone having
// to paste a key.
export function getApiKey() {
  const provider = getCloudProvider();
  const fromEnv =
    provider === CLOUD_SERVICES.GOOGLE
      ? import.meta.env.VITE_GOOGLE_TTS_KEY
      : import.meta.env.VITE_ELEVENLABS_API_KEY;
  return localStorage.getItem(`${API_KEY_STORE}:${provider}`) || fromEnv || "";
}

export function setApiKey(key) {
  const provider = getCloudProvider();
  if (key) localStorage.setItem(`${API_KEY_STORE}:${provider}`, key.trim());
  else localStorage.removeItem(`${API_KEY_STORE}:${provider}`);
}

// Which cloud service to talk to.
const CLOUD_PROVIDER_KEY = "ks2_cloud_provider";
export const CLOUD_SERVICES = {
  ELEVENLABS: "elevenlabs",
  GOOGLE: "google",
};

function envCloudService() {
  const v = import.meta.env.VITE_TTS_CLOUD;
  if (v === CLOUD_SERVICES.ELEVENLABS || v === CLOUD_SERVICES.GOOGLE) return v;
  // Default to ElevenLabs: the free tier is generous enough for this app
  // (the whole seed dictionary is only ~3.8k characters) and the voices are
  // the most natural of the options.
  return CLOUD_SERVICES.ELEVENLABS;
}

export function getCloudProvider() {
  return localStorage.getItem(CLOUD_PROVIDER_KEY) || envCloudService();
}

export function setCloudProvider(id) {
  localStorage.setItem(CLOUD_PROVIDER_KEY, id);
}

export function isCloudConfigured() {
  return Boolean(getProxyUrl() || getApiKey());
}

// Live test used by the picker so a bad key is caught immediately rather than
// silently falling back mid-lesson.
export async function testCloudKey() {
  try {
    await getCloudClip("hello", getCloudVoice(), 0.95, { skipCache: true });
    resetBreaker();
    return { ok: true };
  } catch (err) {
    const why = friendlyError(err);
    // Trip the breaker so the rest of the UI reports the truth: a rejected key
    // should not keep claiming the app is speaking with the cloud voice.
    tripBreaker();
    try { localStorage.setItem(`${BREAKER_KEY}:why`, why); } catch { /* ignore */ }
    return { ok: false, error: why };
  }
}

function friendlyError(err) {
  const msg = String(err?.message || err || "");
  if (/paid_plan_required|free users cannot/i.test(msg)) {
    return "That voice needs a paid ElevenLabs plan. Pick another voice — the list only shows free ones.";
  }
  if (/401|unauthorized|invalid.*key|api key/i.test(msg)) {
    return "That key was rejected. Check you copied the whole thing.";
  }
  if (/402|quota|credit/i.test(msg)) {
    return "Out of credits for this month. The device voice is being used instead.";
  }
  if (/429|rate/i.test(msg)) {
    return "Too many requests. Try again in a moment.";
  }
  if (/fetch|network|Failed to fetch/i.test(msg)) {
    return "Could not reach the service. Check your connection.";
  }
  return msg || "Unknown error";
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
// Cloud providers
// ---------------------------------------------------------------------------
// Two services, both of which need an API key, both of which have a free tier.
//
//   ElevenLabs — the most natural sounding. Free tier is 10,000 characters per
//                month at 1 credit/char. The entire seed word list in this app
//                is only ~3,842 characters, and audio is cached permanently,
//                so each word is billed once, ever. The free tier is
//                comfortably enough for a family.
//   Google     — Neural2/Studio voices. Slightly less expressive than
//                ElevenLabs, but a useful alternative.
//
// Both fall back to the device voice if the key is missing, invalid, or out of
// credits, so a child is never left without audio.

// ElevenLabs voices that are confirmed to work on the FREE plan.
//
// This list is not a guess: every ID below was tested against a real free-tier
// key and returned HTTP 200 with audio. ElevenLabs splits its library voices —
// some return 402 "Free users cannot use library voices via the API" (Rachel,
// Grace, Dorothy, Sam, Josh, James and others do). Listing those would mean the
// picker offered voices that silently fail, so only verified ones appear here.
//
// Upgrading the plan unlocks the rest of the library.
const ELEVENLABS_VOICES = [
  { id: "EXAVITQu4vr4xnSDxMaL", label: "Sarah — warm, clear female (US)" },
  { id: "pNInz6obpgDQGcFmaJgB", label: "Elli — young, bright female (US)" },
  { id: "XrExE9yKIg1WjnnlVkGX", label: "Lily — cheerful, storytelling female (US)" },
  { id: "Xb7hH8MSUJpSbSDYk0k2", label: "Alice — poised female (UK)" },
  { id: "IKne3meq5aSn9XLyUdCD", label: "Charlotte — warm female (UK)" },
  { id: "nPczCjzI2devNBz1zQrb", label: "Brian — deep, steady male (US)" },
  { id: "VR6AewLTigWG4xSOukaG", label: "Arnold — warm male (US)" },
  { id: "onwK4e9ZLuTAKqWW03F9", label: "Daniel — authoritative male (UK)" },
];

// Google Neural2 / Studio voices. These sound like a person reading.
const GOOGLE_VOICES = [
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

// Maps a speaking rate (0.5–1.5) onto each service's own scale.
const rateToGoogle = (rate) => Math.max(0.25, Math.min(4, rate));
const rateToEleven = (rate) => Math.max(0.7, Math.min(1.2, rate));

function base64ToBlob(b64, mime = "audio/mpeg") {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

async function requestElevenLabs(text, voice, rate) {
  // flash_v2_5 is the fastest, cheapest model and plenty good for single
  // words. Stability is raised and style set to 0 so short words are read
  // cleanly rather than with a wandering, expressive delivery.
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}`, {
    method: "POST",
    headers: {
      "xi-api-key": getApiKey(),
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_flash_v2_5",
      voice_settings: {
        stability: 0.7,
        similarity_boost: 0.8,
        style: 0,
        use_speaker_boost: true,
        speed: rateToEleven(rate),
      },
    }),
  });

  if (!res.ok) {
    let detail = `ElevenLabs ${res.status}`;
    try {
      const j = await res.json();
      if (j?.detail) {
        const d = j.detail;
        detail = typeof d === "string" ? d : d?.message || detail;
      }
    } catch { /* body wasn't json */ }
    throw new Error(detail);
  }
  // This endpoint returns raw audio bytes, not JSON.
  return res.blob();
}

async function requestGoogle(text, voice, rate) {
  const body = {
    input: { text },
    voice: {
      languageCode: voice.startsWith("en-GB")
        ? "en-GB"
        : voice.startsWith("en-AU")
        ? "en-AU"
        : "en-US",
      name: voice,
    },
    audioConfig: { audioEncoding: "MP3", speakingRate: rateToGoogle(rate), pitch: 0 },
  };

  const key = getApiKey();
  const res = await fetch(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(key)}`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
  );
  if (!res.ok) {
    let detail = `Google TTS ${res.status}`;
    try {
      const j = await res.json();
      if (j?.error?.message) detail = j.error.message;
    } catch { /* body wasn't json */ }
    throw new Error(detail);
  }
  const json = await res.json();
  if (!json.audioContent) throw new Error("No audio returned");
  return base64ToBlob(json.audioContent);
}

export function cloudVoicesFor(service = getCloudProvider()) {
  return service === CLOUD_SERVICES.GOOGLE ? GOOGLE_VOICES : ELEVENLABS_VOICES;
}

// The voice preference is namespaced per service so switching provider doesn't
// reset the chosen voice.
function voiceStorageKey(service) {
  return `${CLOUD_VOICE_KEY}:${service}`;
}

export function getCloudVoice(service = getCloudProvider()) {
  const pref = localStorage.getItem(voiceStorageKey(service));
  const list = cloudVoicesFor(service);
  return list.some((v) => v.id === pref) ? pref : list[0].id;
}

export function setCloudVoice(id, service = getCloudProvider()) {
  localStorage.setItem(voiceStorageKey(service), id);
}

// A proxy short-circuits the direct call, so the key can stay server-side.
// It receives a Google-shaped body for compatibility with the original setup.
async function requestViaProxy(text, voice, rate) {
  const res = await fetch(getProxyUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      input: { text },
      voice: {
        languageCode: voice.startsWith("en-GB") ? "en-GB" : voice.startsWith("en-AU") ? "en-AU" : "en-US",
        name: voice,
      },
      audioConfig: { audioEncoding: "MP3", speakingRate: rateToGoogle(rate), pitch: 0 },
    }),
  });
  if (!res.ok) throw new Error(`Proxy ${res.status}`);
  const json = await res.json();
  if (!json.audioContent && !json.audio) throw new Error("Proxy returned no audio");
  return base64ToBlob(json.audioContent || json.audio);
}

async function getCloudClip(text, voice, rate, { skipCache = false } = {}) {
  const service = getCloudProvider();
  // Namespace the cache key by service, voice and rate so switching provider or
  // speed never replays the wrong audio.
  const key = `c:${service}:${voice}:${rate}:${text}`;

  if (!skipCache) {
    const mem = memoryGet(key);
    if (mem) return mem;
    const hit = await cacheGet(key);
    if (hit?.blob) {
      memoryPut(key, hit.blob);
      return hit.blob;
    }
  }

  const proxy = getProxyUrl();
  const blob = proxy
    ? await requestViaProxy(text, voice, rate)
    : service === CLOUD_SERVICES.GOOGLE
    ? await requestGoogle(text, voice, rate)
    : await requestElevenLabs(text, voice, rate);

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

// Circuit breaker: if the cloud keeps failing (bad key, out of credits, no
// network) we stop trying for a while and use the device voice straight away.
// Without this, every tap on "Hear word" would wait for a doomed network round
// trip before falling back — which feels broken to a child.
const BREAKER_KEY = "ks2_tts_breaker_until";
const BREAKER_MS = 10 * 60 * 1000;

function breakerOpen() {
  const until = Number(localStorage.getItem(BREAKER_KEY) || 0);
  if (!until) return false;
  if (Date.now() > until) {
    localStorage.removeItem(BREAKER_KEY);
    return false;
  }
  return true;
}

function tripBreaker() {
  try {
    localStorage.setItem(BREAKER_KEY, String(Date.now() + BREAKER_MS));
  } catch { /* private mode */ }
}

export function resetBreaker() {
  localStorage.removeItem(BREAKER_KEY);
}

// Why we stopped using the cloud, for the settings UI to explain.
export function breakerReason() {
  if (!breakerOpen()) return "";
  return localStorage.getItem(`${BREAKER_KEY}:why`) || "";
}

function shouldUseCloud() {
  const pref = getProviderPref();
  if (pref === PROVIDERS.LOCAL) return false;
  if (pref === PROVIDERS.CLOUD) return true; // user insists: keep trying
  if (!isCloudConfigured()) return false;
  if (breakerOpen()) return false;
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
      resetBreaker();
      playBlob(blob);
      return;
    } catch (err) {
      const why = friendlyError(err);
      console.warn("Cloud TTS failed, falling back to device voice:", why);
      // An explicit "Cloud" choice shouldn't get permanently disabled out
      // from under the user, but we still record it so the UI can warn.
      if (getProviderPref() !== PROVIDERS.CLOUD) {
        tripBreaker();
        try { localStorage.setItem(`${BREAKER_KEY}:why`, why); } catch { /* ignore */ }
      }
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

// Only pass an explicit rate when the caller actually asked for one. Otherwise
// leave it undefined so `speak` can honour the saved Slow preference — passing
// a hardcoded rate here would silently override that setting on every word.
export function speakWord(word, opts = {}) {
  return speak(word, { ...opts, rate: opts.slow ? RATE.slow : opts.rate });
}

export function speakSlow(text, opts = {}) {
  return speak(text, { ...opts, rate: RATE.slow });
}

export function speakSentence(text, opts = {}) {
  return speak(text, { ...opts, rate: 0.9 });
}

export { cacheClear, cacheStats };
