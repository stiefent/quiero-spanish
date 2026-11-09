"use client";

import { speak } from "@/lib/speech";

export function SpeakButton({ text, size = "md", label }: { text: string; size?: "md" | "lg"; label?: string }) {
  const dim = size === "lg" ? "h-16 w-16" : "h-10 w-10";
  return (
    <button
      type="button"
      onClick={() => speak(text)}
      aria-label={label ?? `Hear “${text}”`}
      className={`${dim} inline-flex shrink-0 items-center justify-center rounded-full bg-agave text-white shadow-[0_3px_0_var(--color-agave-deep)] transition active:translate-y-[3px] active:shadow-none`}
    >
      <svg viewBox="0 0 24 24" className={size === "lg" ? "h-8 w-8" : "h-5 w-5"} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M11 5 6 9H3v6h3l5 4V5Z" fill="currentColor" />
        <path d="M15.5 8.5a5 5 0 0 1 0 7" />
        <path d="M18.5 5.5a9 9 0 0 1 0 13" />
      </svg>
    </button>
  );
}
