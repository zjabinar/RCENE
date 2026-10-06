/**
 * Layers that may never exist (land cover, coastal lines, heightmap metadata…).
 *
 * `useLayer` fetches straight away, so a file that is not shipped answers 404,
 * which the browser logs as a console error (and the smoke test fails on
 * console errors). `useOptionalLayer` reads /data/manifest.json first and only
 * fetches files the manifest lists: an absent file costs no request at all.
 *
 *   const landcover = useOptionalLayer("landcover.geojson", landcoverSchema);
 *   if (landcover.status === "ready") draw(landcover.data);
 *   // "absent": not shipped, hide the feature; "invalid": shipped but unreadable
 */
import { useEffect, useState } from "react";
import { dataFileKey, fetchDataFile, fetchManifest, LayerMissingError } from "./load.ts";

/** Anything with zod's `safeParse` shape, e.g. a schema from `@rcene/data/schemas` or your own `z.object(…)`. */
export interface SafeParser<T> {
  safeParse(value: unknown): { success: boolean; data?: T; error?: unknown };
}

export type OptionalLayerState<T> =
  | { status: "loading" }
  /** Not listed in the manifest (or not served): the app should do without it. */
  | { status: "absent" }
  /** Listed, but it could not be read or parsed, or it failed the schema. */
  | { status: "invalid"; error: string }
  | { status: "ready"; data: T };

export type SettledOptionalLayer<T> = Exclude<OptionalLayerState<T>, { status: "loading" }>;

interface IssueLike {
  path?: readonly PropertyKey[];
  message?: string;
}

/** A short, readable reason: the first zod issue (with its path), an Error's message, or the value. */
function describeError(error: unknown): string {
  if (error && typeof error === "object" && "issues" in error && Array.isArray(error.issues) && error.issues.length > 0) {
    const issues = error.issues as IssueLike[];
    const first = issues[0]!;
    const path = first.path?.length ? first.path.map(String).join(".") : "(root)";
    const more = issues.length > 1 ? ` (+${issues.length - 1} more)` : "";
    return `${path}: ${first.message ?? "invalid value"}${more}`;
  }
  if (error instanceof Error) return error.message || error.name;
  if (typeof error === "string") return error;
  return "invalid data";
}

/**
 * Non-hook version of `useOptionalLayer`: resolves to absent / invalid / ready
 * and never rejects. `file` is relative to /data/ (a leading "/data/" is fine).
 */
export async function loadOptionalLayer<T = unknown>(file: string, schema?: SafeParser<T>): Promise<SettledOptionalLayer<T>> {
  const key = dataFileKey(file);
  const manifest = await fetchManifest();
  if (!Object.hasOwn(manifest.files, key)) return { status: "absent" };

  let raw: unknown;
  try {
    raw = await fetchDataFile(key);
  } catch (error) {
    if (error instanceof LayerMissingError) return { status: "absent" };
    return { status: "invalid", error: describeError(error) };
  }
  if (!schema) return { status: "ready", data: raw as T };

  try {
    const result = schema.safeParse(raw);
    if (!result.success) return { status: "invalid", error: describeError(result.error) };
    return { status: "ready", data: result.data as T };
  } catch (error) {
    return { status: "invalid", error: describeError(error) };
  }
}

/**
 * Loads a file under /data/ only if the manifest lists it, so a layer that may
 * not exist never triggers a 404. Pass a zod schema to validate (and type) it.
 * The schema is read when `file` changes; changing only the schema does not refetch.
 */
export function useOptionalLayer<T = unknown>(file: string, schema?: SafeParser<T>): OptionalLayerState<T> {
  // Like useLayer: the state remembers which file it belongs to, so a changed
  // `file` never shows the previous file's data, not even for one render.
  const [state, setState] = useState<{ file: string; value: OptionalLayerState<T> }>({
    file,
    value: { status: "loading" },
  });
  useEffect(() => {
    let alive = true;
    void loadOptionalLayer(file, schema).then((value) => {
      if (alive) setState({ file, value });
    });
    return () => {
      alive = false;
    };
    // `file` identifies the request; an inline schema is a new object every render.
  }, [file]);
  return state.file === file ? state.value : { status: "loading" };
}
