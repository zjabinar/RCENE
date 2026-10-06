#!/usr/bin/env node
/**
 * Fetches the in-browser AI models into this app's models/ folder (gitignored), once,
 * while online. With "ai": true in project.json, Vite serves models/ at /models/, so
 * Transformers.js loads everything locally and the demo needs no network and no API key.
 *
 *   models/<repo>/<file>   e.g. models/Xenova/multilingual-e5-small/onnx/model_quantized.onnx
 *   models/ort/            ONNX Runtime Web .wasm + .mjs, copied from this app's node_modules
 *
 * Usage:
 *   npm run fetch-models -- --model e5          text search / classification (~135 MB)
 *   npm run fetch-models -- --model clip        image classification (~155 MB)
 *   npm run fetch-models -- --model all --dry-run
 *   node scripts/fetch-models.mjs --model e5 --from ../10-reklamo/models   copy, don't download
 *   node scripts/fetch-models.mjs --model e5 --from cache                  the shared cache
 * Options: --force (fetch again), --skip-ort, --skip-models, --no-cache
 *
 * Where each file comes from, in order: already in models/ with the right size (skipped);
 * the --from folder; the shared cache (~/.cache/rcene-models, or RCENE_MODELS_CACHE);
 * Hugging Face. Downloads go to <file>.part, are renamed when complete and are also
 * copied into the shared cache (unless --no-cache), so the next app copies instead of
 * downloading. With --from, a file missing there is an error (offline machines).
 * When the Hugging Face API is reachable, the file list is checked against the repo
 * first and sizes are verified. HF_TOKEN for gated repos (none of these are),
 * HF_ENDPOINT for a mirror (e.g. https://hf-mirror.com). Behind a proxy, run with
 * NODE_USE_ENV_PROXY=1 so Node's fetch uses HTTPS_PROXY.
 * Re-run after upgrading @huggingface/transformers: the ORT files must match its version.
 */
