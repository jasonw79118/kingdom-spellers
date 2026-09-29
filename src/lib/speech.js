// Text-to-speech helpers built on the Web Speech API.
// Every spelling word can be heard: the word, its definition, and an
// example sentence. A slightly slower "careful" rate is available.

let cachedVoice = null;

function getSynth() {
  if (typeof window === "undefined") return null;
  return window.speechSynthesis || null;
}

// Prefer a clear en-US voice; fall back to any English voice.
export function pickVoice() {
  const synth = getSynth();
  if (!synth) return null;
  const voices = synth.getVoices() || [];
  if (!voices.length) return null;

  const enUS = voices.filter((v) => (v.lang || "").toLowerCase().replace("_", "-").startsWith("en-us"));
  const enAny = voices.filter((v) => (v.lang || "").toLowerCase().replace("_", "-").startsWith("en"));
  const pool = enUS.length ? enUS : enAny.length ? enAny : voices;

  const preferred = [
    "google us english",
    "samantha",
    "alex",
    "zira",
    "microsoft david",
    "microsoft aria",
    "google uk english male",
  ];
  for (const name of preferred) {
    const found = pool.find((v) => (v.name || "").toLowerCase().includes(name));
    if (found) return found;
  }
  return pool[0] || null;
}

export function getVoice() {
  if (!cachedVoice) cachedVoice = pickVoice();
  return cachedVoice;
}

// Warm the voice list (important on iOS where voices load async).
export function warmVoices() {
  const synth = getSynth();
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
  const synth = getSynth();
  if (synth) synth.cancel();
}

// Core speak function. options: { rate, pitch, onEnd }
export function speak(text, options = {}) {
  const synth = getSynth();
  if (!synth || !text) return;
  synth.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  const voice = getVoice();
  if (voice) utterance.voice = voice;
  utterance.lang = voice?.lang || "en-US";
  utterance.rate = options.rate ?? 1.0;
  utterance.pitch = options.pitch ?? 1.0;
  utterance.volume = 1;
  if (options.onEnd) utterance.onend = options.onEnd;

  // Small delay helps iOS after cancel().
  setTimeout(() => {
    try {
      synth.speak(utterance);
    } catch {
      // fail silently on iOS restrictions
    }
  }, 20);
}

// Speak a word clearly (slightly slower, a touch lower pitch).
export function speakWord(word, options = {}) {
  speak(word, { rate: 0.9, pitch: 0.95, ...options });
}

// Speak at a careful, easy-to-follow pace (for definitions/sentences).
export function speakSlow(text, options = {}) {
  speak(text, { rate: 0.8, pitch: 1.0, ...options });
}

export function speakSentence(text, options = {}) {
  speak(text, { rate: 0.95, pitch: 1.0, ...options });
}
