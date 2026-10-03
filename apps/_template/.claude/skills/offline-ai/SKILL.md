---
name: offline-ai
description: In-browser, offline AI for the ★AI apps (06 Damage Snap photo-severity suggestion, 10 Reklamo complaint auto-categorisation, 20 Sumat semantic service search) with Transformers.js 4.x (@huggingface/transformers) and ONNX Runtime Web running in a Web Worker, with no network and no API key. Covers env settings for local models (/models/), ONNX wasm paths, the typed worker protocol and useWorker hook, Vite worker setup, embeddings and semantic search (multilingual e5), nearest-centroid and zero-shot text classification, zero-shot image classification (CLIP), quantized models, loading progress, keyword fallbacks, honest "suggestion, a human confirms" UX, and scripts/fetch-models.mjs. Use this for anything involving transformers.js, pipeline(), embeddings, cosine similarity, ONNX, model files, AI workers, or the ★AI features.
---

# Offline in-browser AI (apps 06, 10, 20)

The ★AI features must run on the demo laptop with **no network and no API key**. Never call a hosted model (the HF Inference API, OpenAI, and so on). Transformers.js runs a small quantized model inside a **Web Worker**, so the UI never blocks. The model files come from `/models/`, which `@rcene/config` serves from `assets/models/` for apps marked `ai: true` in `projects.json`. The app brief is the spec: it fixes the file names, labels and acceptance criteria. This skill shows how to build them. If the Hugging Face `transformers-js` skill is installed, use it for general API questions. This skill wins on paths, offline setup and UX rules.

Four rules hold everywhere:
1. **AI output is a suggestion that a person confirms.** It never fills a field without a user action, and it is never submitted on its own. Store where the final value came from (`ai-confirmed`, `ai-changed`, `manual`, `rule`).
2. **A deterministic fallback always works.** Keyword or rule logic takes over when the model is missing, fails, or is slow. The UI says which one is answering.
3. **Start lazily.** Don't create the worker or request anything under `/models/` until the person uses the feature. The first load stays light, and the smoke test (which has no models) sees no 404s.
4. **Be honest about language coverage.** The text model handles English and Filipino reasonably well. Waray coverage is weak, so say so in the UI and lean on keyword synonyms.

## Transformers.js 4.3 facts (read from node_modules, not memory)

| What | v4.3 reality |
|---|---|
| Import | `import { env, pipeline, type FeatureExtractionPipeline } from "@huggingface/transformers"`. The browser build is `dist/transformers.web.js`, which imports `onnxruntime-web/webgpu` |
| Local models | `env.allowRemoteModels = false`; `env.allowLocalModels = true` (**false by default in browsers and workers**); `env.localModelPath = "/models/"`. Files resolve to `/models/<repo>/<file>` |
| ORT wasm files | `env.backends.onnx.wasm.wasmPaths = { mjs, wasm }`. The default points at **cdn.jsdelivr.net**, so it fails offline. `env.backends.onnx.wasm` *is* ORT's own `env.wasm` object, so set its `wasmPaths` property; replacing the `wasm` object does nothing |
| Which ORT files | `ort-wasm-simd-threaded.asyncify.mjs` + `.asyncify.wasm` (25.6 MB), from the `onnxruntime-web` version that transformers depends on (1.31.0-dev here). `fetch-models.mjs` copies them to `assets/models/ort/` |
| Tasks | `"feature-extraction"` (alias `"embeddings"`), `"zero-shot-image-classification"`, `"zero-shot-classification"`, `"text-classification"`, `"image-classification"` |
| dtype / device | `{ dtype: "q8", device: "wasm" }` loads `onnx/model_quantized.onnx`. Other dtypes: `fp32` (`model.onnx`), `fp16`, `q4` (`_q4`), and more |
| Progress | `progress_callback` receives `initiate`/`download`/`progress`/`done`/`ready`, plus **`progress_total`** (an aggregate `progress` from 0 to 100) |
| Embedding output | a `Tensor`: `.data` (Float32Array), `.dims` (`[n, 384]`), `.tolist()` |
| Caching | model and wasm files are cached in Cache Storage `transformers-cache` (`env.useBrowserCache`, `env.useWasmCache`) |
| Threads | ORT runs single-threaded unless the page is cross-origin isolated (COOP/COEP). That's fine for these models; don't add the headers |