import { copyFileSync, createWriteStream, existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, renameSync, rmSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const APP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MODELS_DIR = path.join(APP_ROOT, "models");
const CACHE_DIR = process.env.RCENE_MODELS_CACHE || path.join(os.homedir(), ".cache", "rcene-models");
/** HF_ENDPOINT selects a mirror (same variable as huggingface_hub). */
const HF = (process.env.HF_ENDPOINT || "https://huggingface.co").replace(/\/+$/, "");

/**
 * The models. `files` are what Transformers.js v4 requests for the pipeline with dtype
 * "q8" on the wasm device: config, tokenizer, (image processor), onnx/<model>_quantized.onnx.
 */
export const MODELS = {
  e5: {
    repo: "Xenova/multilingual-e5-small",
    use: "feature-extraction: sentence embeddings for semantic search and nearest-centroid text classification",
    files: ["config.json", "tokenizer.json", "tokenizer_config.json", "onnx/model_quantized.onnx"],
    approxMB: 135,
  },
  clip: {
    repo: "Xenova/clip-vit-base-patch32",
    use: "zero-shot-image-classification: photo labels such as damage severity",
    files: ["config.json", "tokenizer.json", "tokenizer_config.json", "preprocessor_config.json", "onnx/model_quantized.onnx"],
    approxMB: 155,
  },
};

/** ONNX Runtime Web files Transformers.js 4.x loads in browsers (its default wasmPaths, served locally). */
export const ORT_FILES = ["ort-wasm-simd-threaded.asyncify.mjs", "ort-wasm-simd-threaded.asyncify.wasm"];

const USAGE = `Usage: node scripts/fetch-models.mjs --model e5|clip|all [--dry-run] [--from <dir>|cache] [--force] [--skip-ort] [--skip-models] [--no-cache]

  --model <m>    e5   = ${MODELS.e5.repo} (~${MODELS.e5.approxMB} MB): text search and classification
                 clip = ${MODELS.clip.repo} (~${MODELS.clip.approxMB} MB): image classification
                 all  = both; a comma list (e5,clip) works too
  --dry-run      print the plan (what is present, copied or downloaded); write nothing
  --from <dir>   copy from another models folder (e.g. ../10-reklamo/models) instead of downloading;
                 "cache" means the shared cache ${CACHE_DIR}
  --force        fetch files again even when present
  --skip-ort     do not copy the ONNX Runtime Web files into models/ort/
  --skip-models  only copy the ONNX Runtime Web files
  --no-cache     neither read nor fill the shared cache`;

const fmt = (bytes) =>
  bytes == null ? "?" : bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${(bytes / 1024).toFixed(1)} KB`;
const rel = (p) => {
  const r = path.relative(APP_ROOT, p);
  return (r.startsWith("..") || path.isAbsolute(r) ? p : r).split(path.sep).join("/");
};
const sizeOf = (p) => {
  try {
    return statSync(p).isFile() ? statSync(p).size : null;
  } catch {
    return null;
  }
};
const fileIn = (dir, repo, file) => path.join(dir, ...repo.split("/"), ...file.split("/"));

export function parseModels(value) {
  if (!value) throw new Error("Choose the model with --model e5, --model clip or --model all");
  const keys = value === "all" ? Object.keys(MODELS) : value.split(",").map((v) => v.trim().toLowerCase());
  const bad = keys.filter((k) => !MODELS[k]);
  if (bad.length) throw new Error(`--model must be ${Object.keys(MODELS).join(", ")} or all (got ${value})`);
  return [...new Set(keys)].map((k) => ({ key: k, ...MODELS[k] }));
}

/** Directory of an installed package, found the way Node would from `fromDir` (npm and pnpm layouts). */
function packageDir(name, fromDir) {
  const require = createRequire(path.join(fromDir, "package.json"));
  for (const dir of require.resolve.paths(name) ?? []) {
    const candidate = path.join(dir, ...name.split("/"));
    // Real path: under pnpm a package sees its own dependencies only beside its real location.
    if (existsSync(path.join(candidate, "package.json"))) return realpathSync(candidate);
  }
  return null;
}

/** This app's @huggingface/transformers and the onnxruntime-web build it depends on. */
export function locateOrt(appRoot = APP_ROOT) {
  const transformersDir = packageDir("@huggingface/transformers", appRoot);
  if (!transformersDir) throw new Error("@huggingface/transformers is not installed here (run npm ci, or pnpm install in a monorepo)");
  const transformers = JSON.parse(readFileSync(path.join(transformersDir, "package.json"), "utf8"));
  const require = createRequire(path.join(transformersDir, "package.json"));
  const files = ORT_FILES.map((name) => ({ name, src: require.resolve(`onnxruntime-web/${name}`) }));
  const ortDir = packageDir("onnxruntime-web", transformersDir);
  const ortVersion = ortDir ? JSON.parse(readFileSync(path.join(ortDir, "package.json"), "utf8")).version : "?";
  return { transformersVersion: transformers.version, ortVersion, wanted: transformers.dependencies?.["onnxruntime-web"], files };
}

/** File sizes in the repo according to the Hugging Face API, or null when unreachable. */
async function remoteSizes(repo, headers) {
  const sizes = new Map();
  for (const sub of ["", "/onnx"]) {
    try {
      const res = await fetch(`${HF}/api/models/${repo}/tree/main${sub}`, { headers, signal: AbortSignal.timeout(20_000) });
      if (!res.ok) return { sizes: null, reason: `HTTP ${res.status}` };
      for (const entry of await res.json()) {
        if (entry.type === "file") sizes.set(entry.path, entry.lfs?.size ?? entry.size);
      }
    } catch (e) {
      return { sizes: null, reason: e.cause?.code ?? e.message };
    }
  }
  return { sizes, reason: null };
}

async function download(url, dest, expected, headers) {
  const part = `${dest}.part`;
  const res = await fetch(url, { headers, redirect: "follow" });
  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status} for ${url}`);
  mkdirSync(path.dirname(dest), { recursive: true });
  const total = Number(res.headers.get("content-length")) || expected || 0;
  let done = 0;
  let nextReport = 0.1;
  const counter = new Transform({
    transform(chunk, _enc, cb) {
      done += chunk.length;
      if (total > 5 * 1024 * 1024 && done / total >= nextReport) {
        process.stdout.write(`      ${Math.round((done / total) * 100)}% of ${fmt(total)}\n`);
        nextReport += 0.1;
      }
      cb(null, chunk);
    },
  });
  try {
    await pipeline(Readable.fromWeb(res.body), counter, createWriteStream(part));
  } catch (e) {
    rmSync(part, { force: true });
    throw e;
  }
  const got = statSync(part).size;
  if (expected && got !== expected) {
    rmSync(part, { force: true });
    throw new Error(`size mismatch for ${url}: got ${got}, expected ${expected}`);
  }
  renameSync(part, dest);
  return got;
}

