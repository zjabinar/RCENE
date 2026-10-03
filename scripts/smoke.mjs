#!/usr/bin/env node
/**
 * Runs the smoke test of one or more apps from the repo root. Each app owns its
 * smoke test (apps/<slug>/scripts/smoke.mjs, `npm run smoke` inside the app);
 * this wrapper only picks the apps and runs them one after another.
 *
 *   node scripts/smoke.mjs --app 01-ligtas
 *   node scripts/smoke.mjs --app 01 --app 03 --no-build
 *   node scripts/smoke.mjs --app template
 *   node scripts/smoke.mjs --all --no-build
 *
 * --app <slug|id|template> (repeatable) or --all (every generated app) picks the
 * apps; every other argument is passed through unchanged to each app's smoke.mjs
 * (see `node apps/_template/scripts/smoke.mjs --help`). Runs sequentially, prints
 * a summary, exits 1 if any app failed. Option: --root <repo>.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { ROOT, appDir, isMain, rel, resolveTargets, seconds } from "./lib/apps.mjs";

const USAGE = `Usage: node scripts/smoke.mjs (--app <slug|id|template>... | --all) [args for each app's smoke.mjs]

  --app <x>     app to check (repeatable): a slug (01-ligtas), an id (01) or "template"
  --all         every generated app (not the template)
  --root <dir>  another repo copy
  anything else is passed to apps/<slug>/scripts/smoke.mjs (e.g. --no-build, --route /x, --keep-open)`;

export function splitArgs(argv) {
  const apps = [];
  const pass = [];
  let all = false;
  let root = null;
  let help = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--app" || a === "--root") {
      const v = argv[i + 1];
      if (v === undefined || v.startsWith("--")) throw new Error(`${a} needs a value`);
      if (a === "--app") apps.push(v);
      else root = v;
      i++;
    } else if (a.startsWith("--app=")) apps.push(a.slice(6));
    else if (a.startsWith("--root=")) root = a.slice(7);
    else if (a === "--all") all = true;
    else if (a === "-h" || a === "--help") help = true;
    else pass.push(a);
  }
  return { apps: apps.flatMap((a) => a.split(",")).map((a) => a.trim()).filter(Boolean), pass, all, root, help };
}

function main() {
  let args;
  try {
    args = splitArgs(process.argv.slice(2));
  } catch (err) {
    console.error(`${err.message}\n\n${USAGE}`);
    process.exit(2);
  }
  if (args.help || (!args.all && args.apps.length === 0)) {
    console.log(USAGE);
    process.exit(args.help ? 0 : 2);
  }
  const root = path.resolve(args.root ?? ROOT);
  let targets;
  try {
    targets = resolveTargets(root, args.apps, { all: args.all });
  } catch (err) {
    console.error(err.message);
    process.exit(2);
  }
  const results = [];
  for (const row of targets) {
    const dir = appDir(root, row);
    const script = path.join(dir, "scripts", "smoke.mjs");
    if (!existsSync(script)) {
      if (args.apps.length) results.push({ slug: row.slug, ok: false, ms: 0, note: `no ${rel(root, script)} (generate the app first)` });
      continue;
    }
    console.log(`\n######## ${row.slug}: node scripts/smoke.mjs ${args.pass.join(" ")}  (in ${rel(root, dir)})`);
    const t = Date.now();
    const r = spawnSync(process.execPath, [script, ...args.pass], { cwd: dir, stdio: "inherit", windowsHide: true });
    results.push({ slug: row.slug, ok: r.status === 0, ms: Date.now() - t, note: r.status === 0 ? "" : `exit ${r.status ?? r.signal}` });
  }
  console.log("\n================ smoke (all apps) ================");
  for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.slug.padEnd(16)} ${seconds(r.ms).padStart(8)}  ${r.note}`);
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${failed ? "SMOKE FAIL" : "SMOKE PASS"}: ${results.length - failed} of ${results.length} app(s) passed`);
  process.exitCode = failed || results.length === 0 ? 1 : 0;
}

if (isMain(import.meta.url)) main();