## Models (fetched once, while online, never committed)

| App | Model (`MODEL_ID`) | Task | Size (q8, approx.) |
|---|---|---|---|
| 20 Sumat, 10 Reklamo | `Xenova/multilingual-e5-small` (MIT, from intfloat) | `feature-extraction`, 384-dim, mean pooling + normalize | ~135 MB (onnx ~118 + tokenizer ~17) |
| 06 Damage Snap | `Xenova/clip-vit-base-patch32` (OpenAI CLIP, MIT; confirm on the model card for /sources) | `zero-shot-image-classification` | ~155 MB |
| all | ONNX Runtime Web | wasm runtime | 25.7 MB |

```powershell
node scripts/fetch-models.mjs --app 20 --dry-run   # shows files, URLs, what is already present
node scripts/fetch-models.mjs --app 20             # downloads into assets/models/<repo>/..., copies ORT into assets/models/ort/
```
`--app 06|10|20|all`, `--force`, `--skip-ort`. Re-runs skip finished files. `HF_ENDPOINT` selects a mirror. `assets/models/` is gitignored: never `git add -f` it. On another machine, run the script there, or copy the folder over. **Re-run it after upgrading `@huggingface/transformers`**, because the ORT files must match its version. One e5 download serves both 10 and 20.

## Vite config

```ts
// apps/NN-slug/vite.config.ts
export default rceneApp({
  dir: fileURLToPath(new URL(".", import.meta.url)),
  overrides: {
    worker: { format: "es" }, // same module format in dev and build
    optimizeDeps: { exclude: ["@huggingface/transformers"] },
  },
});
```
- **Why `exclude`:** without it, the dev server discovers the package only when the worker first loads, and re-optimizes dependencies at that moment (verified). That can force a full page reload in the middle of the first demo run. With `exclude`, the ESM build is served as-is, and its imports `onnxruntime-web/webgpu` and `onnxruntime-common` resolve (verified). `include: ["@huggingface/transformers"]` also works, because it pre-bundles at startup.
- `rceneApp` merges `overrides` shallowly. Passing `build` replaces the preset's whole `build` block. App 06 passes `VitePWA(...)` through `plugins`.
- `pnpm build` copies all of `assets/models` into each AI app's `dist/`. Vite also emits ORT's wasm as an unused asset, because `wasmPaths` wins. Both are fine for a local demo; don't deploy these builds publicly.

## The code (`src/ai/`, adapt names to the brief)

```ts
// src/ai/protocol.ts — the only contract between UI and worker
export type ToWorker<In> =
  | { type: "load" } // optional warm-up, e.g. when the search box gets focus
  | { type: "run"; id: number; input: In };

export type FromWorker<Out> =
  | { type: "progress"; progress: number } // 0..100 across all model files
  | { type: "ready"; model: string }
  | { type: "unavailable"; reason: string } // model missing or failed: use the fallback
  | { type: "result"; id: number; output: Out }
  | { type: "error"; id: number; message: string };

export type EmbedIn = string[]; // 10, 20
export type EmbedOut = { dims: number; data: Float32Array }; // row-major, unit-length rows
```

```ts
// src/ai/config.ts — constants only; the UI (/sources credit) imports it, so no transformers import here
export const MODEL_ID = "Xenova/multilingual-e5-small";
```

```ts
// src/ai/offline.ts — imported by workers only
import { env } from "@huggingface/transformers";

export function configureOfflineModels(): void {
  env.allowRemoteModels = false; // never call huggingface.co
  env.allowLocalModels = true; // false by default in browsers and workers
  env.localModelPath = "/models/"; // assets/models via @rcene/config
  env.backends.onnx.wasm!.wasmPaths = {
    mjs: "/models/ort/ort-wasm-simd-threaded.asyncify.mjs",
    wasm: "/models/ort/ort-wasm-simd-threaded.asyncify.wasm",
  };
}
```

