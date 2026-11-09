"use client";

import { useEffect, useMemo, useState } from "react";
import { UNITS, ALL_ITEMS, unitItemIds } from "@/data/curriculum";
import { STEPS, type Unit } from "@/data/types";
import { BellCurve } from "@/components/BellCurve";
import { LessonRunner } from "@/components/LessonRunner";
import { SpeakButton } from "@/components/Speak";
import { buildLesson, buildReview, type Exercise } from "@/lib/lesson";
import { completeLesson, liveStreak, resetProgress, unitStrength, useProgress, type Progress } from "@/lib/progress";

type View =
  | { name: "home" }
  | { name: "unit"; id: string }
  | { name: "lesson"; id: string; exercises: Exercise[] }
  | { name: "review"; exercises: Exercise[] }
  | { name: "done"; id: string | null; score: number };

function readHash(): View {
  if (typeof window === "undefined") return { name: "home" };
  const m = window.location.hash.match(/^#\/unit\/(.+)$/);
  if (m && UNITS.some((u) => u.id === m[1])) return { name: "unit", id: m[1] };
  return { name: "home" };
}

export default function App() {
  const progress = useProgress();
  const [view, setView] = useState<View>({ name: "home" });

  useEffect(() => {
    setView(readHash());
    const on = () => setView(readHash());
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [view.name]);

  const go = (hash: string) => {
    window.location.hash = hash;
  };

  if (view.name === "lesson" || view.name === "review") {
    const unit = view.name === "lesson" ? UNITS.find((u) => u.id === view.id) : null;
    return (
      <LessonRunner
        exercises={view.exercises}
        title={unit?.title ?? "Review"}
        onExit={() => (unit ? setView({ name: "unit", id: unit.id }) : setView({ name: "home" }))}
        onFinish={(score) => {
          if (unit) completeLesson(unit.id, score);
          else completeLesson("__review", score);
          setView({ name: "done", id: unit?.id ?? null, score });
        }}
      />
    );
  }

  if (view.name === "done") return <Done score={view.score} unitId={view.id} progress={progress} onHome={() => { go("/"); setView({ name: "home" }); }} onAgain={() => view.id && setView({ name: "lesson", id: view.id, exercises: buildLesson(UNITS.find((u) => u.id === view.id)!, progress, ALL_ITEMS) })} />;

  if (view.name === "unit") {
    const unit = UNITS.find((u) => u.id === view.id)!;
    return (
      <UnitIntro
        unit={unit}
        progress={progress}
        onBack={() => go("/")}
        onStart={() => setView({ name: "lesson", id: unit.id, exercises: buildLesson(unit, progress, ALL_ITEMS) })}
      />
    );
  }

  return (
    <Home
      progress={progress}
      onOpen={(id) => go(`/unit/${id}`)}
      onReview={() => setView({ name: "review", exercises: buildReview(ALL_ITEMS, progress) })}
    />
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: "marigold" | "agave" }) {
  return (
    <div className={`rounded-full px-3 py-1 text-sm font-bold ${tone === "marigold" ? "bg-marigold-pale text-[#7a5310]" : "bg-agave-pale text-agave-deep"}`} title={label}>
      <span className="sr-only">{label}: </span>
      {value}
    </div>
  );
}

function Home({ progress, onOpen, onReview }: { progress: Progress; onOpen: (id: string) => void; onReview: () => void }) {
  const strengths = useMemo(() => UNITS.map((u) => unitStrength(progress, unitItemIds(u))), [progress]);
  const nextIdx = Math.max(0, UNITS.findIndex((u) => !progress.units[u.id]));
  const next = UNITS[nextIdx] ?? UNITS[0];
  const filled = strengths.reduce((a, b) => a + b, 0) / UNITS.length;
  const seenCount = Object.keys(progress.items).filter((k) => !k.startsWith("conj:")).length;
  const streak = liveStreak(progress);

  const byStep = STEPS.map((s, i) => ({ step: s, units: UNITS.map((u, k) => ({ u, k })).filter(({ u }) => u.step === i) })).filter((g) => g.units.length);

  return (
    <div className="mx-auto max-w-2xl px-4 pb-16">
      <header className="flex items-center justify-between pt-5 pb-2">
        <p className="font-display text-2xl font-extrabold tracking-tight text-agave-deep">quiero</p>
        <div className="flex gap-2">
          <Stat label="Day streak" value={`${streak} ${streak === 1 ? "day" : "days"}`} tone="marigold" />
          <Stat label="Experience points" value={`${progress.xp} XP`} tone="agave" />
        </div>
      </header>

      <section className="pt-6">
        <h1 className="max-w-lg font-display text-[2.6rem] font-extrabold leading-[1.05] tracking-tight sm:text-5xl">Learn the Spanish you’ll use most, first.</h1>
        <p className="mt-3 max-w-md text-lg text-ink-soft">Every word sits under a curve of how often people say it. Start at the top and fill outward.</p>
        <div className="mt-6 rounded-3xl bg-white p-4 pb-2 sm:p-6 sm:pb-3">
          <BellCurve slices={UNITS.map((u, k) => ({ id: u.id, title: u.title, strength: strengths[k], next: k === nextIdx }))} onPick={onOpen} />
          <p className="mt-2 text-center text-sm text-ink-soft">{filled > 0 ? `${Math.round(filled * 100)}% of the curve filled in` : "Your curve is empty. Your first lesson fills the top."}</p>
        </div>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <button onClick={() => onOpen(next.id)} className="flex-1 rounded-2xl bg-agave px-6 py-4 text-left text-white shadow-[0_4px_0_var(--color-agave-deep)] active:translate-y-[3px] active:shadow-none">
            <span className="block text-sm font-bold opacity-80">{progress.units[next.id] ? "Keep going" : nextIdx === 0 ? "Start here" : "Next up"}</span>
            <span className="font-display text-xl font-bold">{next.title}</span>
          </button>
          {seenCount >= 4 && (
            <button onClick={onReview} className="rounded-2xl border-2 border-line bg-white px-6 py-4 text-left">
              <span className="block text-sm font-bold text-ink-soft">Practice</span>
              <span className="font-display text-xl font-bold">Weak words</span>
            </button>
          )}
        </div>
      </section>

      {byStep.map(({ step, units }) => (
        <section key={step} className="mt-12">
          <h2 className="font-display text-xl font-bold">{step}</h2>
          <ol className="mt-3 divide-y divide-line overflow-hidden rounded-2xl border-2 border-line bg-white">
            {units.map(({ u, k }) => (
              <li key={u.id}>
                <button onClick={() => onOpen(u.id)} className="flex w-full items-center gap-4 px-4 py-4 text-left hover:bg-paper">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${progress.units[u.id] ? "bg-agave text-white" : k === nextIdx ? "bg-marigold text-ink" : "bg-paper text-ink-soft"}`}>{k + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold">{u.title}</span>
                    <span className="block truncate text-sm text-ink-soft">{u.titleEs ?? u.summary}</span>
                  </span>
                  <span className="h-2 w-16 shrink-0 overflow-hidden rounded-full bg-line" aria-label={`${Math.round(strengths[k] * 100)}% strong`}>
                    <span className="block h-full bg-agave" style={{ width: `${strengths[k] * 100}%` }} />
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </section>
      ))}

      <footer className="mt-14 space-y-2 text-sm text-ink-soft">
        <p>Word lists and method from Ron Ragsdale’s course, based on the Laws of Probability of Usage. Mexican Spanish.</p>
        <button
          className="underline"
          onClick={() => {
            if (window.confirm("Erase all progress on this device?")) resetProgress();
          }}
        >
          Reset progress
        </button>
      </footer>
    </div>
  );
}

function UnitIntro({ unit, progress, onBack, onStart }: { unit: Unit; progress: Progress; onBack: () => void; onStart: () => void }) {
  const done = progress.units[unit.id];
  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col px-4">
      <header className="pt-4 pb-6">
        <button onClick={onBack} className="rounded-full px-2 py-1 font-bold text-ink-soft hover:bg-white">
          ← All units
        </button>
      </header>
      <main className="flex-1">
        <p className="text-sm font-bold text-agave-deep">{STEPS[unit.step]}</p>
        <h1 className="mt-1 font-display text-4xl font-extrabold leading-tight tracking-tight">{unit.title}</h1>
        {unit.titleEs && <p className="mt-1 text-lg text-ink-soft">{unit.titleEs}</p>}
        <p className="mt-4 text-lg">{unit.summary}</p>
        {unit.handle && (
          <blockquote className="mt-6 border-l-4 border-marigold bg-marigold-pale/60 px-4 py-3">
            <p>{unit.handle}</p>
            <p className="mt-1 text-sm text-ink-soft">Ron’s handle</p>
          </blockquote>
        )}
        <h2 className="mt-8 font-bold">In this unit · {unit.items.length} words{unit.conjugations ? ` · ${unit.conjugations.length} conjugation tables` : ""}</h2>
        <ul className="mt-3 divide-y divide-line rounded-2xl border-2 border-line bg-white">
          {unit.items.map((it) => {
            const st = progress.items[it.id];
            return (
              <li key={it.id} className="flex items-center gap-3 px-4 py-2.5">
                <SpeakButton text={it.es} />
                <span className="min-w-0 flex-1">
                  <span className="block font-bold">{it.es}</span>
                  <span className="block text-sm text-ink-soft">{it.en}</span>
                </span>
                <span className="flex gap-0.5" aria-label={st ? `Strength ${st.box} of 5` : "Not practiced yet"}>
                  {[1, 2, 3, 4, 5].map((b) => (
                    <span key={b} className={`h-3 w-1.5 rounded-sm ${st && st.box >= b ? "bg-agave" : "bg-line"}`} />
                  ))}
                </span>
              </li>
            );
          })}
        </ul>
        {unit.conjugations && <ConjTables unit={unit} />}
      </main>
      <footer className="sticky bottom-0 -mx-4 bg-paper px-4 pt-4 pb-6">
        <button onClick={onStart} className="w-full rounded-2xl bg-agave py-4 text-lg font-bold text-white shadow-[0_4px_0_var(--color-agave-deep)] active:translate-y-[3px] active:shadow-none">
          {done ? "Practice again" : "Start lesson"}
        </button>
      </footer>
    </div>
  );
}

function ConjTables({ unit }: { unit: Unit }) {
  const [open, setOpen] = useState(false);
  const conj = unit.conjugations!;
  return (
    <div className="mt-6">
      <button onClick={() => setOpen(!open)} aria-expanded={open} className="font-bold text-agave-deep underline">
        {open ? "Hide" : "Show"} conjugation tables
      </button>
      {open && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {conj.map((c) => (
            <table key={`${c.verb}-${c.tense}`} className="w-full overflow-hidden rounded-xl border-2 border-line bg-white text-sm">
              <caption className="px-3 py-2 text-left font-bold">
                {c.verb} <span className="font-normal text-ink-soft">· {c.en}, {c.tense}</span>
              </caption>
              <tbody>
                {Object.entries(c.forms).map(([p, f]) => (
                  <tr key={p} className="border-t border-line">
                    <th className="w-1/2 px-3 py-1.5 text-left font-normal text-ink-soft">{p}</th>
                    <td className="px-3 py-1.5 font-bold">{f}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ))}
        </div>
      )}
    </div>
  );
}

function Done({ score, unitId, progress, onHome, onAgain }: { score: number; unitId: string | null; progress: Progress; onHome: () => void; onAgain: () => void }) {
  const pct = Math.round(score * 100);
  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-4 text-center">
      <p className="font-display text-6xl font-extrabold text-agave">{pct}%</p>
      <h1 className="mt-2 font-display text-3xl font-extrabold">{pct >= 80 ? "¡Excelente!" : pct >= 50 ? "¡Bien hecho!" : "¡Sigue así!"}</h1>
      <p className="mx-auto mt-3 max-w-sm text-lg text-ink-soft">
        {pct >= 80 ? "Those words are moving into long-term memory." : "Missed words come back sooner in Weak words practice, so the misses are doing their job."}
      </p>
      <p className="mt-6 font-bold">
        {progress.xp} XP · {liveStreak(progress)} day streak
      </p>
      <div className="mt-8 grid gap-3">
        <button onClick={onHome} className="rounded-2xl bg-agave py-4 text-lg font-bold text-white shadow-[0_4px_0_var(--color-agave-deep)]">
          Back to the curve
        </button>
        {unitId && (
          <button onClick={onAgain} className="rounded-2xl border-2 border-line bg-white py-4 text-lg font-bold">
            Practice this unit again
          </button>
        )}
      </div>
    </div>
  );
}
