/**
 * package-lock.json helpers: resolve a lock with npm in a temp folder, rename
 * it for an app, and check that an app's lock matches its package.json.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { canonicalJson, readJson } from "./apps.mjs";

const WIN = process.platform === "win32";
export const DEP_FIELDS = ["dependencies", "devDependencies", "optionalDependencies", "peerDependencies"];
export const EXACT = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

/** A copy of `lock` whose top-level name and packages[""].name are `name`. */
export function renameLock(lock, name) {
  const out = structuredClone(lock);
  out.name = name;
  if (out.packages?.[""]) out.packages[""] = { ...out.packages[""], name };
  return out;
}

export function lockText(lock) {
  return `${JSON.stringify(lock, null, 2)}\n`;
}

/** True when both package.json objects declare the same dependencies (all four fields). */
export function sameDeps(a, b) {
  return DEP_FIELDS.every((f) => canonicalJson(a[f] ?? {}) === canonicalJson(b[f] ?? {}));
}

/**
 * Problems with <dir>/package-lock.json against <dir>/package.json (empty = consistent):
 * names, the root entry's dependency maps, and every direct dependency present
 * in the lock at the exact version package.json asks for.
 */
export function checkLock(dir) {
  const problems = [];
  const pkgFile = path.join(dir, "package.json");
  const lockFile = path.join(dir, "package-lock.json");
  if (!existsSync(pkgFile)) return ["package.json missing"];
  if (!existsSync(lockFile)) return ["package-lock.json missing (run node scripts/lockfiles.mjs)"];
  let pkg;
  let lock;
  try {
    pkg = readJson(pkgFile);
    lock = readJson(lockFile);
  } catch (err) {
    return [`unreadable JSON: ${err.message}`];
  }
  if (!(lock.lockfileVersion >= 2)) problems.push(`lockfileVersion ${lock.lockfileVersion} (need 2 or 3)`);
  if (lock.name !== pkg.name) problems.push(`lock name "${lock.name}" != package name "${pkg.name}"`);
  const rootEntry = lock.packages?.[""];
  if (!rootEntry) {
    problems.push('lock has no packages[""] entry');
    return problems;
  }
  if (rootEntry.name !== pkg.name) problems.push(`lock packages[""].name "${rootEntry.name}" != "${pkg.name}"`);
  for (const field of DEP_FIELDS) {
    const want = pkg[field] ?? {};
    const have = rootEntry[field] ?? {};
    for (const [name, spec] of Object.entries(want)) {
      if (have[name] === undefined) problems.push(`${field}: ${name}@${spec} is not in the lock`);
      else if (have[name] !== spec) problems.push(`${field}: ${name} is ${spec} in package.json but ${have[name]} in the lock`);
    }
    for (const name of Object.keys(have)) {
      if (want[name] === undefined) problems.push(`${field}: ${name} is in the lock but not in package.json`);
    }
  }
  for (const field of ["dependencies", "devDependencies"]) {
    for (const [name, spec] of Object.entries(pkg[field] ?? {})) {
      const entry = lock.packages[`node_modules/${name}`];
      if (!entry) problems.push(`node_modules/${name} missing from the lock`);
      else if (EXACT.test(spec) && entry.version !== spec) problems.push(`${name}: lock resolves ${entry.version}, package.json pins ${spec}`);
    }
  }
  return problems;
}

/** Major version of the npm on PATH, or 0. */
export function npmMajor() {
  const r = WIN
    ? spawnSync("npm --version", { shell: true, encoding: "utf8", windowsHide: true })
    : spawnSync("npm", ["--version"], { encoding: "utf8" });
  const m = /^(\d+)\./.exec((r.stdout ?? "").trim());
  return m ? Number(m[1]) : 0;
}

/**
 * The npm used to resolve locks. npm 10.9 crashes on this dependency tree
 * ("Cannot read properties of null (reading 'edgesOut')" in arborist's peer-set
 * loading, set off by vitest's optional peers), so below npm 11 the lock is
 * resolved with `npx -y npm@11`. The resulting lockfileVersion 3 file installs
 * fine with npm 10 (`npm ci`).
 */
export function chooseNpm(override) {
  if (override && override !== "auto") return override.split(/\s+/);
  const major = npmMajor();
  if (major >= 11) return ["npm"];
  return ["npx", "-y", "npm@11"];
}

function run(cmd, args, cwd) {
  const options = { cwd, encoding: "utf8", windowsHide: true, env: { ...process.env, npm_config_yes: "true" } };
  const r = WIN
    ? spawnSync([cmd, ...args].join(" "), { ...options, shell: true })
    : spawnSync(cmd, args, options);
  return { status: r.status, out: `${r.stdout ?? ""}${r.stderr ?? ""}`, error: r.error };
}

/**
 * Resolves a lock for `pkg` (a package.json object) with npm in a temp folder.
 * `npmrc` is copied next to it; `seed` (a lock object) keeps existing resolutions.
 * Returns the lock object; throws with npm's output on failure.
 */
export function resolveLock(pkg, { npmrc = "", seed = null, npm = ["npm"] } = {}) {
  const tmp = mkdtempSync(path.join(os.tmpdir(), "rcene-lock-"));
  try {
    writeFileSync(path.join(tmp, "package.json"), `${JSON.stringify(pkg, null, 2)}\n`);
    if (npmrc) writeFileSync(path.join(tmp, ".npmrc"), npmrc);
    if (seed) writeFileSync(path.join(tmp, "package-lock.json"), lockText(renameLock(seed, pkg.name)));
    const [cmd, ...pre] = npm;
    const r = run(cmd, [...pre, "install", "--package-lock-only", "--ignore-scripts", "--no-audit", "--no-fund"], tmp);
    if (r.status !== 0) {
      throw new Error(`${npm.join(" ")} install --package-lock-only failed (exit ${r.status}${r.error ? `, ${r.error.message}` : ""}):\n${r.out.trim().split("\n").slice(-15).join("\n")}`);
    }
    return JSON.parse(readFileSync(path.join(tmp, "package-lock.json"), "utf8"));
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}