/** Copies via <dest>.part so an interrupted copy never looks complete. */
function copyFile(src, dest) {
  mkdirSync(path.dirname(dest), { recursive: true });
  const part = `${dest}.part`;
  copyFileSync(src, part);
  renameSync(part, dest);
  return statSync(dest).size;
}

/** Best effort: keep a copy in the shared cache so the next app need not download. */
function saveToCache(dest, repo, file, enabled) {
  if (!enabled) return;
  const cached = fileIn(CACHE_DIR, repo, file);
  try {
    if (sizeOf(cached) === sizeOf(dest)) return;
    copyFile(dest, cached);
  } catch (e) {
    console.log(`      (could not fill the shared cache: ${e.code ?? e.message})`);
  }
}

/** Extra weight files named by config.json's transformers.js_config.use_external_data_format. */
function externalDataFiles(configFile, files) {
  try {
    const config = JSON.parse(readFileSync(configFile, "utf8"));
    const ext = config["transformers.js_config"]?.use_external_data_format;
    if (!ext) return [];
    const extra = [];
    for (const f of files.filter((name) => name.endsWith(".onnx"))) {
      const n = typeof ext === "object" ? Number(ext[path.basename(f)] ?? ext[path.basename(f, ".onnx").replace(/_quantized$/, "")] ?? 0) : Number(ext);
      for (let k = 0; k < n; k++) extra.push(`${f}_data${k === 0 ? "" : `_${k}`}`);
    }
    return extra;
  } catch {
    return [];
  }
}

function folderSize(dir) {
  let total = 0;
  const walk = (d) => {
    let entries = [];
    try {
      entries = readdirSync(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (e.isDirectory()) walk(path.join(d, e.name));
      else if (e.isFile()) total += statSync(path.join(d, e.name)).size;
    }
  };
  walk(dir);
  return total;
}

async function fetchModel(model, opts) {
  const { dry, force, from, useCache, headers } = opts;
  let failures = 0;
  console.log(`${model.repo}  ~${model.approxMB} MB  (--model ${model.key}: ${model.use})`);

  // The remote file list is only needed when something has to be downloaded.
  let sizes = null;
  let remoteChecked = false;
  const remote = async () => {
    if (remoteChecked) return sizes;
    remoteChecked = true;
    const r = await remoteSizes(model.repo, headers);
    sizes = r.sizes;
    if (!sizes) console.log(`    (Hugging Face API not reachable: ${r.reason}; downloading without a file-list check)`);
    return sizes;
  };

  const files = [...model.files];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const label = file.padEnd(32);
    const dest = fileIn(MODELS_DIR, model.repo, file);
    const have = sizeOf(dest);
    const fromFile = from ? fileIn(from, model.repo, file) : null;
    const cacheFile = useCache ? fileIn(CACHE_DIR, model.repo, file) : null;
    const source = fromFile ? (sizeOf(fromFile) !== null ? fromFile : null) : cacheFile && sizeOf(cacheFile) !== null ? cacheFile : null;
    const url = `${HF}/${model.repo}/resolve/main/${file}`;
    const present = have !== null && have > 0 && (source ? have === sizeOf(source) : true);

    if (dry) {
      if (present && !force) console.log(`    ${label} present   ${fmt(have)}`);
      else if (source) console.log(`    ${label} copy      ${fmt(sizeOf(source))}  from ${source}`);
      else if (from) console.log(`    ${label} MISSING   not in ${from}`);
      else console.log(`    ${label} download  ${url}`);
    } else if (present && !force) {
      console.log(`    ${label} present   ${fmt(have)}`);
    } else if (source) {
      console.log(`    ${label} copied    ${fmt(copyFile(source, dest))}  from ${source}`);
    } else if (from) {
      console.log(`    ${label} MISSING   not in ${from}`);
      failures++;
      continue;
    } else {
      const known = await remote();
      if (known && !known.has(file)) {
        const onnx = [...known.keys()].filter((k) => k.startsWith("onnx/")).join(", ");
        console.log(`    ${label} ERROR     not in the repo. Available onnx files: ${onnx || "none"}`);
        failures++;
        continue;
      }
      const expected = known?.get(file);
      try {
        console.log(`    ${label} downloading${expected ? ` ${fmt(expected)}` : ""}`);
        console.log(`    ${label} done      ${fmt(await download(url, dest, expected, headers))}`);
        saveToCache(dest, model.repo, file, useCache);
      } catch (e) {
        console.log(`    ${label} FAILED    ${e.cause?.code ?? e.message}`);
        failures++;
        continue;
      }
    }
    // Large models can keep their weights in external data files; config.json says so.
    if (file === "config.json") {
      const configFile = existsSync(dest) ? dest : source;
      if (configFile) for (const extra of externalDataFiles(configFile, model.files)) if (!files.includes(extra)) files.push(extra);
    }
  }
  console.log("");
  return failures;
}