```ts
// src/ai/embed.worker.ts — 10 and 20
import { pipeline, type FeatureExtractionPipeline } from "@huggingface/transformers";
import { MODEL_ID } from "./config.ts";
import { configureOfflineModels } from "./offline.ts";
import type { EmbedIn, EmbedOut, FromWorker, ToWorker } from "./protocol.ts";

configureOfflineModels();

const post = (msg: FromWorker<EmbedOut>, transfer: Transferable[] = []) => self.postMessage(msg, { transfer });
const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e));

let model: Promise<FeatureExtractionPipeline> | null = null;
function load(): Promise<FeatureExtractionPipeline> {
  model ??= (async () => {
    const pipe = await pipeline("feature-extraction", MODEL_ID, {
      dtype: "q8", // onnx/model_quantized.onnx
      device: "wasm",
      progress_callback: (p) => {
        if (p.status === "progress_total") post({ type: "progress", progress: Math.round(p.progress) });
      },
    });
    await pipe("query: warm up", { pooling: "mean", normalize: true }); // the first run is the slow one
    post({ type: "ready", model: MODEL_ID });
    return pipe;
  })().catch((e: unknown) => {
    model = null; // allow a retry later
    post({ type: "unavailable", reason: errorText(e) });
    throw e;
  });
  return model;
}

self.onmessage = async (event: MessageEvent<ToWorker<EmbedIn>>) => {
  const msg = event.data;
  if (msg.type === "load") return void load().catch(() => {});
  try {
    const embed = await load();
    const out = await embed(msg.input, { pooling: "mean", normalize: true });
    const data = out.data as Float32Array;
    post({ type: "result", id: msg.id, output: { dims: out.dims[1]!, data } }, [data.buffer]);
  } catch (e) {
    post({ type: "error", id: msg.id, message: errorText(e) });
  }
};
```

```ts
// src/ai/useWorker.ts — generic: lazy start, typed request/response by id, cleanup on unmount
import { useCallback, useEffect, useRef, useState } from "react";
import type { FromWorker, ToWorker } from "./protocol.ts";

export type AiState =
  | { status: "idle" } // nothing requested yet: no /models/ request made
  | { status: "loading"; progress: number }
  | { status: "ready"; model: string }
  | { status: "unavailable"; reason: string };

type Pending<Out> = { resolve: (output: Out) => void; reject: (error: Error) => void };

export function useWorker<In, Out>(create: () => Worker) {
  const workerRef = useRef<Worker | null>(null);
  const createRef = useRef(create);
  const pending = useRef(new Map<number, Pending<Out>>());
  const nextId = useRef(1);
  const [state, setState] = useState<AiState>({ status: "idle" });

  const ensure = useCallback((): Worker => {
    if (workerRef.current) return workerRef.current;
    const worker = createRef.current();
    worker.onmessage = (event: MessageEvent<FromWorker<Out>>) => {
      const msg = event.data;
      switch (msg.type) {
        case "progress": setState({ status: "loading", progress: msg.progress }); break;
        case "ready": setState({ status: "ready", model: msg.model }); break;
        case "unavailable": setState({ status: "unavailable", reason: msg.reason }); break;
        case "result": pending.current.get(msg.id)?.resolve(msg.output); pending.current.delete(msg.id); break;
        case "error": pending.current.get(msg.id)?.reject(new Error(msg.message)); pending.current.delete(msg.id); break;
      }
    };
    worker.onerror = (event) => setState({ status: "unavailable", reason: event.message || "AI worker failed to start" });
    workerRef.current = worker;
    setState({ status: "loading", progress: 0 });
    return worker;
  }, []);

  useEffect(() => {
    const inflight = pending.current;
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
      for (const p of inflight.values()) p.reject(new Error("AI worker stopped"));
      inflight.clear();
    };
  }, []);

  const warmUp = useCallback(() => ensure().postMessage({ type: "load" } satisfies ToWorker<In>), [ensure]);
  const run = useCallback(
    (input: In, transfer: Transferable[] = []) =>
      new Promise<Out>((resolve, reject) => {
        const id = nextId.current++;
        pending.current.set(id, { resolve, reject });
        ensure().postMessage({ type: "run", id, input } satisfies ToWorker<In>, transfer);
      }),
    [ensure],
  );
  return { state, warmUp, run };
}

/** Rejects after `ms` so the UI can switch to the fallback (06: 15 s). */
export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`AI took longer than ${ms / 1000} s`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
```

