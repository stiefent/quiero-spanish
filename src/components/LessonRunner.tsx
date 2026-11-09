"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Exercise } from "@/lib/lesson";
import { firstForm } from "@/lib/lesson";
import { grade, normalize, type Verdict } from "@/lib/answer";
import { recordAnswer } from "@/lib/progress";
import { speak } from "@/lib/speech";
import { SpeakButton } from "./Speak";

type Result = { ok: boolean; verdict?: Verdict; answer: string };

const PROMPTS: Record<Exercise["type"], string> = {
  recall: "Say it in Spanish",
  choose: "Pick the Spanish",
  listen: "What did you hear?",
  type: "Write it in Spanish",
  tiles: "Build it in Spanish",
  conjugate: "Pick the right form",
};

export function LessonRunner({
  exercises,
  title,
  onExit,
  onFinish,
}: {
  exercises: Exercise[];
  title: string;
  onExit: () => void;
  onFinish: (score: number) => void;
}) {
  const [queue, setQueue] = useState<Exercise[]>(exercises);
  const [i, setI] = useState(0);
  const [pending, setPending] = useState<string>("");
  const [result, setResult] = useState<Result | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [firstTry, setFirstTry] = useState({ right: 0, total: 0 });
  const missed = useRef(new Set<string>());

  const ex = queue[i];
  const total = queue.length;

  useEffect(() => {
    setPending("");
    setResult(null);
    setRevealed(false);
    if (ex?.type === "listen") setTimeout(() => speak(ex.item.es), 250);
  }, [i, ex]);

  if (!ex) return null;

  const answerText = ex.type === "listen" ? firstForm(ex.item.en) : ex.type === "conjugate" ? ex.item.es : firstForm(ex.item.es);

  function finish(ok: boolean, verdict?: Verdict) {
    const key = ex.item.id;
    const firstAttempt = !missed.current.has(key);
    recordAnswer(key, ok);
    if (firstAttempt) setFirstTry((s) => ({ right: s.right + (ok ? 1 : 0), total: s.total + 1 }));
    if (!ok && firstAttempt) {
      missed.current.add(key);
      // Missed items come back once at the end of the lesson.
      setQueue((q) => [...q, { ...ex }]);
    }
    setResult({ ok, verdict, answer: answerText });
    if (ex.type !== "listen") speak(answerText);
  }

  function check() {
    if (!pending) return;
    switch (ex.type) {
      case "choose":
      case "conjugate":
        return finish(normalize(pending) === normalize(answerText));
      case "listen":
        return finish(normalize(pending) === normalize(answerText));
      case "type": {
        const v = grade(pending, ex.item);
        return finish(v !== "wrong", v);
      }
      case "tiles":
        return finish(normalize(pending) === normalize(firstForm(ex.item.es)) || grade(pending, ex.item) === "correct");
    }
  }

  function next() {
    if (i + 1 >= queue.length) {
      onFinish(firstTry.total ? firstTry.right / firstTry.total : 1);
    } else setI(i + 1);
  }

  const progress = Math.min(i / Math.max(total, 1), 1);

  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col px-4">
      <header className="flex items-center gap-3 pt-4 pb-6">
        <button onClick={onExit} aria-label="Leave lesson" className="rounded-full p-2 text-ink-soft hover:bg-white">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
        <div className="h-3 flex-1 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100} aria-label={`${title} progress`}>
          <div className="h-full rounded-full bg-agave transition-[width] duration-300" style={{ width: `${progress * 100}%` }} />
        </div>
      </header>

      <main key={i} className="animate-pop flex flex-1 flex-col">
        <p className="mb-3 text-sm font-bold text-ink-soft">{ex.type === "recall" && ex.item.kind === "verb" ? "Retrieve the verb" : PROMPTS[ex.type]}</p>
        <Body ex={ex} pending={pending} setPending={setPending} locked={!!result} revealed={revealed} />
      </main>

      <Footer
        ex={ex}
        result={result}
        pending={pending}
        revealed={revealed}
        onReveal={() => {
          setRevealed(true);
          speak(ex.item.es);
        }}
        onSelfGrade={(ok) => {
          recordAnswer(ex.item.id, ok);
          if (!ok && !missed.current.has(ex.item.id)) {
            missed.current.add(ex.item.id);
            setQueue((q) => [...q, { type: "type", item: ex.item }]);
          }
          next();
        }}
        onCheck={check}
        onNext={next}
      />
    </div>
  );
}