function copyOrt({ dry, force }) {
  let ort;
  try {
    ort = locateOrt();
  } catch (e) {
    console.log(`ONNX Runtime Web: ${e.message}`);
    return 1;
  }
  const mismatch = ort.wanted && ort.wanted !== ort.ortVersion ? `  (transformers wants ${ort.wanted}!)` : "";
  console.log(`ONNX Runtime Web ${ort.ortVersion} (used by @huggingface/transformers ${ort.transformersVersion})${mismatch}`);
  const ortDir = path.join(MODELS_DIR, "ort");
  for (const { name, src } of ort.files) {
    const dest = path.join(ortDir, name);
    const size = statSync(src).size;
    const same = sizeOf(dest) === size;
    const label = `    ${name.padEnd(40)} ${fmt(size).padStart(9)}`;
    if (dry) console.log(`${label}  ${same && !force ? "present" : "copy"} -> ${rel(dest)}`);
    else if (same && !force) console.log(`${label}  present`);
    else {
      copyFile(src, dest);
      console.log(`${label}  copied`);
    }
  }
  console.log("");
  return 0;
}

async function main() {
  let values;
  let models = [];
  try {
    ({ values } = parseArgs({
      options: {
        model: { type: "string" },
        from: { type: "string" },
        "dry-run": { type: "boolean", default: false },
        force: { type: "boolean", default: false },
        "skip-ort": { type: "boolean", default: false },
        "skip-models": { type: "boolean", default: false },
        "no-cache": { type: "boolean", default: false },
        help: { type: "boolean", short: "h", default: false },
      },
    }));
    if (values.help) {
      console.log(USAGE);
      return 0;
    }
    if (!values["skip-models"]) models = parseModels(values.model);
  } catch (e) {
    console.error(`${e.message}\n\n${USAGE}`);
    return 2;
  }

  const dry = values["dry-run"];
  const useCache = !values["no-cache"];
  let from = null;
  if (values.from) {
    from = values.from === "cache" ? CACHE_DIR : path.resolve(process.cwd(), values.from);
    if (!existsSync(from)) {
      console.error(`--from: ${from} does not exist`);
      return 2;
    }
    if (path.resolve(from) === path.resolve(MODELS_DIR)) {
      console.error("--from points at this app's own models/ folder");
      return 2;
    }
  }
  const headers = process.env.HF_TOKEN ? { Authorization: `Bearer ${process.env.HF_TOKEN}` } : {};
  let project = {};
  try {
    project = JSON.parse(readFileSync(path.join(APP_ROOT, "project.json"), "utf8"));
  } catch {
    // project.json is optional here
  }

  const what = models.length ? models.map((m) => m.key).join(", ") : "no models";
  console.log(`${dry ? "Plan (dry run, nothing is written)" : "Fetching"}: ${what}${values["skip-ort"] ? "" : " + ONNX Runtime Web"} into ${rel(MODELS_DIR)}/`);
  console.log(`Sources: ${from ? `--from ${from}` : `${useCache ? `shared cache ${CACHE_DIR}, then ` : ""}${HF}`}\n`);

  let failures = 0;
  for (const model of models) failures += await fetchModel(model, { dry, force: values.force, from, useCache, headers });
  if (!values["skip-ort"]) failures += copyOrt({ dry, force: values.force });

  if (!dry) console.log(`${rel(MODELS_DIR)}/ now holds ${fmt(folderSize(MODELS_DIR))}.`);
  if (project.ai !== true) {
    console.log(`\nNote: project.json has "ai": ${JSON.stringify(project.ai ?? false)}, so Vite does not serve models/ at /models/ yet. Set "ai": true to use them.`);
  }
  if (failures) {
    console.log(
      `\n${failures} problem(s). If huggingface.co is unreachable here, run this where it is reachable (or set HF_ENDPOINT to a mirror) and copy the models/ folder across, or use --from.`,
    );
    return 1;
  }
  return 0;
}

main().then(
  (code) => {
    process.exitCode = code;
  },
  (e) => {
    console.error(e);
    process.exitCode = 1;
  },
);
