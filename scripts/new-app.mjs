#!/usr/bin/env node
/**
 * Generates self-contained apps/<slug>/ folders from apps/_template, one per
 * app row of docs/projects/projects.json.
 *
 *   node scripts/new-app.mjs 01-ligtas            # one app (slug or id)
 *   node scripts/new-app.mjs --all                # every app row
 *   node scripts/new-app.mjs --all --force        # regenerate started apps too (careful)
 *   node scripts/new-app.mjs --all --out /tmp/x   # write into another repo copy (e.g. a scratch clone)
 *
 * For each app:
 *   1. copies the template (no node_modules, dist, caches, downloaded models,
 *      screenshots, local settings, lockfile or data/) and fills the
 *      placeholders __ID__ __SLUG__ __TITLE__ __TAGLINE__ __PORT__ __BRIEF__
 *      in every text file (__BRIEF__ becomes docs/brief.md);
 *   2. writes project.json (the app's own metadata) and package.json (exact
 *      versions from stack.json, the template's scripts, no packageManager);
 *   3. writes docs/brief.md (the brief), docs/DISCLOSURE.md, docs/proposal.md
 *      (its section of docs/PROPOSALS.md) and, for 01/03/05, docs/PRD.md;
 *   4. mirrors root data/ into the app's data/ (scripts/sync-data.mjs);
 *   5. copies the template's package-lock.json under the app's name, when the
 *      template has one (scripts/lockfiles.mjs is the real tool);
 *   6. writes .sync.json, the baseline scripts/sync-shared.mjs compares against.
 *
 * A started app (STATUS.md no longer says "Not started") is skipped unless
 * --force. Regenerating keeps the app's node_modules/ and downloaded models/.
 *
 * Options:
 *   --root <repo>  read the template, manifest, docs and data from this repo (default: this one)
 *   --out <repo>   write apps/<slug> into this repo copy instead (default: --root)
 *   --dry-run      list what would be generated, write nothing
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  GENERATED_DOCS,
  ROOT,
  SYNC_FILE,
  appPackageJson,
  appRows,
  cli,
  contentHash,
  desiredManagedFiles,
  fillPlaceholders,
  findApp,
  generatedDocs,
  isStarted,
  isMain,
  isText,
  json,
  packageManagedHash,
  projectJson,
  readJson,
  readManifest,
  rel,
  repoPaths,
  syncStateJson,
  templateFiles,
} from "./lib/apps.mjs";
import { mirrorData } from "./lib/data.mjs";
import { lockText, renameLock } from "./lib/lock.mjs";

const USAGE = `Usage: node scripts/new-app.mjs <slug|id>... | --all [--force] [--dry-run] [--root <repo>] [--out <repo>]`;

/** Template paths new-app never copies verbatim: generated per app, or owned by another tool. */
function skipFromTemplate(file) {
  return file === "project.json" || file === "package.json" || file.startsWith("data/") || GENERATED_DOCS.has(file);
}

/** Keeps node_modules and downloaded models; removes everything else in the app folder. */
function clearApp(dir) {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules") continue;
    if (entry === "models") continue; // large downloads (gitignored); models/.gitkeep is rewritten below
    rmSync(path.join(dir, entry), { recursive: true, force: true });
  }
}

function writeFile(dir, file, data) {
  const abs = path.join(dir, ...file.split("/"));
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, data);
}