function Body({
  ex,
  pending,
  setPending,
  locked,
  revealed,
}: {
  ex: Exercise;
  pending: string;
  setPending: (s: string) => void;
  locked: boolean;
  revealed: boolean;
}) {
  switch (ex.type) {
    case "recall":
      return (
        <div className="flex flex-1 flex-col">
          <h1 className="font-display text-4xl font-extrabold leading-tight tracking-tight">{ex.item.en}</h1>
          <p className="mt-3 text-ink-soft">
            {revealed ? "How did you do?" : "Try to say it out loud before you look. The effort of remembering is what makes it stick."}
          </p>
          {revealed && (
            <div className="animate-pop mt-8 flex items-center gap-4 rounded-2xl border-2 border-agave bg-white p-5">
              <SpeakButton text={ex.item.es} />
              <div>
                <p className="font-display text-3xl font-bold text-agave-deep">{ex.item.es}</p>
                {ex.item.note && <p className="mt-1 text-sm text-ink-soft">{ex.item.note}</p>}
              </div>
            </div>
          )}
        </div>
      );
    case "choose":
    case "conjugate":
    case "listen": {
      const options = ex.options;
      return (
        <div>
          {ex.type === "listen" ? (
            <div className="mb-8 flex items-center gap-4">
              <SpeakButton text={ex.item.es} size="lg" label="Play again" />
              <span className="text-ink-soft">Tap to hear it again</span>
            </div>
          ) : ex.type === "conjugate" ? (
            <h1 className="mb-8 font-display text-3xl font-extrabold leading-tight">
              <span className="text-agave-deep">{ex.person}</span> + {ex.conj.verb}
              <span className="mt-1 block text-base font-medium text-ink-soft">
                {ex.conj.en}, {ex.conj.tense}
              </span>
            </h1>
          ) : (
            <h1 className="mb-8 font-display text-4xl font-extrabold leading-tight">{ex.item.en}</h1>
          )}
          <div className="grid gap-3">
            {options.map((o) => (
              <button
                key={o}
                disabled={locked}
                onClick={() => {
                  setPending(o);
                  if (ex.type !== "listen") speak(o);
                }}
                className={`rounded-2xl border-2 px-5 py-4 text-left text-lg font-bold transition ${
                  pending === o ? "border-agave bg-agave-pale" : "border-line bg-white hover:border-ink-soft"
                } disabled:cursor-default`}
              >
                {o}
              </button>
            ))}
          </div>
        </div>
      );
    }
    case "type":
      return (
        <div>
          <h1 className="mb-8 font-display text-4xl font-extrabold leading-tight">{ex.item.en}</h1>
          <label className="sr-only" htmlFor="answer">
            Your answer in Spanish
          </label>
          <input
            id="answer"
            autoFocus
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            lang="es"
            disabled={locked}
            value={pending}
            onChange={(e) => setPending(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") (document.getElementById("check-btn") as HTMLButtonElement | null)?.click();
            }}
            placeholder="Escribe aquí"
            className="w-full rounded-2xl border-2 border-line bg-white px-5 py-4 text-xl outline-none focus:border-agave"
          />
          <AccentKeys onKey={(k) => setPending(pending + k)} disabled={locked} />
        </div>
      );
    case "tiles":
      return <Tiles ex={ex} setPending={setPending} locked={locked} />;
  }
}

function AccentKeys({ onKey, disabled }: { onKey: (k: string) => void; disabled: boolean }) {
  return (
    <div className="mt-3 flex flex-wrap gap-2" aria-label="Spanish letters">
      {["á", "é", "í", "ó", "ú", "ñ", "ü", "¿", "¡"].map((k) => (
        <button
          key={k}
          type="button"
          disabled={disabled}
          onClick={() => {
            onKey(k);
            document.getElementById("answer")?.focus();
          }}
          className="h-10 w-10 rounded-lg border-2 border-line bg-white text-lg font-bold hover:border-ink-soft"
        >
          {k}
        </button>
      ))}
    </div>
  );
}

