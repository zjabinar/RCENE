#!/usr/bin/env node
/**
 * Keeps package.json versions equal to stack.json, the single version table.
 *
 *   node scripts/stack.mjs            # same as --check
 *   node scripts/stack.mjs --check    # exit 1 on any mismatch
 *   node scripts/stack.mjs --write    # fix them (then: node scripts/lockfiles.mjs --fresh)
 *
 * Checks apps/_template and every generated app against stack.app
 * (dependencies and devDependencies), and the root package.json devDependencies
 * against stack.root. A stack package missing from an app or at another version
 * is an error; a package the app added beyond the stack is reported as an
 * extra (allowed when justified in the app's NOTES.md) and kept by --write.
 * Every version in stack.json must be exact. Option: --root <repo>.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { ROOT, appDir, cli, isMain, json, readJson, readStack, resolveTargets } from "./lib/apps.mjs";
import { EXACT } from "./lib/lock.mjs";

const USAGE = "Usage: node scripts/stack.mjs [--check | --write] [--root <repo>]";

/** Differences between a package.json section and the wanted versions. */
export function compareSection(have = {}, want = {}) {
  const wrong = [];
  const missing = [];
  const extra = [];
  for (const [name, version] of Object.entries(want)) {
    if (have[name] === undefined) missing.push(`${name}@${version}`);
    else if (have[name] !== version) wrong.push(`${name} ${have[name]} -> ${version}`);
  }
  for (const [name, version] of Object.entries(have)) if (want[name] === undefined) extra.push(`${name}@${version}`);
  return { wrong, missing, extra };
}

const sortObj = (o) => Object.fromEntries(Object.entries(o).sort(([a], [b]) => a.localeCompare(b)));

function main() {
  const { values } = cli(process.argv.slice(2), { check: { type: "boolean" }, write: { type: "boolean" }, root: { type: "string" } }, USAGE);
  const root = path.resolve(values.root ?? ROOT);
  const write = Boolean(values.write);
  const stack = readStack(root);
  let errors = 0;

  for (const [where, section] of [
    ["app.dependencies", stack.app?.dependencies],
    ["app.devDependencies", stack.app?.devDependencies],
    ["root.devDependencies", stack.root?.devDependencies],
  ]) {
    for (const [name, version] of Object.entries(section ?? {})) {
      if (!EXACT.test(version)) {
        errors++;
        console.log(`FAIL  stack.json ${where}: ${name} "${version}" is not an exact version`);
      }
    }
  }

  const sections = [
    ["dependencies", stack.app.dependencies],
    ["devDependencies", stack.app.devDependencies],
  ];
  const targets = resolveTargets(root, [], { all: true, withTemplate: true });
  let checked = 0;
  for (const row of targets) {
    const file = path.join(appDir(root, row), "package.json");
    if (!existsSync(file)) continue;
    checked++;
    const pkg = readJson(file);
    const lines = [];
    let bad = false;
    for (const [key, want] of sections) {
      const { wrong, missing, extra } = compareSection(pkg[key], want);
      if (wrong.length || missing.length) bad = true;
      if (wrong.length) lines.push(`${key}: ${wrong.join(", ")}`);
      if (missing.length) lines.push(`${key} missing: ${missing.join(", ")}`);
      if (extra.length) lines.push(`${key} extra (not in stack.json; keep only if justified in NOTES.md): ${extra.join(", ")}`);
      if (write && (wrong.length || missing.length)) pkg[key] = sortObj({ ...pkg[key], ...want });
    }
    if (bad) errors += write ? 0 : 1;
    const status = bad ? (write ? "fixed" : "FAIL ") : "ok   ";
    console.log(`${status} ${row.slug}`);
    for (const l of lines) console.log(`        ${l}`);
    if (write && bad) writeFileSync(file, json(pkg));
  }

  const rootFile = path.join(root, "package.json");
  const rootPkg = JSON.parse(readFileSync(rootFile, "utf8"));
  const want = stack.root?.devDependencies ?? {};
  const { wrong, missing, extra } = compareSection(rootPkg.devDependencies, want);
  const rootBad = wrong.length || missing.length || extra.length;
  console.log(`${rootBad ? (write ? "fixed" : "FAIL ") : "ok   "} root package.json devDependencies`);
  if (wrong.length) console.log(`        ${wrong.join(", ")}`);
  if (missing.length) console.log(`        missing: ${missing.join(", ")}`);
  if (extra.length) console.log(`        not in stack.root: ${extra.join(", ")}`);
  if (rootBad) {
    if (write) {
      rootPkg.devDependencies = sortObj({ ...want });
      writeFileSync(rootFile, json(rootPkg));
    } else errors++;
  }

  console.log(`\n${checked} app package.json file(s) checked against stack.json.`);
  if (write) console.log("Next: pnpm install, then node scripts/lockfiles.mjs --fresh");
  if (errors) process.exit(1);
}

if (isMain(import.meta.url)) main();
