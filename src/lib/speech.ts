"use client";

let cachedVoice: SpeechSynthesisVoice | null | undefined;

function pickVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  if (cachedVoice !== undefined && cachedVoice !== null) return cachedVoice;
  const voices = window.speechSynthesis.getVoices();
  // The book teaches Mexican Spanish, so prefer es-MX, then any US/LatAm, then any Spanish.
  cachedVoice =
    voices.find((v) => v.lang === "es-MX") ||
    voices.find((v) => v.lang === "es-US") ||
    voices.find((v) => v.lang.startsWith("es-4")) ||
    voices.find((v) => v.lang.startsWith("es")) ||
    null;
  return cachedVoice;
}

export function canSpeak(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function speak(text: string, rate = 0.9) {
  if (!canSpeak()) return;
  // Speak only the first option of "el gato, la gata" style entries, minus notes.
  const clean = text.replace(/\(.*?\)/g, "").trim();
  const u = new SpeechSynthesisUtterance(clean);
  u.lang = "es-MX";
  u.rate = rate;
  const v = pickVoice();
  if (v) u.voice = v;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}

if (typeof window !== "undefined" && "speechSynthesis" in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    cachedVoice = undefined;
  };
}
