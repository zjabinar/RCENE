#!/usr/bin/env node
/**
 * Fetches the in-browser AI models for the ★AI apps into assets/models/ (gitignored),
 * once, while online. Apps with `ai: true` in docs/projects/projects.json serve this
 * folder at /models/ (see packages/config/src/vite.ts), so Transformers.js loads
 * everything locally and the demo needs no network and no API key.
 *
 *   assets/models/<repo>/<file>   e.g. assets/models/Xenova/multilingual-e5-small/onnx/model_quantized.onnx
 *   assets/models/ort/            ONNX Runtime Web .wasm + .mjs, copied from node_modules
 *
 * Usage:
 *   node scripts/fetch-models.mjs --app all          # 06, 10 and 20
 *   node scripts/fetch-models.mjs --app 20           # one app (10 and 20 share one model)
 *   node scripts/fetch-models.mjs --app all --dry-run
 * Options: --force (re-download), --skip-ort, --skip-models
 *
 * Idempotent: files already present with the expected size are skipped. Downloads go
 * to <file>.part and are renamed when complete. When the Hugging Face API is
 * reachable, the file list is checked against the repo first and sizes are verified.
 * Set HF_TOKEN for gated repos (none of the defaults are) and HF_ENDPOINT for a mirror.
 * Behind a proxy, run with NODE_USE_ENV_PROXY=1 so Node's fetch uses HTTPS_PROXY.
 */
import { createWriteStream, existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, renameSync, rmSync, statSync, copyFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const modelsDir = path.join(root, "assets", "models");
/** HF_ENDPOINT selects a mirror (same variable as huggingface_hub), e.g. https://hf-mirror.com */
const HF = (process.env.HF_ENDPOINT || "https://huggingface.co").replace(/\/+$/, "");

/**
 * The models the ★AI apps use. `files` are what Transformers.js v4 requests for the
 * pipeline with dtype "q8" on the wasm device: config, tokenizer, (image processor),
 * and onnx/<model>_quantized.onnx.
 */
export const MODELS = [
  {
    repo: "Xenova/multilingual-e5-small",
    apps: ["10", "20"],
    use: "feature-extraction (sentence embeddings: 20 Sumat search, 10 Reklamo nearest-centroid categories)",
    files: ["config.json", "tokenizer.json", "tokenizer_config.json", "onnx/model_quantized.onnx"],
    approxMB: 135,
  },
  {
    repo: "Xenova/clip-vit-base-patch32",
    apps: ["06"],
    use: "zero-shot-image-classification (06 Damage Snap severity suggestion)",
    files: ["config.json", "tokenizer.json", "tokenizer_config.json", "preprocessor_config.json", "onnx/model_quantized.onnx"],
    approxMB: 155,
  },
];

/** ONNX Runtime Web files Transformers.js 4.x loads in browsers (its default wasmPaths, served locally). */
export const ORT_FILES = ["ort-wasm-simd-threaded.asyncify.mjs", "ort-wasm-simd-threaded.asyncify.wasm"];

const APPS = ["06", "10", "20"];

const fmt = (bytes) =>
  bytes == null ? "?" : bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${(bytes / 1024).toFixed(1)} KB`;
const rel = (p) => path.relative(root, p).split(path.sep).join("/");
const sizeOf = (p) => (existsSync(p) ? statSync(p).size : null);
const destOf = (repo, file) => path.join(modelsDir, ...repo.split("/"), ...file.split("/"));

function parseApps(value) {
  if (value === "all") return APPS;
  const apps = value.split(",").map((v) => v.trim().slice(0, 2).padStart(2, "0"));
  const bad = apps.filter((a) => !APPS.includes(a));
  if (bad.length) throw new Error(`--app must be ${APPS.join(", ")} or all (got ${value})`);
  return apps;
}

/** Locates @huggingface/transformers (a dependency of the AI apps) and the onnxruntime-web it uses. */
export function locateOrt() {
  const manifest = JSON.parse(readFileSync(path.join(root, "docs/projects/projects.json"), "utf8"));
  const candidates = manifest.projects
    .filter((p) => p.ai)
    .map((p) => path.join(root, "apps", p.slug, "node_modules/@huggingface/transformers/package.json"));
  const pnpmDir = path.join(root, "node_modules/.pnpm");
  if (existsSync(pnpmDir)) {
    for (const d of readdirSync(pnpmDir).filter((d) => d.startsWith("@huggingface+transformers@")).sort().reverse()) {
      candidates.push(path.join(pnpmDir, d, "node_modules/@huggingface/transformers/package.json"));
    }
  }
  const pkgJson = candidates.find((c) => existsSync(c));
  if (!pkgJson) throw new Error("@huggingface/transformers is not installed (run pnpm install)");
  const transformersDir = path.dirname(realpathSync(pkgJson));
  const transformers = JSON.parse(readFileSync(path.join(transformersDir, "package.json"), "utf8"));
  const require = createRequire(path.join(transformersDir, "package.json"));
  const files = ORT_FILES.map((name) => ({ name, src: require.resolve(`onnxruntime-web/${name}`) }));
  const ortPkg = JSON.parse(readFileSync(path.join(path.dirname(files[0].src), "..", "package.json"), "utf8"));
  return { transformersVersion: transformers.version, ortVersion: ortPkg.version, wanted: transformers.dependencies?.["onnxruntime-web"], files };
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
  mkdirSync(path.dirname(dest), { recursive: true });
  const part = `${dest}.part`;
  const res = await fetch(url, { headers, redirect: "follow" });
  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status} for ${url}`);
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

