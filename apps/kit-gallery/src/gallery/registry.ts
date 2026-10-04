/**
 * Every example in src/examples/<family>/<slug>.example.tsx, live and as source.
 * Adding a file is all it takes to list it; registry.test.ts fails when a kit
 * export has no example.
 */
import type { ComponentType } from "react";
import type { Lang } from "@rcene/i18n";

export const FAMILIES = ["app", "site", "poster", "brand"] as const;
export type Family = (typeof FAMILIES)[number];

export interface ExampleMeta {
  /** The block name(s) as written in code, e.g. "DataTable". Shown as the title. */
  title: string;
  /** One sentence: when to use it. English required; Waray and Filipino drafts welcome. */
  summary: { en: string } & Partial<Record<Exclude<Lang, "en">, string>>;
  /** Every kit export this example demonstrates (registry.test.ts checks coverage). */
  blocks: string[];
  /** Sort order within the family (lower first). */
  order?: number;
  /** Height of the phone-width frame in px (default 640). */
  frameHeight?: number;
  /** Render the inline preview without padding (full-bleed blocks such as a hero or a shell). */
  bleed?: boolean;
}

export interface ExampleModule {
  meta: ExampleMeta;
  Example: ComponentType;
}

export interface GalleryEntry extends ExampleModule {
  family: Family;
  slug: string;
  source: string;
}

const modules = import.meta.glob<ExampleModule>("../examples/*/*.example.tsx", { eager: true });
const sources = import.meta.glob<string>("../examples/*/*.example.tsx", { eager: true, query: "?raw", import: "default" });

const PATH = /\/examples\/([a-z]+)\/([a-z0-9-]+)\.example\.tsx$/;

export function isFamily(value: string | undefined): value is Family {
  return (FAMILIES as readonly string[]).includes(value ?? "");
}

function build(): GalleryEntry[] {
  const entries: GalleryEntry[] = [];
  for (const [path, mod] of Object.entries(modules)) {
    const match = PATH.exec(path);
    if (!match || !isFamily(match[1])) continue;
    entries.push({ ...mod, family: match[1], slug: match[2]!, source: tidySource(sources[path] ?? "") });
  }
  return entries.sort((a, b) => (a.meta.order ?? 100) - (b.meta.order ?? 100) || a.meta.title.localeCompare(b.meta.title));
}

/** The copyable snippet: drop the gallery-only `meta` block so the code reads like app code. */
export function tidySource(source: string): string {
  return source
    .replace(/import type \{ ExampleMeta \} from "[^"]+";\n/, "")
    .replace(/\nexport const meta: ExampleMeta = \{[\s\S]*?\n\};\n/, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export const ENTRIES: readonly GalleryEntry[] = build();

export function entriesOf(family: Family): GalleryEntry[] {
  return ENTRIES.filter((e) => e.family === family);
}

export function findEntry(family: Family, slug: string | undefined): GalleryEntry | undefined {
  return ENTRIES.find((e) => e.family === family && e.slug === slug);
}
