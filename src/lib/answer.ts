import type { Item } from "@/data/types";

/** Lowercase, trim, drop punctuation and articles-insensitive spacing. */
export function normalize(s: string, keepAccents = true): string {
  let t = s.toLowerCase().trim();
  t = t.replace(/[¿?¡!.,;:"“”()…]/g, "").replace(/\s+/g, " ");
  if (!keepAccents) t = t.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return t;
}

const ARTICLES = /^(el|la|los|las|un|una)\s+/;

export type Verdict = "correct" | "accent" | "article" | "wrong";

/** All Spanish strings that count as right for an item. */
export function acceptedAnswers(item: Item): string[] {
  const out = new Set<string>();
  const add = (s: string) => {
    // "el gato, la gata" -> both; strip parentheticals like "(food)"
    s.split(/,|\//).forEach((p) => {
      const clean = p.replace(/\(.*?\)/g, "").trim();
      if (clean) out.add(clean);
    });
  };
  add(item.es);
  item.alt?.forEach(add);
  return [...out];
}

/**
 * Grade a typed answer. Missing accents and a missing article are accepted
 * but flagged, so learners are nudged without being punished for keyboards.
 */
export function grade(input: string, item: Item): Verdict {
  const answers = acceptedAnswers(item);
  const a = normalize(input);
  if (!a) return "wrong";
  if (answers.some((x) => normalize(x) === a)) return "correct";
  if (answers.some((x) => normalize(x, false) === normalize(input, false))) return "accent";
  const noArt = (s: string) => normalize(s, false).replace(ARTICLES, "");
  if (answers.some((x) => noArt(x) === noArt(input))) return "article";
  return "wrong";
}
