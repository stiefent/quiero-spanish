import type { Conjugation, Item, Person, Unit } from "@/data/types";
import { PERSONS } from "@/data/types";
import type { Progress } from "./progress";

export type Exercise =
  | { type: "recall"; item: Item }
  | { type: "choose"; item: Item; options: string[] }
  | { type: "listen"; item: Item; options: string[] }
  | { type: "type"; item: Item }
  | { type: "tiles"; item: Item; tiles: string[] }
  | { type: "conjugate"; item: Item; conj: Conjugation; person: Person; options: string[] };

function shuffle<T>(a: T[]): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

const first = (s: string) => s.split(/,|\//)[0].replace(/\(.*?\)/g, "").trim();

function distractors(item: Item, pool: Item[], field: "es" | "en", n = 3): string[] {
  const sameKind = pool.filter((p) => p.id !== item.id && p.kind === item.kind);
  const others = pool.filter((p) => p.id !== item.id && p.kind !== item.kind);
  const picks = [...shuffle(sameKind), ...shuffle(others)].map((p) => first(p[field]));
  const right = first(item[field]);
  return [...new Set(picks.filter((p) => p !== right))].slice(0, n);
}

const wordCount = (s: string) => first(s).split(/\s+/).length;

/**
 * Build one lesson for a unit.
 *
 * New words are introduced with a recall card first (English shown, a pause
 * to retrieve, then the answer) — the book's retrieval-practice "handle".
 * Every word then gets one active exercise, rotating through the types.
 */
export function buildLesson(unit: Unit, progress: Progress, pool: Item[], size = 8): Exercise[] {
  const now = Date.now();
  const ranked = [...unit.items].sort((a, b) => {
    const sa = progress.items[a.id];
    const sb = progress.items[b.id];
    // Unseen first (keeping book order), then due/weak.
    if (!sa && !sb) return 0;
    if (!sa) return -1;
    if (!sb) return 1;
    const da = sa.due <= now ? 0 : 1;
    const db = sb.due <= now ? 0 : 1;
    return da - db || sa.box - sb.box;
  });
  const chosen = ranked.slice(0, size);
  const ex: Exercise[] = [];

  chosen.forEach((item) => {
    if (!progress.items[item.id] || progress.items[item.id].box === 0) ex.push({ type: "recall", item });
  });

  const active: Exercise[] = chosen.map((item, i) => {
    const kinds: Exercise["type"][] = ["choose", "listen", "type"];
    if (wordCount(item.es) >= 3) kinds.push("tiles", "tiles");
    const box = progress.items[item.id]?.box ?? 0;
    // Weaker words get recognition; stronger words get production.
    const t = box >= 2 ? (wordCount(item.es) >= 3 ? "tiles" : "type") : kinds[i % kinds.length];
    return makeExercise(t, item, pool);
  });
  ex.push(...shuffle(active));

  if (unit.conjugations?.length) {
    const c = shuffle(unit.conjugations).slice(0, 4);
    c.forEach((conj) => {
      const person = PERSONS[Math.floor(Math.random() * PERSONS.length)];
      const right = conj.forms[person];
      const wrong = shuffle(PERSONS.filter((p) => conj.forms[p] !== right).map((p) => conj.forms[p]));
      const item: Item = {
        id: `conj:${conj.verb}:${conj.tense}:${person}`,
        es: right,
        en: `${conj.en} — ${person}`,
        kind: "verb",
      };
      ex.push({ type: "conjugate", item, conj, person, options: shuffle([right, ...[...new Set(wrong)].slice(0, 3)]) });
    });
  }
  return ex;
}

export function makeExercise(t: Exercise["type"], item: Item, pool: Item[]): Exercise {
  switch (t) {
    case "choose":
      return { type: "choose", item, options: shuffle([first(item.es), ...distractors(item, pool, "es")]) };
    case "listen":
      return { type: "listen", item, options: shuffle([first(item.en), ...distractors(item, pool, "en")]) };
    case "tiles": {
      const words = first(item.es).split(/\s+/);
      const extra = shuffle(pool.filter((p) => p.id !== item.id).flatMap((p) => first(p.es).split(/\s+/)))
        .filter((w) => !words.includes(w))
        .slice(0, 2);
      return { type: "tiles", item, tiles: shuffle([...words, ...extra]) };
    }
    case "type":
      return { type: "type", item };
    default:
      return { type: "recall", item };
  }
}

/** Review session across all units, from the weakest/most-due items. */
export function buildReview(allItems: Item[], progress: Progress, size = 10): Exercise[] {
  const now = Date.now();
  const seen = allItems.filter((i) => progress.items[i.id]);
  const ranked = seen.sort((a, b) => {
    const sa = progress.items[a.id];
    const sb = progress.items[b.id];
    const da = sa.due <= now ? 0 : 1;
    const db = sb.due <= now ? 0 : 1;
    return da - db || sa.box - sb.box || sb.misses - sa.misses;
  });
  return ranked.slice(0, size).map((item, i) => {
    const t: Exercise["type"] = wordCount(item.es) >= 3 && i % 2 ? "tiles" : (["type", "choose", "listen"] as const)[i % 3];
    return makeExercise(t, item, allItems);
  });
}

export { first as firstForm };
