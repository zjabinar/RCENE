#!/usr/bin/env node
/**
 * Fetches the in-browser AI models for several apps from the repo root,
 * downloading each model only once. Each app owns its models/ folder and its
 * own scripts/fetch-models.mjs (`npm run fetch-models -- --model e5` inside the
 * app); this wrapper drives those scripts.
 *
 *   node scripts/fetch-models.mjs --all                    # every AI app (06 clip, 10 e5, 20 e5)
 *   node scripts/fetch-models.mjs --app 10 --app 20        # e5 once, copied into both
 *   node scripts/fetch-models.mjs --app 06 --model all     # override the model
 *   node scripts/fetch-models.mjs --all --dry-run
 *
 * Steps:
 *   1. fill the shared cache once per model: the first app that needs the model
 *      runs its fetch-models normally (models/ already present or in the cache are
 *      skipped; a download is also saved into the cache);
 *   2. every app runs its fetch-models with --from <cache>, so it copies instead of
 *      downloading, and copies ONNX Runtime Web from its own node_modules (run
 *      npm ci / pnpm install in the app first, or pass --skip-ort).
 * The cache is RCENE_MODELS_CACHE or ~/.cache/rcene-models (the app scripts use
 * the same default). Defensive: the app script's --help is read first; if it has
 * no --from option every app downloads on its own, and if it has no --model
 * option the app's id is passed as --app (the old interface).
 *
 * Default model per app: 06 clip, 10 e5, 20 e5 (their briefs); other apps need --model.
 * Options passed through: --dry-run, --force, --skip-ort, --skip-models, --no-cache.
 * Option: --root <repo>. Exit code 1 when any app failed.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { ROOT, appDir, appRows, cli, isMain, readManifest, rel, resolveTargets, seconds } from "./lib/apps.mjs";

export const DEFAULT_MODEL = { "06": "clip", "10": "e5", "20": "e5" };
const MODEL_CHOICES = ["e5", "clip", "all"];

const USAGE = `Usage: node scripts/fetch-models.mjs (--app <slug|id>... | --all) [--model e5|clip|all] [--dry-run] [--force] [--skip-ort] [--skip-models] [--no-cache] [--root <repo>]

  --app <x>     app (repeatable; slug or id). --all = every app with "ai": true in the manifest
  --model <m>   model for every chosen app; default per app: ${Object.entries(DEFAULT_MODEL).map(([k, v]) => `${k} ${v}`).join(", ")}
  other flags   passed to each app's scripts/fetch-models.mjs`;

export const cacheDir = () => process.env.RCENE_MODELS_CACHE || path.join(os.homedir(), ".cache", "rcene-models");

/** Which options an app's fetch-models.mjs understands, from its --help text. */
export function scriptFeatures(helpText) {
  return { from: /--from\b/.test(helpText), model: /--model\b/.test(helpText), noCache: /--no-cache\b/.test(helpText) };
}

function runScript(script, dir, args, env) {
  const t = Date.now();
  console.log(`\n> node scripts/fetch-models.mjs ${args.join(" ")}   (in ${dir})`);
  const r = spawnSync(process.execPath, [script, ...args], { cwd: dir, stdio: "inherit", env, windowsHide: true });
  return { ok: r.status === 0, ms: Date.now() - t };
}