function Tiles({ ex, setPending, locked }: { ex: Extract<Exercise, { type: "tiles" }>; setPending: (s: string) => void; locked: boolean }) {
  const [placed, setPlaced] = useState<number[]>([]);
  const tiles = useMemo(() => ex.tiles, [ex]);
  useEffect(() => setPending(placed.map((p) => tiles[p]).join(" ")), [placed, tiles, setPending]);
  return (
    <div>
      <h1 className="mb-6 font-display text-3xl font-extrabold leading-tight">{ex.item.en}</h1>
      <div className="mb-6 flex min-h-16 flex-wrap content-start gap-2 border-b-2 border-line pb-3">
        {placed.map((p, k) => (
          <button key={`${p}-${k}`} disabled={locked} onClick={() => setPlaced(placed.filter((_, j) => j !== k))} className="rounded-xl border-2 border-ink/20 bg-white px-3 py-2 text-lg font-bold shadow-[0_2px_0_var(--color-line)]">
            {tiles[p]}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {tiles.map((t, k) => {
          const used = placed.includes(k);
          return (
            <button
              key={k}
              disabled={used || locked}
              onClick={() => setPlaced([...placed, k])}
              className={`rounded-xl border-2 px-3 py-2 text-lg font-bold ${used ? "border-line bg-line text-transparent" : "border-ink/20 bg-white shadow-[0_2px_0_var(--color-line)]"}`}
            >
              {t}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Footer({
  ex,
  result,
  pending,
  revealed,
  onReveal,
  onSelfGrade,
  onCheck,
  onNext,
}: {
  ex: Exercise;
  result: Result | null;
  pending: string;
  revealed: boolean;
  onReveal: () => void;
  onSelfGrade: (ok: boolean) => void;
  onCheck: () => void;
  onNext: () => void;
}) {
  const btn = "w-full rounded-2xl py-4 text-lg font-bold transition active:translate-y-[3px] active:shadow-none disabled:opacity-40";

  if (ex.type === "recall") {
    return (
      <footer className="sticky bottom-0 -mx-4 bg-paper px-4 pt-4 pb-6">
        {!revealed ? (
          <button onClick={onReveal} className={`${btn} bg-ink text-white shadow-[0_4px_0_#0d1726]`}>
            Show the answer
          </button>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => onSelfGrade(false)} className={`${btn} border-2 border-line bg-white text-ink`}>
              Not yet
            </button>
            <button onClick={() => onSelfGrade(true)} className={`${btn} bg-agave text-white shadow-[0_4px_0_var(--color-agave-deep)]`}>
              I knew it
            </button>
          </div>
        )}
      </footer>
    );
  }

  if (!result) {
    return (
      <footer className="sticky bottom-0 -mx-4 bg-paper px-4 pt-4 pb-6">
        <button id="check-btn" onClick={onCheck} disabled={!pending} className={`${btn} bg-agave text-white shadow-[0_4px_0_var(--color-agave-deep)]`}>
          Check
        </button>
      </footer>
    );
  }

  const ok = result.ok;
  const near = ok && result.verdict && result.verdict !== "correct";
  return (
    <footer className={`animate-pop sticky bottom-0 -mx-4 px-4 pt-5 pb-6 ${ok ? "bg-agave-pale" : "bg-coral-pale"} ${ok ? "" : "animate-shake"}`} role="status">
      <p className={`font-display text-2xl font-extrabold ${ok ? "text-agave-deep" : "text-coral"}`}>{ok ? (near ? "Close enough" : "¡Muy bien!") : "Correct answer:"}</p>
      <div className="mt-1 mb-4 flex items-center gap-3">
        {(!ok || near) && <p className="text-lg font-bold">{result.answer}</p>}
        {near && result.verdict === "accent" && <span className="text-sm text-ink-soft">Watch the accents.</span>}
        {near && result.verdict === "article" && <span className="text-sm text-ink-soft">Include el / la with the noun.</span>}
        {ex.item.note && ok && !near && <p className="text-sm text-ink-soft">{ex.item.note}</p>}
      </div>
      <button autoFocus onClick={onNext} className={`${btn} ${ok ? "bg-agave shadow-[0_4px_0_var(--color-agave-deep)]" : "bg-coral shadow-[0_4px_0_#a33545]"} text-white`}>
        Continue
      </button>
    </footer>
  );
}
