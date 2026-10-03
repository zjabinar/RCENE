#!/usr/bin/env node
/**
 * Mirrors the canonical data into every app: root data/files, data/fixtures and
 * data/README.md -> apps/<slug>/data/ (and apps/_template/data/). New and
 * changed files are copied, files the root no longer has are deleted. Data is
 * not app-owned, so started apps are included.
 *
 *   node scripts/sync-data.mjs              # template + every app folder that exists (same as --all)
 *   node scripts/sync-data.mjs 01-ligtas 03 # some apps
 *   node scripts/sync-data.mjs --all --dry-run
 *
 * The 00-data session writes root data/files; the orchestrator runs this after
 * merging it, then commits the app copies. Options: --dry-run, --root <repo>.
 */
import { existsSync } from "node:fs";
import path from "node:path";
import { ROOT, appDir, cli, isMain, resolveTargets } from "./lib/apps.mjs";
import { dataSourceFiles, mirrorData } from "./lib/data.mjs";

const USAGE = "Usage: node scripts/sync-data.mjs [--all | <slug|id|template>...] [--dry-run] [--root <repo>]";

function main() {
  const { values, positionals } = cli(
    process.argv.slice(2),
    { all: { type: "boolean" }, "dry-run": { type: "boolean" }, root: { type: "string" } },
    USAGE,
  );
  const root = path.resolve(values.root ?? ROOT);
  let targets;
  try {
    targets = resolveTargets(root, positionals, { all: values.all || positionals.length === 0, withTemplate: true });
  } catch (err) {
    console.error(err.message);
    process.exit(2);
  }
  const files = dataSourceFiles(root);
  const real = files.filter((f) => f.startsWith("files/") && !f.endsWith(".gitkeep")).length;
  const fixtures = files.filter((f) => f.startsWith("fixtures/")).length;
  console.log(`Root data: ${real} real file(s) in data/files, ${fixtures} fixture file(s)${values["dry-run"] ? " (dry run)" : ""}\n`);
  let changed = 0;
  let missing = 0;
  for (const row of targets) {
    const dir = appDir(root, row);
    if (!existsSync(dir)) {
      missing++;
      if (!values.all && positionals.length) console.log(`${row.slug.padEnd(16)} no folder (node scripts/new-app.mjs ${row.slug})`);
      continue;
    }
    const r = mirrorData(root, dir, { dryRun: values["dry-run"] });
    if (r.copied.length || r.deleted.length) changed++;
    const verb = values["dry-run"] ? "would copy" : "copied";
    console.log(`${row.slug.padEnd(16)} ${verb} ${r.copied.length}, deleted ${r.deleted.length}, unchanged ${r.unchanged}`);
    if (r.copied.length + r.deleted.length <= 20) {
      for (const f of r.copied) console.log(`    + data/${f}`);
      for (const f of r.deleted) console.log(`    - data/${f}`);
    }
  }
  console.log(`\n${changed} folder(s) ${values["dry-run"] ? "would change" : "changed"}${missing ? `; ${missing} app(s) not generated yet (skipped)` : ""}.`);
}

if (isMain(import.meta.url)) main();