```ts
// src/ai/useEmbedder.ts — e5 needs "query: " for what the person typed, "passage: " for what is searched
import { useCallback } from "react";
import type { EmbedIn, EmbedOut } from "./protocol.ts";
import { useWorker } from "./useWorker.ts";

export function useEmbedder() {
  const { state, warmUp, run } = useWorker<EmbedIn, EmbedOut>(
    // Keep this literal form: Vite detects workers by `new Worker(new URL(...), { type: "module" })`.
    () => new Worker(new URL("./embed.worker.ts", import.meta.url), { type: "module" }),
  );
  const embed = useCallback(
    async (texts: string[], kind: "query" | "passage"): Promise<Float32Array[]> => {
      const { dims, data } = await run(texts.map((t) => `${kind}: ${t}`));
      return Array.from({ length: data.length / dims }, (_, i) => data.subarray(i * dims, (i + 1) * dims));
    },
    [run],
  );
  return { state, warmUp, embed };
}
```

These files typecheck under the app tsconfig (strict, `verbatimModuleSyntax`, DOM lib, no webworker lib needed) and pass oxlint. Put the math in `src/domain/` as pure, tested functions:

```ts
// src/domain/semantic.ts — vectors are unit length, so cosine = dot product
export type Vector = ArrayLike<number>;
export const dot = (a: Vector, b: Vector) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i]! * b[i]!; return s; };

export function rank(query: Vector, docs: Vector[], topK = 5) {
  return docs.map((doc, index) => ({ index, score: dot(query, doc) })).sort((a, b) => b.score - a.score).slice(0, topK);
}

/** Unit-length mean of each label's example vectors (nearest-centroid classifier). */
export function centroids(examples: Record<string, Vector[]>): Record<string, Float32Array> {
  const out: Record<string, Float32Array> = {};
  for (const [label, vectors] of Object.entries(examples)) {
    const c = new Float32Array(vectors[0]?.length ?? 0);
    for (const v of vectors) for (let i = 0; i < c.length; i++) c[i]! += v[i]!;
    const norm = Math.hypot(...c) || 1;
    out[label] = c.map((x) => x / norm);
  }
  return out;
}

/** Best label first. `sure` is false when the top two are within `margin`: ask the person instead. */
export function classify(query: Vector, cents: Record<string, Vector>, margin = 0.02) {
  const ranked = Object.entries(cents).map(([label, c]) => ({ label, score: dot(query, c) })).sort((a, b) => b.score - a.score);
  const gap = ranked.length > 1 ? ranked[0]!.score - ranked[1]!.score : 1;
  return ranked.map((r, i) => ({ ...r, sure: i === 0 && gap >= margin }));
}
```

```ts
// src/domain/keywords.ts — the deterministic fallback
export type KeywordRule<L extends string> = { label: L; pattern: RegExp };
export function keywordSuggest<L extends string>(text: string, rules: KeywordRule<L>[]): L | null {
  const t = text.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase(); // "ñ" -> "n", accents off
  return rules.find((r) => r.pattern.test(t))?.label ?? null;
}
// e.g. { label: "noise", pattern: /\b(noise|noisy|loud|videoke|karaoke|maingay|ingay)\b/ }
// Add Waray words only from a reviewed list (the i18n review), never guessed.
```

## Per-app recipes

**20 Sumat (semantic search).** Each service passage is its title, a plain-language summary, and synonyms in English, Filipino and Waray (for example "cedula, community tax certificate, sedula"). Embed all passages once, after `ready`, in batches of about 16, and keep the vectors in memory. Embed the query on a 300 ms debounce and `rank()` it. fuse.js keyword results show instantly and stay visible. AI results merge in when ready, with the matches marked. **e5 scores bunch together (roughly 0.75–0.9)**, so don't use an absolute cut-off. Use rank, plus a margin between the first and second result, and calibrate on 15–20 real phrasings per language. Keep that list in the app's notes as a manual evaluation set. Call `warmUp()` when the search box gets focus.

