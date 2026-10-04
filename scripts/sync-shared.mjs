#!/usr/bin/env node
/**
 * Three-way update of the shared, template-owned files in generated apps.
 *
 *   node scripts/sync-shared.mjs --all --dry-run         # what would change
 *   node scripts/sync-shared.mjs --all                   # update every not-started app
 *   node scripts/sync-shared.mjs 01-ligtas --only rcene  # one app, only rcene/**
 *   node scripts/sync-shared.mjs --all --report          # drift report, writes nothing
 *
 * Managed files (everything else is the app's own and never touched):
 *   rcene    rcene/**
 *   scripts  scripts/**
 *   claude   .claude/settings.json, .claude/skills/**, .mcp.json, CLAUDE.md
 *   config   .npmrc .gitignore .gitattributes tsconfig*.json vite.config.ts components.json index.html
 *   docs     docs/brief.md, docs/DISCLOSURE.md, docs/proposal.md, docs/PRD.md (01/03/05),
 *            generated from docs/projects/<slug>.md, docs/DISCLOSURE.md, docs/PROPOSALS.md, docs/PRD.md
 *   package  package.json: only engines, scripts, dependencies, devDependencies
 * Never managed: src/** public/** data/** (scripts/sync-data.mjs) models/** project.json
 * package-lock.json (scripts/lockfiles.mjs) AI-LOG.md NOTES.md STATUS.md DEMO.md docs/plan.md screenshots.
 *
 * Template text files get their placeholders filled for the app first. Each
 * app's .sync.json holds the hash of every managed file as the sync last wrote
 * it (the base). Per file: missing in the app, or unchanged since the base ->
 * updated; already equal to the template -> in sync; changed in the app and
 * different from the template -> conflict, left alone and reported (--force
 * overwrites). A file removed from the template is removed from the app only
 * if the app never changed it.
 *
 * Targets: --all or slugs/ids. Started apps (STATUS.md no longer "Not started")
 * are skipped by --all unless --include-started; naming an app always includes it.
 *
 * Options:
 *   --dry-run          report what would happen, write nothing
 *   --force            overwrite conflicts with the template version
 *   --only <groups>    comma list of rcene,scripts,claude,config,docs,package
 *   --report           drift report: every managed file that differs from the template, and
 *                      app-only files inside managed folders; writes nothing (includes started apps)
 *   --diff             print the full diff (app -> template) of each conflict
 *   --root <repo>      operate on another repo copy
 * Exit code 1 when conflicts remain (not in --report mode).
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  GROUPS,
  ROOT,
  SYNC_FILE,
  appDir,
  appPackageJson,
  canonicalJson,
  cli,
  currentManagedHash,
  desiredManagedFiles,
  findApp,
  isMain,
  isReference,
  isStarted,
  json,
  managedGroup,
  managedFromKeys,
  packageManagedHash,
  packageManagedKeys,
  packageManagedSubset,
  readJson,
  readManifest,
  readSyncState,
  repoPaths,
  resolveTargets,
  syncStateJson,
  templateFiles,
  walk,
  withManagedFields,
} from "./lib/apps.mjs";

const USAGE = `Usage: node scripts/sync-shared.mjs (--all | <slug|id>...) [--include-started] [--dry-run] [--force]
         [--only ${GROUPS.join(",")}] [--report] [--diff] [--root <repo>]`;

const TMP = { dir: null };
function tmpFile(name, data) {
  TMP.dir ??= mkdtempSync(path.join(os.tmpdir(), "rcene-sync-"));
  const file = path.join(TMP.dir, `${Math.random().toString(36).slice(2)}-${path.basename(name)}`);
  writeFileSync(file, data);
  return file;
}

/** "+a -b" lines changed from the app's file to the template's (git diff --no-index --numstat). */
function diffStat(appFile, newContent, rel) {
  const other = tmpFile(rel, newContent);
  const r = spawnSync("git", ["diff", "--no-index", "--numstat", "--", appFile, other], { encoding: "utf8", windowsHide: true });
  const line = (r.stdout ?? "").trim().split("\n")[0] ?? "";
  const m = /^(\d+|-)\s+(\d+|-)\s/.exec(line);
  if (!m) return "differs";
  if (m[1] === "-") return "binary differs";
  return `template version would add ${m[1]} and remove ${m[2]} line(s)`; // numstat: app -> template
}

