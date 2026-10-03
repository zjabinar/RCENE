/** String-table types and constructors (kept apart from index.ts to avoid an import cycle with common.ts). */

export type StringTable = Record<string, string>;

export interface Strings<T extends StringTable> {
  en: T;
  war: Partial<Record<keyof T, string>>;
  fil: Partial<Record<keyof T, string>>;
}

export function defineStrings<T extends StringTable>(tables: {
  en: T;
  war?: Partial<Record<keyof T, string>>;
  fil?: Partial<Record<keyof T, string>>;
}): Strings<T> {
  return { en: tables.en, war: tables.war ?? {}, fil: tables.fil ?? {} };
}

/** Adds an app's strings on top of a base table (usually `common`). */
export function extendStrings<B extends StringTable, A extends StringTable>(
  base: Strings<B>,
  tables: { en: A; war?: Partial<Record<keyof A, string>>; fil?: Partial<Record<keyof A, string>> },
): Strings<B & A> {
  return {
    en: { ...base.en, ...tables.en },
    war: { ...base.war, ...tables.war },
    fil: { ...base.fil, ...tables.fil },
  } as Strings<B & A>;
}
