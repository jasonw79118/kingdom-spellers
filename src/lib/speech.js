// Text-to-speech built on the Web Speech API.
//
// The goal is a *natural human-sounding* voice, so voices are scored rather
// than picked by name order:
//   * neural / premium / enhanced / natural voices score highest
//   * "Compact" voices (Android's low-quality legacy set) are avoided
//   * offline (local) voices are preferred — no lag when replaying a word
//   * a parent/child can override the choice from the voice picker
//
// Words, definitions and example sentences can all be spoken, each with a
// normal and a "speak slowly" rate.

const PREF_KEY = "ks2_voice_pref";
let cachedVoice = null;
let voiceList = [];

// Markers that indicate a modern, high-quality (usually neural) voice.
const PREMIUM = [
  "natural", "neural", "premium", "enhanced", "high quality", "studio",
  "samantha", "ava", "allison", "aaron", "nicky", "zoe", "tom",
  "google us english", "google uk english female", "google uk english male",
  "microsoft aria", "microsoft jenny", "microsoft guy", "microsoft libby",
  "microsoft zira", "microsoft david", "microsoft mark",
];

// Voices that sound robotic or are the low-quality legacy Android set.
const LOW_QUALITY = ["compact", "eloquence", "legacy"];

function scoreVoice(v) {
  const name = (v.name || "").toLowerCase();
  const lang = (v.lang || "").toLowerCase();
  let score = 0;

  if (lang.startsWith("en")) score += 2;
  if (lang.startsWith("en-us")) score += 1;
  if (PREMIUM.some((p) => name.includes(p))) score += 6;
  if (LOW_QUALITY.some((q) => name.includes(q))) score -= 8;
  // Locally installed voices have no network latency.
  if (v.localService) score += 2;
  return score;
}

// All English voices, best first.
export function rankedVoices() {
  const synth = typeof window !== "undefined" ? window.speechSynthesis : null;
  if (!synth) return [];
  voiceList = synth
    .getVoices()
    .filter((v) => (v.lang || "").toLowerCase().startsWith("en"));
  return voiceList.slice().sort((a, b) => scoreVoice(b) - scoreVoice(a));
}

// The voice a saved preference points at, else the highest scoring.
export function getVoice() {
  const synth = typeof window !== "undefined" ? window.speechSynthesis : null;
  if (!synth) return null;

  const preferred = localStorage.getItem(PREF_KEY);
  const voices = rankedVoices();
  if (voices.length) {
    if (preferred) {
      const found = voices.find((v) => v.voiceURI === preferred || v.name === preferred);
      if (found) {
        cachedVoice = found;
        return found;
      }
    }
    cachedVoice = voices[0];
  }
  return cachedVoice;
}

export function setVoicePref(voiceURI) {
  if (voiceURI) localStorage.setItem(PREF_KEY, voiceURI);
  else localStorage.removeItem(PREF_KEY);
  cachedVoice = null;
  getVoice();
}

export function getVoicePref() {
  return localStorage.getItem(PREF_KEY) || "";
}

// Warm the voice list. iOS populates it asynchronously.
export function warmVoices() {
  const synth = typeof window !== "undefined" ? window.speechSynthesis : null;
  if (!synth) return;
  synth.getVoices();
  if (typeof synth.addEventListener === "function") {
    synth.addEventListener("voiceschanged", () => {
      cachedVoice = null;
      getVoice();
    });
  }
}

export function stopSpeaking() {
  const synth = typeof window !== "undefined" ? window.speechSynthesis : null;
  if (synth) synth.cancel();
}

export function speak(text, options = {}) {
  const synth = typeof window !== "undefined" ? window.speechSynthesis : null;
  if (!synth || !text) return;
  synth.cancel();

  const utterance = new SpeechSynthesisUtterance(String(text));
  const voice = getVoice();
  if (voice) utterance.voice = voice;
  utterance.lang = voice?.lang || "en-US";
  utterance.rate = options.rate ?? 1.0;
  utterance.pitch = options.pitch ?? 1.0;
  utterance.volume = 1;
  if (options.onEnd) utterance.onend = options.onEnd;

  // iOS needs a moment after cancel() before it will speak.
  setTimeout(() => {
    try {
      synth.speak(utterance);
    } catch {
      /* fail silently on iOS restrictions */
    }
  }, 20);
}

// Speaking rates: normal reads a word cleanly; "slow" is for children still
// learning to sound words out.
export const RATE = { normal: 0.95, slow: 0.6 };

export function speakWord(word, { slow = false } = {}) {
  speak(word, { rate: slow ? RATE.slow : RATE.normal, pitch: 1.0 });
}

export function speakSlow(text, options = {}) {
  speak(text, { rate: RATE.slow, pitch: 1.0, ...options });
}

export function speakSentence(text, options = {}) {
  speak(text, { rate: 0.9, pitch: 1.0, ...options });
}
