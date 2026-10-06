/**
 * Small text helpers for the demo rules: normalising, matching keywords in English,
 * Filipino and Waray, picking the first sentence. Deterministic and dependency-free.
 */

/** Lower case, accents removed, punctuation turned into spaces, single spaces. */
export function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9ñ]+/g, " ")
    .trim();
}

/** True when `keyword` (a word or a phrase) appears in `text` as whole words. */
export function hasKeyword(text: string, keyword: string): boolean {
  const k = normalizeText(keyword);
  if (!k) return false;
  return ` ${normalizeText(text)} `.includes(` ${k} `);
}

/** The keywords of `keywords` found in `text`, in the given order, without repeats. */
export function matchKeywords(text: string, keywords: readonly string[]): string[] {
  const haystack = ` ${normalizeText(text)} `;
  const found: string[] = [];
  for (const keyword of keywords) {
    const k = normalizeText(keyword);
    if (k && haystack.includes(` ${k} `) && !found.includes(keyword)) found.push(keyword);
  }
  return found;
}

const STOPWORDS = new Set(
  (
    "a an and are as at be by for from has have in is it of on or that the this to was were will with " +
    "ang ng mga sa na at ay si ni ko mo ka kami kayo sila ito iyan iyon may wala hindi oo po " +
    "an han hin nga ngan ha kay waray mayda ini iton adto amon ira"
  ).split(" "),
);

/** The content words of `text` (normalised, stopwords and 1–2 letter words removed). */
export function contentWords(text: string): string[] {
  return normalizeText(text)
    .split(" ")
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

/** The first sentence (or the first `max` characters) of `text`. */
export function firstSentence(text: string, max = 160): string {
  const clean = text.replace(/\s+/g, " ").trim();
  const match = /^(.+?[.!?])(\s|$)/.exec(clean);
  const sentence = match ? match[1]! : clean;
  return sentence.length > max ? `${sentence.slice(0, max - 1).trimEnd()}…` : sentence;
}

/** Splits text into sentences (keeps their punctuation). */
export function sentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/** Rounds a confidence to two decimals. */
export const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Words that signal urgency in community reports (English, Filipino, Waray). The demo
 * rules raise the priority when one appears; a live model reads the whole text.
 */
export const URGENT_KEYWORDS: readonly string[] = [
  // English
  "urgent", "emergency", "danger", "dangerous", "flood", "flooding", "fire", "injured", "injury", "accident",
  "collapsed", "collapse", "outbreak", "sick", "hospital", "children", "elderly", "senior", "pregnant",
  "blocked", "no water", "live wire", "electrocution", "landslide", "trapped", "dead", "evacuate", "immediately",
  // Filipino
  "baha", "sunog", "delikado", "aksidente", "nasugatan", "sugatan", "bata", "matanda", "buntis", "gumuho",
  "walang tubig", "apurahan", "agad", "nakuryente", "nalunod", "nasira ang tulay", "naaksidente", "nabangga",
  // Waray
  "peligro", "waray tubig", "lagas", "nalumos",
];