**10 Reklamo (auto-categorise).** For each category, write 6–10 short example complaints in English and Filipino (plus reviewed Waray). Compute the `centroids()` once after `ready`. On blur, or on a 400 ms debounce, `classify()` the complaint text. Show the top category as "Suggested: Noise" with a control to change it. When `sure` is false, show "Not sure, please choose". The rule fallback is `keywordSuggest(text, COMPLAINT_RULES)`. Store `categorySource`.

**06 Damage Snap (photo → severity).** The brief fixes the specifics: `src/ai/classify.worker.ts`, the prompts in `src/ai/labels.ts` (English; they are model input, not UI text), `severityFromScores()`, the 15 s timeout, and `ruleSeverity()` as the fallback. Make the worker from the embed worker with these changes:

```ts
import { pipeline, type ZeroShotImageClassificationPipeline } from "@huggingface/transformers";
// MODEL_ID = "Xenova/clip-vit-base-patch32"; In = Blob; Out = { label: string; score: number }[]
const pipe = await pipeline("zero-shot-image-classification", MODEL_ID, { dtype: "q8", device: "wasm", progress_callback });
const scores = await pipe(msg.input, Object.keys(LABELS), { hypothesis_template: "{}" }); // prompts are whole sentences
```
Downscale the photo before posting it to the worker (the brief already needs ≤ 1024 px for storage). A `Blob` is structured-cloneable, and the pipeline reads it with `createImageBitmap` and `OffscreenCanvas`, both of which exist in workers. Create the worker on the first photo, not on page load. Race the result against `withTimeout(..., 15_000)`.

## Loading and fallback UI

- `idle`: show nothing extra. The keyword or rule answer works on its own.
- `loading`: "Preparing on-device AI…" with a progress bar. **In `pnpm dev` the progress stays at 0**, because the dev static server sends no `Content-Length`; `preview` has the sizes. Show an indeterminate bar while `progress === 0`.
- `ready`: "Suggested on this device" next to each suggestion, plus "Nothing is uploaded."
- `unavailable`: "Rule-based suggestion (AI model not available)". Never show an error page; the feature keeps working.
- Show confidence as words (High / Medium / Low) or the % the brief asks for, never raw cosine scores. Every string goes through `src/i18n/strings.ts`, with the Waray reviewed by a person.
- Sumat copy to adapt: "Smart search works best in English and Filipino. It may miss Waray words, so try another word or browse all services."
- On `/sources`, list the model id, its license, and "runs on this device; nothing leaves it".

## Testing

- jsdom has no `Worker`. Because the hook starts lazily, rendering is safe. Mock `useEmbedder`/`useWorker` with `vi.mock` in component tests.
- Unit-test the pure parts (`rank`, `centroids`, `classify`, `keywordSuggest`, `severityFromScores`, the fallbacks) in `src/domain/*.test.ts`.
- Check the model by hand in `pnpm dev`, following the brief's demo steps. The smoke test runs without models, so it must pass on the fallback path.

## Gotchas

- `env.allowLocalModels` defaults to **false** in browsers and workers. If you forget it, the load errors out (with `allowRemoteModels = false`) or fetches from huggingface.co.
- Forgetting `wasmPaths` makes ORT fetch its wasm from jsDelivr. That fails offline, and the smoke test flags "request left the machine".
- Never import `@huggingface/transformers` in UI code (only `import type`). It pulls more than 1 MB of JS plus ORT into the main bundle.
- Use one worker and one pipeline per app, created once. ORT Web runs one session at a time, so queue requests and debounce typing.
- After you replace model files, the old ones may still be served from Cache Storage `transformers-cache`. Clear it in DevTools (Application tab), or set `env.useBrowserCache = false` while iterating.
- Use quantized models only (`q8`). `fp32` is about 4× larger, and `q4` loses too much accuracy for CLIP.
- A `/models/` 404 is a console error in Chromium. Don't probe for model files on page load; let the lazy start find out.