/** Unified diff app -> template, with the paths shown as app/<rel> and template/<rel>. */
function fullDiff(appFile, newContent, rel) {
  const other = tmpFile(rel, newContent);
  const r = spawnSync("git", ["diff", "--no-index", "--no-color", "--src-prefix=app/", "--dst-prefix=template/", "--", appFile, other], {
    encoding: "utf8",
    windowsHide: true,
  });
  let out = r.stdout ?? "";
  for (const p of [appFile, other]) {
    const posix = p.split(path.sep).join("/");
    out = out.replaceAll(posix.replace(/^\//, ""), rel).replaceAll(posix, rel);
  }
  return out;
}

/** Summary of how the managed package.json fields differ: "dependencies: ~react, +x; scripts: -smoke". */
function packageDiff(curPkg, managed, dropped) {
  const parts = [];
  if (droppedCount(dropped)) parts.push(`no longer managed: ${[...dropped.scripts.map((k) => `scripts.${k}`), ...dropped.packages].join(", ")}`);
  const cur = packageManagedSubset(curPkg, managed);
  for (const key of Object.keys(managed)) {
    const a = cur[key] ?? {};
    const b = managed[key] ?? {};
    if (canonicalJson(a) === canonicalJson(b)) continue;
    const bits = [];
    for (const k of Object.keys(b)) if (!(k in a)) bits.push(`+${k}`);
    for (const k of Object.keys(a)) if (!(k in b)) bits.push(`-${k}`);
    for (const k of Object.keys(b)) if (k in a && canonicalJson(a[k]) !== canonicalJson(b[k])) bits.push(`~${k}`);
    parts.push(`${key}: ${bits.join(", ")}`);
  }
  return parts.join("; ") || "differs";
}

/**
 * package.json against its baseline: the hash of the app's subset over the names the
 * baseline covered (.sync.json packageKeys; older state files: today's names), and the
 * formerly managed scripts/packages still in the app that the template or stack.json dropped.
 */
function previousPackage(dir, state, want) {
  const file = path.join(dir, "package.json");
  const none = { scripts: [], packages: [] };
  if (!existsSync(file)) return { hash: null, dropped: none };
  let pkg;
  try {
    pkg = readJson(file);
  } catch {
    return { hash: currentManagedHash(dir, "package.json", want), dropped: none };
  }
  const keys = state.packageKeys ?? packageManagedKeys(want.managed);
  const now = packageManagedKeys(want.managed);
  const has = (obj, k) => Object.prototype.hasOwnProperty.call(obj ?? {}, k);
  const dropped = {
    scripts: keys.scripts.filter((k) => !now.scripts.includes(k) && has(pkg.scripts, k)),
    packages: keys.packages.filter((k) => !now.packages.includes(k) && (has(pkg.dependencies, k) || has(pkg.devDependencies, k))),
  };
  return { hash: packageManagedHash(pkg, managedFromKeys(keys)), dropped };
}

const droppedCount = (d) => (d ? d.scripts.length + d.packages.length : 0);

function writeManaged(dir, rel, want, row, root, dropped) {
  const abs = path.join(dir, ...rel.split("/"));
  mkdirSync(path.dirname(abs), { recursive: true });
  if (want.packageJson) {
    const cur = existsSync(abs) ? readJson(abs) : appPackageJson(row, root);
    writeFileSync(abs, json(withManagedFields(cur, want.managed, dropped)));
  } else {
    writeFileSync(abs, want.content);
  }
}

/** Plans (and unless dryRun, applies) the sync for one app. */
export function syncApp(root, row, { only = new Set(GROUPS), dryRun = false, force = false } = {}) {
  const dir = appDir(root, row);
  const state = readSyncState(dir);
  const desired = desiredManagedFiles(root, row);
  const next = { ...state.files };
  let nextKeys = state.packageKeys;
  const res = { slug: row.slug, updated: [], created: [], deleted: [], conflicts: [], unchanged: 0, forced: [] };

  for (const [rel, want] of desired) {
    if (!only.has(want.group)) continue;
    const prev = want.packageJson ? previousPackage(dir, state, want) : null;
    const cur = currentManagedHash(dir, rel, want);
    const base = state.files[rel];
    const accept = () => {
      next[rel] = want.hash;
      if (want.packageJson) nextKeys = packageManagedKeys(want.managed);
    };
    if (cur === want.hash && !droppedCount(prev?.dropped)) {
      res.unchanged++;
      accept();
      continue;
    }
    if (cur === null || (prev ? prev.hash : cur) === base) {
      (cur === null ? res.created : res.updated).push(rel);
      if (!dryRun) writeManaged(dir, rel, want, row, root, prev?.dropped);
      accept();
      continue;
    }
    const abs = path.join(dir, ...rel.split("/"));
    const detail = want.packageJson ? packageDiff(readJson(abs), want.managed, prev?.dropped) : diffStat(abs, want.content, rel);
    res.conflicts.push({ rel, detail, want, abs, kind: base ? "changed in the app" : "differs (no baseline)" });
    if (force) {
      res.forced.push(rel);
      if (!dryRun) writeManaged(dir, rel, want, row, root, prev?.dropped);
      accept();
    }
  }

  for (const rel of Object.keys(state.files)) {
    if (desired.has(rel)) continue;
    const group = managedGroup(rel);
    if (!group) {
      delete next[rel]; // no longer a managed path: forget it, leave the file
      continue;
    }
    if (!only.has(group)) continue;
    const abs = path.join(dir, ...rel.split("/"));
    const cur = currentManagedHash(dir, rel);
    if (cur === null) {
      delete next[rel];
    } else if (cur === state.files[rel]) {
      res.deleted.push(rel);
      if (!dryRun) rmSync(abs, { force: true });
      delete next[rel];
    } else {
      res.conflicts.push({ rel, detail: "removed from the template but changed in the app", abs, kind: "removed upstream" });
      if (force) {
        res.forced.push(rel);
        res.deleted.push(rel);
        if (!dryRun) rmSync(abs, { force: true });
        delete next[rel];
      }
    }
  }

  if (!dryRun) {
    const text = syncStateJson(next, nextKeys);
    const file = path.join(dir, SYNC_FILE);
    if (!existsSync(file) || readFileSync(file, "utf8") !== text) writeFileSync(file, text);
  }
  return res;
}

/** Read-only drift report for one app. */
export function driftReport(root, row) {
  const dir = appDir(root, row);
  const state = readSyncState(dir);
  const desired = desiredManagedFiles(root, row);
  const rows = [];
  for (const [rel, want] of desired) {
    const prev = want.packageJson ? previousPackage(dir, state, want) : null;
    const cur = currentManagedHash(dir, rel, want);
    if (cur === want.hash && !droppedCount(prev?.dropped)) continue;
    const base = state.files[rel];
    let status;
    if (cur === null) status = "missing";
    else if (base && (prev ? prev.hash : cur) === base) status = "behind (template moved; app unchanged: sync updates it)";
    else if (base) status = "modified (changed in the app: conflict)";
    else status = "differs (no baseline)";
    rows.push({ rel, status });
  }
  for (const rel of Object.keys(state.files)) {
    if (!desired.has(rel) && currentManagedHash(dir, rel) !== null) rows.push({ rel, status: "removed from the template" });
  }
  const templateSet = new Set(templateFiles(root));
  for (const top of ["rcene", "scripts", ".claude/skills"]) {
    for (const f of walk(path.join(dir, ...top.split("/")), { prefix: `${top}/` })) {
      const relPath = `${top}/${f}`;
      if (!templateSet.has(relPath) && !(relPath in state.files)) rows.push({ rel: relPath, status: "app-only file in a managed folder (left alone)" });
    }
  }
  return rows.sort((a, b) => a.rel.localeCompare(b.rel));
}

function main() {
  const { values, positionals } = cli(
    process.argv.slice(2),
    {
      all: { type: "boolean" },
      "include-started": { type: "boolean" },
      "dry-run": { type: "boolean" },
      force: { type: "boolean" },
      only: { type: "string" },
      report: { type: "boolean" },
      diff: { type: "boolean" },
      root: { type: "string" },
    },
    USAGE,
  );
  const root = path.resolve(values.root ?? ROOT);
  if (!values.all && positionals.length === 0) {
    console.error(USAGE);
    process.exit(2);
  }
  const only = new Set(values.only ? values.only.split(",").map((s) => s.trim()).filter(Boolean) : GROUPS);
  const bad = [...only].filter((g) => !GROUPS.includes(g));
  if (bad.length) {
    console.error(`--only: unknown group(s) ${bad.join(", ")} (groups: ${GROUPS.join(", ")})`);
    process.exit(2);
  }
  let targets;
  try {
    targets = resolveTargets(root, positionals, { all: values.all, allowTemplate: false });
  } catch (err) {
    console.error(err.message);
    process.exit(2);
  }
  if (!existsSync(path.join(repoPaths(root).template, "package.json"))) {
    console.error(`No template at ${repoPaths(root).template}`);
    process.exit(1);
  }
  const manifest = readManifest(root);
  const named = new Set(positionals.map((k) => findApp(manifest, k)?.slug));

  if (values.report) {
    console.log(`Drift report: managed files that differ from apps/_template${root === ROOT ? "" : ` (repo ${root})`}; nothing is written\n`);
    let drifting = 0;
    for (const row of targets) {
      const dir = appDir(root, row);
      if (!existsSync(dir)) {
        console.log(`${row.slug}: no folder (node scripts/new-app.mjs ${row.slug})`);
        continue;
      }
      const rows = driftReport(root, row);
      const tag = isStarted(dir) ? " [started]" : "";
      if (rows.length === 0) {
        console.log(`${row.slug}${tag}: in sync`);
        continue;
      }
      drifting++;
      console.log(`${row.slug}${tag}: ${rows.length} file(s) differ`);
      for (const r of rows) console.log(`    ${r.rel}  ${r.status}`);
    }
    console.log(`\n${drifting} of ${targets.length} app(s) drift from the template.`);
    return;
  }

  const mode = values["dry-run"] ? "dry run, nothing written" : values.force ? "--force: conflicts are overwritten" : "write";
  console.log(`sync-shared (${mode}; groups: ${[...only].join(", ")})\n`);
  const totals = { apps: 0, updated: 0, created: 0, deleted: 0, conflicts: 0, unchanged: 0, skipped: 0 };
  const lockHints = [];
  for (const row of targets) {
    const dir = appDir(root, row);
    if (!existsSync(dir)) {
      console.log(`${row.slug.padEnd(16)} missing (node scripts/new-app.mjs ${row.slug})`);
      continue;
    }
    if (isStarted(dir) && !isReference(row) && !named.has(row.slug) && !values["include-started"]) {
      totals.skipped++;
      console.log(`${row.slug.padEnd(16)} skipped (started; name it or pass --include-started)`);
      continue;
    }
    const res = syncApp(root, row, { only, dryRun: values["dry-run"], force: values.force });
    totals.apps++;
    for (const k of ["updated", "created", "deleted"]) totals[k] += res[k].length;
    totals.unchanged += res.unchanged;
    const open = res.conflicts.filter((c) => !res.forced.includes(c.rel));
    totals.conflicts += open.length;
    const verb = values["dry-run"] ? "would update" : "updated";
    console.log(
      `${row.slug.padEnd(16)} ${verb} ${res.updated.length}, created ${res.created.length}, deleted ${res.deleted.length}, conflicts ${res.conflicts.length}${res.forced.length ? ` (${res.forced.length} forced)` : ""}, unchanged ${res.unchanged}`,
    );
    for (const f of res.updated) console.log(`    ~ ${f}`);
    for (const f of res.created) console.log(`    + ${f}`);
    for (const f of res.deleted) console.log(`    - ${f}`);
    for (const c of res.conflicts) {
      console.log(`    ! ${c.rel}  ${c.kind}: ${c.detail}${res.forced.includes(c.rel) ? "  -> overwritten (--force)" : ""}`);
      if (values.diff && c.want?.content && existsSync(c.abs)) {
        for (const line of fullDiff(c.abs, c.want.content, c.rel).split("\n")) console.log(`      ${line}`);
      }
    }
    if ([...res.updated, ...res.created, ...res.forced].includes("package.json")) lockHints.push(row.slug);
  }
  if (TMP.dir) rmSync(TMP.dir, { recursive: true, force: true });
  console.log(
    `\n${totals.apps} app(s): ${totals.updated} updated, ${totals.created} created, ${totals.deleted} deleted, ${totals.conflicts} open conflict(s), ${totals.unchanged} unchanged; ${totals.skipped} started app(s) skipped.`,
  );
  if (totals.conflicts) console.log("Conflicts were left alone. Inspect with --diff, merge by hand, or rerun with --force for those apps.");
  if (lockHints.length) console.log(`package.json changed: run node scripts/lockfiles.mjs ${lockHints.join(" ")}`);
  if (totals.conflicts) process.exitCode = 1;
}

if (isMain(import.meta.url)) main();