async function main() {
  const { values } = parseArgs({
    options: {
      app: { type: "string", default: "all" },
      "dry-run": { type: "boolean", default: false },
      force: { type: "boolean", default: false },
      "skip-ort": { type: "boolean", default: false },
      "skip-models": { type: "boolean", default: false },
      help: { type: "boolean", short: "h", default: false },
    },
  });
  if (values.help) {
    console.log("Usage: node scripts/fetch-models.mjs --app 06|10|20|all [--dry-run] [--force] [--skip-ort] [--skip-models]");
    return;
  }
  const apps = parseApps(values.app);
  const dry = values["dry-run"];
  const headers = process.env.HF_TOKEN ? { Authorization: `Bearer ${process.env.HF_TOKEN}` } : {};
  const models = values["skip-models"] ? [] : MODELS.filter((m) => m.apps.some((a) => apps.includes(a)));
  let failures = 0;

  console.log(`${dry ? "Plan (dry run, nothing is written)" : "Fetching"} for app(s) ${apps.join(", ")} into ${rel(modelsDir)}/\n`);

  for (const model of models) {
    console.log(`${model.repo}  ~${model.approxMB} MB  (apps ${model.apps.join(", ")}: ${model.use})`);
    let sizes = null;
    if (!dry) {
      const remote = await remoteSizes(model.repo, headers);
      sizes = remote.sizes;
      if (!sizes) console.log(`    (Hugging Face API not reachable: ${remote.reason}; downloading without a file-list check)`);
      const missing = sizes ? model.files.filter((f) => !sizes.has(f)) : [];
      if (missing.length) {
        const onnx = [...sizes.keys()].filter((k) => k.startsWith("onnx/")).join(", ");
        console.log(`    ERROR not in the repo: ${missing.join(", ")}. Available onnx files: ${onnx || "none"}`);
        failures++;
        continue;
      }
    }

    const files = [...model.files];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const dest = destOf(model.repo, file);
      const url = `${HF}/${model.repo}/resolve/main/${file}`;
      const expected = sizes?.get(file);
      const have = sizeOf(dest);
      const present = have !== null && (expected ? have === expected : have > 0);
      if (dry) {
        console.log(`    ${file.padEnd(32)} ${present ? `present ${fmt(have)}` : "to download"}  ${url}`);
        continue;
      }
      if (present && !values.force) {
        console.log(`    ${file.padEnd(32)} present  ${fmt(have)}`);
      } else {
        try {
          console.log(`    ${file.padEnd(32)} downloading${expected ? ` ${fmt(expected)}` : ""}`);
          const got = await download(url, dest, expected, headers);
          console.log(`    ${file.padEnd(32)} done     ${fmt(got)}`);
        } catch (e) {
          console.log(`    ${file.padEnd(32)} FAILED   ${e.cause?.code ?? e.message}`);
          failures++;
          continue;
        }
      }
      // Large models can keep their weights in external data files; config.json says so.
      if (file === "config.json") {
        const config = JSON.parse(readFileSync(dest, "utf8"));
        const ext = config["transformers.js_config"]?.use_external_data_format;
        if (ext) {
          for (const f of model.files.filter((f) => f.endsWith(".onnx"))) {
            const n = typeof ext === "object" ? Number(ext[path.basename(f)] ?? ext[path.basename(f, ".onnx").replace(/_quantized$/, "")] ?? 0) : Number(ext);
            for (let k = 0; k < n; k++) files.push(`${f}_data${k === 0 ? "" : `_${k}`}`);
          }
        }
      }
    }
    console.log("");
  }

  if (!values["skip-ort"]) {
    let ort;
    try {
      ort = locateOrt();
    } catch (e) {
      console.log(`ONNX Runtime Web: ${e.message}`);
      failures++;
    }
    if (ort) {
      const mismatch = ort.wanted && ort.wanted !== ort.ortVersion ? `  (transformers wants ${ort.wanted}!)` : "";
      console.log(`ONNX Runtime Web ${ort.ortVersion} (used by @huggingface/transformers ${ort.transformersVersion})${mismatch}`);
      const ortDir = path.join(modelsDir, "ort");
      for (const { name, src } of ort.files) {
        const dest = path.join(ortDir, name);
        const size = statSync(src).size;
        const same = sizeOf(dest) === size;
        if (dry) {
          console.log(`    ${name.padEnd(40)} ${fmt(size).padStart(9)}  ${same ? "present" : "copy"} -> ${rel(dest)}`);
        } else if (same && !values.force) {
          console.log(`    ${name.padEnd(40)} ${fmt(size).padStart(9)}  present`);
        } else {
          mkdirSync(ortDir, { recursive: true });
          copyFileSync(src, dest);
          console.log(`    ${name.padEnd(40)} ${fmt(size).padStart(9)}  copied`);
        }
      }
      console.log("");
    }
  }

  if (!dry) {
    let total = 0;
    const walk = (d) => {
      if (!existsSync(d)) return;
      for (const e of readdirSync(d, { withFileTypes: true })) {
        if (e.isDirectory()) walk(path.join(d, e.name));
        else total += statSync(path.join(d, e.name)).size;
      }
    };
    walk(modelsDir);
    console.log(`${rel(modelsDir)}/ now holds ${fmt(total)}.`);
  }
  if (failures) {
    console.log(`\n${failures} problem(s). If huggingface.co is unreachable here, run this on a machine that is online and copy assets/models/ across (it is gitignored).`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
