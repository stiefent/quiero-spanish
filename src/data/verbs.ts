import type { Conjugation, Person } from "./types";

/**
 * Conjugation engine for the book's "most probable" tenses. Regular verbs are
 * generated from the AR / ER / IR models (tomar, comer, vivir); irregular and
 * stem-changing forms are listed explicitly below.
 */
export type Tense = "present" | "preterite" | "going to" | "imperfect" | "future" | "conditional";

type Forms = [string, string, string, string, string]; // yo, tú, él, nosotros, ellos

const P: Person[] = ["yo", "tú", "él/ella/usted", "nosotros", "ellos/ustedes"];
const toForms = (f: Forms): Record<Person, string> => Object.fromEntries(P.map((p, i) => [p, f[i]])) as Record<Person, string>;

const ENDINGS: Record<"present" | "preterite" | "imperfect", Record<"ar" | "er" | "ir", Forms>> = {
  present: {
    ar: ["o", "as", "a", "amos", "an"],
    er: ["o", "es", "e", "emos", "en"],
    ir: ["o", "es", "e", "imos", "en"],
  },
  preterite: {
    ar: ["é", "aste", "ó", "amos", "aron"],
    er: ["í", "iste", "ió", "imos", "ieron"],
    ir: ["í", "iste", "ió", "imos", "ieron"],
  },
  imperfect: {
    ar: ["aba", "abas", "aba", "ábamos", "aban"],
    er: ["ía", "ías", "ía", "íamos", "ían"],
    ir: ["ía", "ías", "ía", "íamos", "ían"],
  },
};
const FUTURE: Forms = ["é", "ás", "á", "emos", "án"];
const COND: Forms = ["ía", "ías", "ía", "íamos", "ían"];

/** Explicit forms that the regular rules would get wrong. */
const IRREG: Record<string, Partial<Record<Tense, Forms>> & { futStem?: string }> = {
  ser: {
    present: ["soy", "eres", "es", "somos", "son"],
    preterite: ["fui", "fuiste", "fue", "fuimos", "fueron"],
    imperfect: ["era", "eras", "era", "éramos", "eran"],
  },
  estar: {
    present: ["estoy", "estás", "está", "estamos", "están"],
    preterite: ["estuve", "estuviste", "estuvo", "estuvimos", "estuvieron"],
  },
  traer: {
    present: ["traigo", "traes", "trae", "traemos", "traen"],
    preterite: ["traje", "trajiste", "trajo", "trajimos", "trajeron"],
  },
  poder: {
    present: ["puedo", "puedes", "puede", "podemos", "pueden"],
    preterite: ["pude", "pudiste", "pudo", "pudimos", "pudieron"],
    futStem: "podr",
  },
  venir: {
    present: ["vengo", "vienes", "viene", "venimos", "vienen"],
    preterite: ["vine", "viniste", "vino", "vinimos", "vinieron"],
    futStem: "vendr",
  },
  hacer: {
    present: ["hago", "haces", "hace", "hacemos", "hacen"],
    preterite: ["hice", "hiciste", "hizo", "hicimos", "hicieron"],
    futStem: "har",
  },
  dar: {
    present: ["doy", "das", "da", "damos", "dan"],
    preterite: ["di", "diste", "dio", "dimos", "dieron"],
  },
  ir: {
    present: ["voy", "vas", "va", "vamos", "van"],
    preterite: ["fui", "fuiste", "fue", "fuimos", "fueron"],
    imperfect: ["iba", "ibas", "iba", "íbamos", "iban"],
  },
  tener: {
    present: ["tengo", "tienes", "tiene", "tenemos", "tienen"],
    preterite: ["tuve", "tuviste", "tuvo", "tuvimos", "tuvieron"],
    futStem: "tendr",
  },
  oír: {
    present: ["oigo", "oyes", "oye", "oímos", "oyen"],
    preterite: ["oí", "oíste", "oyó", "oímos", "oyeron"],
  },
  saber: {
    present: ["sé", "sabes", "sabe", "sabemos", "saben"],
    preterite: ["supe", "supiste", "supo", "supimos", "supieron"],
    futStem: "sabr",
  },
  poner: {
    present: ["pongo", "pones", "pone", "ponemos", "ponen"],
    preterite: ["puse", "pusiste", "puso", "pusimos", "pusieron"],
    futStem: "pondr",
  },
  decir: {
    present: ["digo", "dices", "dice", "decimos", "dicen"],
    preterite: ["dije", "dijiste", "dijo", "dijimos", "dijeron"],
    futStem: "dir",
  },
  querer: {
    present: ["quiero", "quieres", "quiere", "queremos", "quieren"],
    preterite: ["quise", "quisiste", "quiso", "quisimos", "quisieron"],
    futStem: "querr",
  },
  ver: {
    present: ["veo", "ves", "ve", "vemos", "ven"],
    preterite: ["vi", "viste", "vio", "vimos", "vieron"],
    imperfect: ["veía", "veías", "veía", "veíamos", "veían"],
  },
  salir: { present: ["salgo", "sales", "sale", "salimos", "salen"], futStem: "saldr" },
  conocer: { present: ["conozco", "conoces", "conoce", "conocemos", "conocen"] },
  leer: { preterite: ["leí", "leíste", "leyó", "leímos", "leyeron"] },
  // Stem changers (present only; preterite of -ir stem changers shifts e>i / o>u in 3rd person)
  pensar: { present: ["pienso", "piensas", "piensa", "pensamos", "piensan"] },
  empezar: { present: ["empiezo", "empiezas", "empieza", "empezamos", "empiezan"], preterite: ["empecé", "empezaste", "empezó", "empezamos", "empezaron"] },
  cerrar: { present: ["cierro", "cierras", "cierra", "cerramos", "cierran"] },
  entender: { present: ["entiendo", "entiendes", "entiende", "entendemos", "entienden"] },
  perder: { present: ["pierdo", "pierdes", "pierde", "perdemos", "pierden"] },
  preferir: { present: ["prefiero", "prefieres", "prefiere", "preferimos", "prefieren"], preterite: ["preferí", "preferiste", "prefirió", "preferimos", "prefirieron"] },
  sentir: { present: ["siento", "sientes", "siente", "sentimos", "sienten"], preterite: ["sentí", "sentiste", "sintió", "sentimos", "sintieron"] },
  dormir: { present: ["duermo", "duermes", "duerme", "dormimos", "duermen"], preterite: ["dormí", "dormiste", "durmió", "dormimos", "durmieron"] },
  volver: { present: ["vuelvo", "vuelves", "vuelve", "volvemos", "vuelven"] },
  encontrar: { present: ["encuentro", "encuentras", "encuentra", "encontramos", "encuentran"] },
  recordar: { present: ["recuerdo", "recuerdas", "recuerda", "recordamos", "recuerdan"] },
  almorzar: { present: ["almuerzo", "almuerzas", "almuerza", "almorzamos", "almuerzan"], preterite: ["almorcé", "almorzaste", "almorzó", "almorzamos", "almorzaron"] },
  costar: { present: ["cuesto", "cuestas", "cuesta", "costamos", "cuestan"] },
  jugar: { present: ["juego", "juegas", "juega", "jugamos", "juegan"], preterite: ["jugué", "jugaste", "jugó", "jugamos", "jugaron"] },
  pedir: { present: ["pido", "pides", "pide", "pedimos", "piden"], preterite: ["pedí", "pediste", "pidió", "pedimos", "pidieron"] },
  repetir: { present: ["repito", "repites", "repite", "repetimos", "repiten"], preterite: ["repetí", "repetiste", "repitió", "repetimos", "repitieron"] },
  servir: { present: ["sirvo", "sirves", "sirve", "servimos", "sirven"], preterite: ["serví", "serviste", "sirvió", "servimos", "sirvieron"] },
  seguir: { present: ["sigo", "sigues", "sigue", "seguimos", "siguen"], preterite: ["seguí", "seguiste", "siguió", "seguimos", "siguieron"] },
  comenzar: { present: ["comienzo", "comienzas", "comienza", "comenzamos", "comienzan"], preterite: ["comencé", "comenzaste", "comenzó", "comenzamos", "comenzaron"] },
  conseguir: { present: ["consigo", "consigues", "consigue", "conseguimos", "consiguen"], preterite: ["conseguí", "conseguiste", "consiguió", "conseguimos", "consiguieron"] },
  probar: { present: ["pruebo", "pruebas", "prueba", "probamos", "prueban"] },
  creer: { preterite: ["creí", "creíste", "creyó", "creímos", "creyeron"] },
  acostar: { present: ["acuesto", "acuestas", "acuesta", "acostamos", "acuestan"] },
  sentar: { present: ["siento", "sientas", "sienta", "sentamos", "sientan"] },
  divertir: { present: ["divierto", "diviertes", "divierte", "divertimos", "divierten"], preterite: ["divertí", "divertiste", "divirtió", "divertimos", "divirtieron"] },
  caer: { present: ["caigo", "caes", "cae", "caemos", "caen"], preterite: ["caí", "caíste", "cayó", "caímos", "cayeron"] },
  equivocar: { preterite: ["equivoqué", "equivocaste", "equivocó", "equivocamos", "equivocaron"] },
  buscar: { preterite: ["busqué", "buscaste", "buscó", "buscamos", "buscaron"] },
  tocar: { preterite: ["toqué", "tocaste", "tocó", "tocamos", "tocaron"] },
  llegar: { preterite: ["llegué", "llegaste", "llegó", "llegamos", "llegaron"] },
  pagar: { preterite: ["pagué", "pagaste", "pagó", "pagamos", "pagaron"] },
};

