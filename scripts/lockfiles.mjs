#!/usr/bin/env node
/**
 * Writes each app's package-lock.json, so every app folder installs on its own
 * with `npm ci` (pnpm keeps using the root pnpm-lock.yaml for daily work).
 *
 *   node scripts/lockfiles.mjs                 # template + every generated app (same as --all)
 *   node scripts/lockfiles.mjs 01-ligtas 06    # some apps (the template lock is refreshed too)
 *   node scripts/lockfiles.mjs --fresh         # re-resolve even if the template lock is current
 *   node scripts/lockfiles.mjs --check         # verify, write nothing; exit 1 on a mismatch
 *
 * Resolves once: the template's package.json + .npmrc go to a temp folder and
 * `npm install --package-lock-only --ignore-scripts` writes the shared lock
 * (reused when apps/_template/package-lock.json already matches its
 * package.json, unless --fresh). Every app whose dependencies equal the
 * template's gets that lock with its own name. An app with extra dependencies
 * gets its own lock-only resolve, seeded with the shared lock so the common
 * packages keep the same versions.
 *
 * npm below 11 crashes on this tree (arborist "reading 'edgesOut'"), so the
 * resolve then runs through `npx -y npm@11`; the lockfileVersion 3 result
 * installs fine with npm 10. Override with --npm "<command>".
 *
 * Options: --root <repo>, --npm <command>.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { ROOT, appDir, cli, isMain, readJson, repoPaths, resolveTargets, seconds, templateRow } from "./lib/apps.mjs";
import { checkLock, chooseNpm, lockText, renameLock, resolveLock, sameDeps } from "./lib/lock.mjs";

const USAGE = 'Usage: node scripts/lockfiles.mjs [--all | <slug|id|template>...] [--check] [--fresh] [--npm "<command>"] [--root <repo>]';

function writeIfChanged(file, text) {
  if (existsSync(file) && readFileSync(file, "utf8") === text) return false;
  writeFileSync(file, text);
  return true;
}

function main() {
  const { values, positionals } = cli(
    process.argv.slice(2),
    { all: { type: "boolean" }, check: { type: "boolean" }, fresh: { type: "boolean" }, npm: { type: "string" }, root: { type: "string" } },
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
  const present = targets.filter((row) => existsSync(path.join(appDir(root, row), "package.json")));
  const absent = targets.filter((row) => !present.includes(row));

  if (values.check) {
    let bad = 0;
    for (const row of present) {
      const problems = checkLock(appDir(root, row));
      if (problems.length) bad++;
      console.log(`${problems.length ? "FAIL" : "ok  "}  ${row.slug}`);
      for (const p of problems.slice(0, 12)) console.log(`        ${p}`);
      if (problems.length > 12) console.log(`        ... ${problems.length - 12} more`);
    }
    for (const row of absent) if (positionals.length) console.log(`skip  ${row.slug} (no folder)`);
    console.log(`\n${present.length - bad} of ${present.length} lock(s) consistent.`);
    if (bad) process.exit(1);
    return;
  }

  const t0 = Date.now();
  const template = repoPaths(root).template;
  const templatePkg = readJson(path.join(template, "package.json"));
  const npmrcFile = path.join(template, ".npmrc");
  const npmrc = existsSync(npmrcFile) ? readFileSync(npmrcFile, "utf8") : "";
  const npm = chooseNpm(values.npm);

  let shared;
  const templateLock = path.join(template, "package-lock.json");
  if (!values.fresh && existsSync(templateLock) && checkLock(template).length === 0) {
    shared = readJson(templateLock);
    console.log(`Shared lock: reusing apps/_template/package-lock.json (matches its package.json; --fresh re-resolves)`);
  } else {
    console.log(`Shared lock: resolving apps/_template/package.json with ${npm.join(" ")} ...`);
    const t = Date.now();
    shared = resolveLock(templatePkg, { npmrc, npm });
    console.log(`  resolved ${Object.keys(shared.packages).length - 1} packages in ${seconds(Date.now() - t)}`);
  }
  const templateText = lockText(renameLock(shared, templatePkg.name));
  console.log(`${writeIfChanged(templateLock, templateText) ? "wrote " : "same  "}  ${templateRow(root).slug}`);

  let failed = 0;
  for (const row of present) {
    if (row.template) continue;
    const dir = appDir(root, row);
    const pkg = readJson(path.join(dir, "package.json"));
    const file = path.join(dir, "package-lock.json");
    try {
      let lock;
      let how = "shared";
      if (sameDeps(pkg, templatePkg)) {
        lock = renameLock(shared, pkg.name);
        // The root entry mirrors package.json (engines, version) as npm would write it.
        const entry = { ...lock.packages[""] };
        for (const key of ["version", "engines", "license"]) {
          if (pkg[key] === undefined) delete entry[key];
          else entry[key] = pkg[key];
        }
        lock.packages[""] = entry;
      } else {
        const t = Date.now();
        lock = resolveLock(pkg, { npmrc: existsSync(path.join(dir, ".npmrc")) ? readFileSync(path.join(dir, ".npmrc"), "utf8") : npmrc, seed: shared, npm });
        how = `own resolve (extra or different dependencies), ${seconds(Date.now() - t)}`;
      }
      const changed = writeIfChanged(file, lockText(lock));
      const problems = checkLock(dir);
      if (problems.length) {
        failed++;
        console.log(`FAIL    ${row.slug}: ${problems[0]}`);
      } else console.log(`${changed ? "wrote " : "same  "}  ${row.slug}  (${how})`);
    } catch (err) {
      failed++;
      console.log(`FAIL    ${row.slug}: ${err.message}`);
    }
  }
  if (absent.length && positionals.length) console.log(`skipped (no folder): ${absent.map((r) => r.slug).join(", ")}`);
  console.log(`\nDone in ${seconds(Date.now() - t0)}. Commit the package-lock.json files; check with node scripts/lockfiles.mjs --check.`);
  if (failed) process.exit(1);
}

if (isMain(import.meta.url)) main();