export function generate(row, { srcRoot, outRoot, force = false, dryRun = false, log = console.log }) {
  const src = repoPaths(srcRoot);
  const dir = path.join(repoPaths(outRoot).apps, row.slug);
  const existed = existsSync(dir);
  if (existed && isStarted(dir) && !force) {
    log(`skip   ${row.slug}  (started: STATUS.md no longer says "Not started"; --force overwrites)`);
    return "skipped";
  }
  // Placeholders land inside "..." in TS and HTML attributes: refuse values that would break them.
  for (const key of ["title", "tagline"]) {
    if (/["\\`<>&]/.test(String(row[key] ?? ""))) throw new Error(`${key} "${row[key]}" contains one of " \\ \` < > & (it is pasted into TS strings and HTML)`);
  }
  const files = templateFiles(srcRoot).filter((f) => !skipFromTemplate(f));
  const docs = generatedDocs(srcRoot, row);
  if (dryRun) {
    log(`would  ${row.slug}  (${files.length} template files, ${docs.size} docs, port ${row.port}${existed ? ", replacing the existing folder" : ""})`);
    return "dry-run";
  }

  if (existed) clearApp(dir);
  mkdirSync(dir, { recursive: true });

  for (const file of files) {
    let buf = readFileSync(path.join(src.template, ...file.split("/")));
    if (isText(file, buf)) buf = Buffer.from(fillPlaceholders(buf.toString("utf8"), row), "utf8");
    writeFile(dir, file, buf);
  }
  const pkg = appPackageJson(row, srcRoot);
  writeFile(dir, "project.json", json(projectJson(row, srcRoot)));
  writeFile(dir, "package.json", json(pkg));
  for (const [file, text] of docs) writeFile(dir, file, text);

  const data = mirrorData(srcRoot, dir);

  const templateLock = path.join(src.template, "package-lock.json");
  let lockNote = "no template lock yet: run node scripts/lockfiles.mjs";
  if (existsSync(templateLock)) {
    writeFile(dir, "package-lock.json", lockText(renameLock(readJson(templateLock), pkg.name)));
    lockNote = "lock copied from the template";
  }

  // Baseline for sync-shared: the hash of every managed file exactly as written here.
  const baseline = {};
  for (const [file, want] of desiredManagedFiles(srcRoot, row)) {
    if (want.packageJson) baseline[file] = packageManagedHash(pkg, want.managed);
    else if (existsSync(path.join(dir, ...file.split("/")))) baseline[file] = contentHash(file, readFileSync(path.join(dir, ...file.split("/"))));
  }
  writeFile(dir, SYNC_FILE, syncStateJson(baseline));

  log(
    `wrote  ${rel(outRoot, dir)}  (port ${row.port}${row.ai ? ", AI" : ""}; ${files.length} template files, ${docs.size} docs, data ${data.files} files; ${lockNote})`,
  );
  return "written";
}

function main() {
  const { values, positionals } = cli(
    process.argv.slice(2),
    {
      all: { type: "boolean" },
      force: { type: "boolean" },
      "dry-run": { type: "boolean" },
      root: { type: "string" },
      out: { type: "string" },
    },
    USAGE,
  );
  const srcRoot = path.resolve(values.root ?? ROOT);
  const outRoot = path.resolve(values.out ?? srcRoot);
  const manifest = readManifest(srcRoot);
  let rows;
  if (values.all) rows = appRows(manifest);
  else {
    rows = [];
    for (const key of positionals) {
      const row = findApp(manifest, key);
      if (!row) {
        console.error(`No app "${key}" in docs/projects/projects.json.\n${USAGE}`);
        process.exit(2);
      }
      if (!rows.includes(row)) rows.push(row);
    }
  }
  if (rows.length === 0) {
    console.error(USAGE);
    process.exit(2);
  }
  if (!existsSync(path.join(repoPaths(srcRoot).template, "package.json"))) {
    console.error(`No template at ${repoPaths(srcRoot).template}`);
    process.exit(1);
  }
  const counts = { written: 0, skipped: 0, "dry-run": 0, failed: 0 };
  for (const row of rows) {
    try {
      counts[generate(row, { srcRoot, outRoot, force: values.force, dryRun: values["dry-run"] })]++;
    } catch (err) {
      counts.failed++;
      console.error(`FAIL   ${row.slug}: ${err.message}`);
    }
  }
  console.log(`\n${counts.written} written, ${counts.skipped} skipped (started), ${counts.failed} failed${values["dry-run"] ? `, ${counts["dry-run"]} planned (dry run)` : ""}.`);
  if (counts.written) {
    console.log("Next: pnpm install (workspace links), node scripts/lockfiles.mjs (if no lock was copied), node scripts/check-standalone.mjs --all");
  }
  if (counts.failed) process.exit(1);
}

if (isMain(import.meta.url)) main();