function ending(verb: string): "ar" | "er" | "ir" {
  const e = verb.slice(-2).replace("í", "i");
  return e as "ar" | "er" | "ir";
}

const REFL: Forms = ["me", "te", "se", "nos", "se"];

export function conjugate(verb: string, tense: Tense): Record<Person, string> {
  // Reflexive verbs: conjugate the base verb, put the pronoun in front.
  if (verb.endsWith("se") && verb !== "ser") {
    const base = verb.slice(0, -2);
    const f = conjugate(base, tense);
    return Object.fromEntries(P.map((p, i) => [p, `${REFL[i]} ${f[p]}`])) as Record<Person, string>;
  }
  const irr = IRREG[verb];
  if (irr?.[tense]) return toForms(irr[tense]!);
  const stem = verb.slice(0, -2);
  const e = ending(verb);
  switch (tense) {
    case "present":
    case "preterite":
    case "imperfect":
      return toForms(ENDINGS[tense][e].map((x) => stem + x) as Forms);
    case "future":
      return toForms(FUTURE.map((x) => (irr?.futStem ?? verb.replace("í", "i")) + x) as Forms);
    case "conditional":
      return toForms(COND.map((x) => (irr?.futStem ?? verb.replace("í", "i")) + x) as Forms);
    case "going to": {
      const ir = IRREG.ir.present!;
      return toForms(ir.map((x) => `${x} a ${verb}`) as Forms);
    }
  }
}

export function table(verb: string, en: string, tense: Tense): Conjugation {
  return { verb, en, tense, forms: conjugate(verb, tense) };
}

/** Several tenses of several verbs. */
export function tables(verbs: [string, string][], tenses: Tense[]): Conjugation[] {
  return verbs.flatMap(([v, en]) => tenses.map((t) => table(v, en, t)));
}
