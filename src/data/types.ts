// Core content types. Content is static JSON so it can later move into Supabase
// tables (units, items, conjugations) without changing the lesson engine.

export type ItemKind = "verb" | "noun" | "phrase" | "word";

export interface Item {
  id: string;
  /** Spanish, as the learner should produce it (with article for nouns). */
  es: string;
  /** English prompt. */
  en: string;
  kind: ItemKind;
  /** Other accepted Spanish answers (synonyms, the other gender, etc.). */
  alt?: string[];
  /** Short usage note shown after answering. */
  note?: string;
}

export type Person = "yo" | "tú" | "él/ella/usted" | "nosotros" | "ellos/ustedes";
export const PERSONS: Person[] = ["yo", "tú", "él/ella/usted", "nosotros", "ellos/ustedes"];
export const PERSON_EN: Record<Person, string> = {
  yo: "I",
  tú: "you (familiar)",
  "él/ella/usted": "he / she / you (formal)",
  nosotros: "we",
  "ellos/ustedes": "they / you all",
};

export interface Conjugation {
  verb: string; // infinitive
  en: string; // "to want"
  tense: string; // "present", "preterite", ...
  forms: Record<Person, string>;
}

/**
 * The seven levels from the book's bell-curve figures. Learning starts at the
 * apex (most-used words) and spreads outward toward the tails.
 */
export const STEPS = [
  "Functional",
  "Hi Functional",
  "Conversational",
  "Hi Conversational",
  "Fluid",
  "Fluent",
  "Bilingual",
] as const;

export interface Unit {
  id: string;
  title: string;
  titleEs?: string;
  /** Index into STEPS. */
  step: number;
  summary: string;
  /** The author's "handle": the why behind this unit, shown before the lesson. */
  handle?: string;
  items: Item[];
  conjugations?: Conjugation[];
  source: string; // where in the book this comes from
}