function main() {
  const { values, positionals } = cli(
    process.argv.slice(2),
    {
      app: { type: "string", multiple: true },
      all: { type: "boolean" },
      model: { type: "string" },
      "dry-run": { type: "boolean" },
      force: { type: "boolean" },
      "skip-ort": { type: "boolean" },
      "skip-models": { type: "boolean" },
      "no-cache": { type: "boolean" },
      root: { type: "string" },
    },
    USAGE,
  );
  const root = path.resolve(values.root ?? ROOT);
  const keys = [...(values.app ?? []).flatMap((a) => a.split(",")), ...positionals].map((k) => k.trim()).filter(Boolean);
  if (keys.includes("all")) values.all = true;
  if (!values.all && keys.length === 0) {
    console.error(USAGE);
    process.exit(2);
  }
  if (values.model && !values.model.split(",").every((m) => MODEL_CHOICES.includes(m.trim()))) {
    console.error(`--model must be ${MODEL_CHOICES.join(", ")} (or a comma list)`);
    process.exit(2);
  }
  let targets;
  try {
    const manifest = readManifest(root);
    const aiSlugs = new Set(appRows(manifest).filter((r) => r.ai).map((r) => r.slug));
    targets = resolveTargets(root, keys.filter((k) => k !== "all"));
    if (values.all) for (const r of appRows(manifest)) if (aiSlugs.has(r.slug) && !targets.some((t) => t.slug === r.slug)) targets.push(r);
  } catch (err) {
    console.error(err.message);
    process.exit(2);
  }

  const cache = cacheDir();
  const env = { ...process.env, RCENE_MODELS_CACHE: cache };
  const pass = ["dry-run", "force", "skip-ort", "skip-models", "no-cache"].filter((f) => values[f]).map((f) => `--${f}`);
  const plans = [];
  const results = [];
  for (const row of targets) {
    const dir = appDir(root, row);
    const script = path.join(dir, "scripts", "fetch-models.mjs");
    const model = values.model ?? DEFAULT_MODEL[row.id];
    if (!existsSync(script)) {
      results.push({ slug: row.slug, ok: false, ms: 0, note: `no ${rel(root, script)}` });
      continue;
    }
    if (!model && !values["skip-models"]) {
      results.push({ slug: row.slug, ok: false, ms: 0, note: "no default model for this app: pass --model e5|clip|all" });
      continue;
    }
    const help = spawnSync(process.execPath, [script, "--help"], { cwd: dir, encoding: "utf8", env, windowsHide: true });
    plans.push({ row, dir, script, model: model ?? "e5", features: scriptFeatures(`${help.stdout}${help.stderr}`) });
  }

  const modelArgs = (p) => (p.features.model ? ["--model", p.model] : ["--app", p.row.id]);
  const useCache = !values["no-cache"] && !values["dry-run"];
  console.log(`Models for ${plans.map((p) => `${p.row.slug} (${p.model})`).join(", ") || "no app"}; shared cache ${cache}`);

  // 1. One normal run per distinct model fills the cache (downloads at most once).
  const primed = new Map();
  if (useCache && !values["skip-models"]) {
    mkdirSync(cache, { recursive: true });
    for (const p of plans) {
      if (!p.features.from) continue;
      for (const m of p.model === "all" ? ["e5", "clip"] : p.model.split(",")) {
        if (primed.has(m)) continue;
        const args = p.features.model ? ["--model", m, "--skip-ort", ...pass.filter((f) => f !== "--skip-ort")] : ["--app", p.row.id, "--skip-ort"];
        console.log(`\n=== cache ${m} via ${p.row.slug}`);
        primed.set(m, runScript(p.script, p.dir, args, env).ok);
      }
    }
  }

  // 2. Every app copies from the cache (or fetches on its own when its script has no --from).
  for (const p of plans) {
    const models = p.model === "all" ? ["e5", "clip"] : p.model.split(",");
    if (models.some((m) => primed.get(m) === false)) {
      results.push({ slug: p.row.slug, ok: false, ms: 0, note: "filling the cache failed (see above)" });
      continue;
    }
    const from = useCache && p.features.from && !values["skip-models"] ? ["--from", cache] : [];
    console.log(`\n=== ${p.row.slug}`);
    const r = runScript(p.script, p.dir, [...modelArgs(p), ...from, ...pass], env);
    results.push({ slug: p.row.slug, ok: r.ok, ms: r.ms, note: r.ok ? "" : "failed (see above)" });
  }

  console.log("\n================ fetch-models ================");
  for (const r of results) console.log(`${r.ok ? "ok  " : "FAIL"}  ${r.slug.padEnd(16)} ${seconds(r.ms).padStart(8)}  ${r.note}`);
  const failed = results.filter((r) => !r.ok).length;
  if (failed || results.length === 0) process.exitCode = 1;
}

if (isMain(import.meta.url)) main();
