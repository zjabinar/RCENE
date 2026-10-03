#!/usr/bin/env node
/**
 * Checks that every app folder works on its own, copied anywhere.
 *
 *   node scripts/check-standalone.mjs --all                    # static checks: template + every app
 *   node scripts/check-standalone.mjs 01-ligtas 06             # some apps
 *   node scripts/check-standalone.mjs 01-ligtas --install 01-ligtas [--keep]
 *
 * Static checks (fast, no install):
 *   - no leftovers of the old monorepo in config or code: workspace:/catalog:
 *     protocols, projects.json, docs/projects/, packages/<config|data|geo|i18n|
 *     store|ui|map>, assets/models, @rcene/config. Prose (*.md) is exempt, and so
 *     are comment lines in scripts/** (they may explain what the app no longer reads);
 *   - every dependency pinned to an exact version, no packageManager field;
 *   - package-lock.json present and consistent with package.json;
 *   - project.json present (numeric port; its brief exists);
 *   - every relative path resolves inside the app folder: JS/TS imports
 *     (from "...", import("..."), require, vi.mock, new URL("...", import.meta.url)),
 *     CSS @import/@source/@plugin/@config/@reference, tsconfig extends/include/
 *     exclude/files/references/paths/baseUrl/rootDir/outDir/tsBuildInfoFile/typeRoots,
 *     .mcp.json command/args, .claude/settings.json hook commands/args and
 *     permission rules, package.json scripts, index.html src/href;
 *   - no symlinks (outside node_modules): they do not survive a copy;
 *   - data/fixtures present (the app's own copy of the data, from sync-data).
 *
 * --install <slug...>: copies each app (without node_modules, dist, models) to a
 * temp folder outside the repo and runs npm ci, npm run typecheck, npm test,
 * npm run build, npm run smoke -- --no-build, then deletes node_modules and runs
 * npm ci --offline; prints timings and the node_modules size. The temp folder is
 * deleted unless --keep. Step output goes to a log next to the copy; the tail is
 * printed on failure (--verbose streams it).
 *
 * Options: --root <repo>, --keep, --verbose. Exit code 1 on any failure.
 */
import { spawnSync } from "node:child_process";
import { appendFileSync, cpSync, existsSync, lstatSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { ROOT, appDir, cli, isMain, isText, readJson, resolveTargets, seconds } from "./lib/apps.mjs";
import { DEP_FIELDS, EXACT, checkLock } from "./lib/lock.mjs";

const USAGE = "Usage: node scripts/check-standalone.mjs (--all | <slug|id|template>...) [--install <slug|id>...] [--keep] [--verbose] [--root <repo>]";
const WIN = process.platform === "win32";

// ---------------------------------------------------------------------------
// File selection
// ---------------------------------------------------------------------------

const SKIP_DIRS = new Set(["node_modules", "dist", ".vite", "coverage", ".playwright-mcp", ".git", "models", "data"]);
const JS_EXT = /\.(?:ts|tsx|mts|cts|js|jsx|mjs|cjs)$/;

/** Every file of the app we look at (POSIX relative), plus the symlinks found on the way. */
export function appFiles(dir) {
  const files = [];
  const links = [];
  const recurse = (abs, rel) => {
    for (const entry of readdirSync(abs, { withFileTypes: true })) {
      const childRel = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isSymbolicLink()) {
        if (!childRel.split("/").includes("node_modules")) links.push(childRel);
        continue;
      }
      if (entry.isDirectory()) {
        if (!rel && SKIP_DIRS.has(entry.name)) continue;
        if (SKIP_DIRS.has(entry.name) && entry.name !== "data" && entry.name !== "models") continue;
        recurse(path.join(abs, entry.name), childRel);
      } else if (entry.isFile()) files.push(childRel);
    }
  };
  recurse(dir, "");
  return { files: files.sort(), links };
}

// ---------------------------------------------------------------------------
// Comment stripping (keeps line breaks, so line numbers stay right)
// ---------------------------------------------------------------------------

const REGEX_KEYWORDS = /\b(?:return|typeof|instanceof|case|in|of|new|delete|void|throw|yield|await|else|do)\s*$/;

/** Blanks JS/TS comments; strings, template literals and regex literals are kept as they are. */
export function stripJsComments(src) {
  let out = "";
  let i = 0;
  let last = "";
  const n = src.length;
  while (i < n) {
    const c = src[i];
    const d = src[i + 1];
    if (c === "/" && d === "/") {
      while (i < n && src[i] !== "\n") {
        out += " ";
        i++;
      }
      continue;
    }
    if (c === "/" && d === "*") {
      out += "  ";
      i += 2;
      while (i < n && !(src[i] === "*" && src[i + 1] === "/")) {
        out += src[i] === "\n" ? "\n" : " ";
        i++;
      }
      if (i < n) {
        out += "  ";
        i += 2;
      }
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      out += c;
      i++;
      while (i < n && src[i] !== c) {
        if (src[i] === "\\") {
          out += src[i] + (src[i + 1] ?? "");
          i += 2;
          continue;
        }
        if (c !== "`" && src[i] === "\n") break;
        out += src[i];
        i++;
      }
      if (i < n && src[i] === c) {
        out += c;
        i++;
      }
      last = c;
      continue;
    }
    if (c === "/" && (last === "" || /[(,=:[!&|?{};+\-*%<>~^]/.test(last) || REGEX_KEYWORDS.test(out))) {
      out += c;
      i++;
      let inClass = false;
      while (i < n && src[i] !== "\n") {
        const ch = src[i];
        if (ch === "\\") {
          out += ch + (src[i + 1] ?? "");
          i += 2;
          continue;
        }
        if (ch === "[") inClass = true;
        else if (ch === "]") inClass = false;
        else if (ch === "/" && !inClass) break;
        out += ch;
        i++;
      }
      if (i < n && src[i] === "/") {
        out += "/";
        i++;
      }
      last = "/";
      continue;
    }
    out += c;
    if (!/\s/.test(c)) last = c;
    i++;
  }
  return out;
}

/** Parses JSON with comments and trailing commas (tsconfig style). */
export function parseJsonc(text) {
  return JSON.parse(stripJsComments(text).replace(/,(\s*[}\]])/g, "$1"));
}

function lineOf(text, index) {
  let line = 1;
  for (let i = 0; i < index; i++) if (text.charCodeAt(i) === 10) line++;
  return line;
}

// ---------------------------------------------------------------------------
// Checks
// ---------------------------------------------------------------------------

/** Old-monorepo strings that must not appear in an app's config or code. */
export const FORBIDDEN = [
  { id: "protocol", re: /["'`](?:workspace|catalog):/, what: "workspace:/catalog: dependency protocol (pnpm workspace only)" },
  { id: "manifest", re: /projects\.json/, what: "the repo manifest docs/projects/projects.json (apps read their own project.json)" },
  { id: "briefs", re: /docs\/projects\//, what: "the repo's docs/projects/ (the app's brief is docs/brief.md)" },
  { id: "packages", re: /packages\/(?:config|data|geo|i18n|store|ui|map)\b/, what: "the removed packages/ folder (shared code is in ./rcene)" },
  { id: "models", re: /assets\/models/, what: "the old shared assets/models folder (models live in ./models)" },
  { id: "config", re: /@rcene\/config\b/, what: "the removed @rcene/config package (use ./rcene/config/vite.ts)" },
];

/**
 * The only places a forbidden string may appear, each with its reason:
 *   - prose (*.md): docs may describe the monorepo and its history;
 *   - comment lines in the app's own scripts/**: they may explain what the app no
 *     longer reads (the repo manifest, the old packages/ folder);
 *   - the app guard's tests (scripts/hooks/*.test.mjs) may use old monorepo paths
 *     (packages/..., docs/projects/...) as inputs that the guard must block.
 * Code and config elsewhere (rcene/, src/, configs, hook scripts themselves) get no exemption.
 */
export const ALLOW = [
  { why: "prose", file: /\.md$/ },
  { why: "comment in the app's own scripts", file: /^scripts\/.+\.(?:mjs|js|ts)$/, comment: true },
  { why: "guard test input", file: /^scripts\/hooks\/[^/]+\.test\.mjs$/, rules: ["packages", "briefs", "manifest"] },
];

export function allowedMention(file, line, ruleId) {
  const t = line.trim();
  const isComment = t.startsWith("//") || t.startsWith("*") || t.startsWith("/*");
  return ALLOW.some((a) => a.file.test(file) && (!a.comment || isComment) && (!a.rules || a.rules.includes(ruleId)));
}

const STRING_SKIP = new Set(["package-lock.json", ".sync.json"]);

function checkStrings(dir, files, fail) {
  for (const file of files) {
    if (STRING_SKIP.has(file)) continue;
    const buf = readFileSync(path.join(dir, file));
    if (!isText(file, buf) || buf.length > 2_000_000) continue;
    const lines = buf.toString("utf8").split(/\r?\n/);
    lines.forEach((line, i) => {
      for (const rule of FORBIDDEN) {
        if (rule.re.test(line) && !allowedMention(file, line, rule.id)) fail(`${file}:${i + 1}`, `${rule.what}: ${line.trim().slice(0, 140)}`);
      }
    });
  }
}

/** True when `target` (absolute) is the app folder or inside it. */
function inside(dir, target) {
  const r = path.relative(dir, target);
  return r === "" || (!r.startsWith("..") && !path.isAbsolute(r));
}

/** The static part of a glob ("src/**\/*.ts" -> "src"). */
function globBase(p) {
  const parts = p.split(/[\\/]/);
  const idx = parts.findIndex((s) => /[*?{}[\]]/.test(s));
  return (idx === -1 ? parts : parts.slice(0, idx)).join("/") || ".";
}

const RESOLVE_EXT = ["", ".ts", ".tsx", ".mts", ".js", ".mjs", ".jsx", ".cjs", ".json", "/index.ts", "/index.tsx", "/index.js"];

function resolvesToFile(abs) {
  return RESOLVE_EXT.some((ext) => existsSync(abs + ext));
}

/** Relative specifiers in JS/TS (comments ignored): [{ spec, index, kind }]. */
export function jsSpecifiers(code) {
  const out = [];
  const patterns = [
    { re: /\bfrom\s*(["'])([^"'\n]+)\1/g, kind: "import" },
    { re: /\bimport\s*(["'])([^"'\n]+)\1/g, kind: "import" },
    { re: /\bimport\s*\(\s*(["'])([^"'\n]+)\1\s*[,)]/g, kind: "import" },
    { re: /\brequire\s*\(\s*(["'])([^"'\n]+)\1\s*\)/g, kind: "import" },
    { re: /\bvi\.(?:mock|importActual|doMock)\s*\(\s*(["'])([^"'\n]+)\1/g, kind: "import" },
    { re: /\bnew\s+URL\s*\(\s*(["'`])([^"'`\n]+)\1\s*,\s*import\.meta\.url\s*\)/g, kind: "url" },
  ];
  for (const { re, kind } of patterns) {
    for (const m of code.matchAll(re)) {
      if (m[2].startsWith(".")) out.push({ spec: m[2], index: m.index, kind });
    }
  }
  return out;
}

function checkJs(dir, file, fail) {
  const text = readFileSync(path.join(dir, file), "utf8");
  const code = stripJsComments(text);
  for (const { spec, index, kind } of jsSpecifiers(code)) {
    if (spec.includes("${")) continue;
    const clean = spec.split("?")[0];
    const abs = path.resolve(path.dirname(path.join(dir, file)), clean);
    const where = `${file}:${lineOf(code, index)}`;
    if (!inside(dir, abs)) fail(where, `"${spec}" points outside the app folder`);
    else if (kind === "import" && !resolvesToFile(abs)) fail(where, `"${spec}" does not resolve to a file`);
  }
}

function checkCss(dir, file, fail) {
  const text = readFileSync(path.join(dir, file), "utf8").replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));
  const re = /@(import|source|plugin|config|reference)\s+(?:not\s+)?(?:url\(\s*)?(["']?)([^"')\s;]+)\2/g;
  for (const m of text.matchAll(re)) {
    const [, at, , spec] = m;
    if (!spec.startsWith(".")) continue;
    const abs = path.resolve(path.dirname(path.join(dir, file)), at === "source" ? globBase(spec) : spec);
    const where = `${file}:${lineOf(text, m.index)}`;
    if (!inside(dir, abs)) fail(where, `@${at} "${spec}" points outside the app folder`);
    else if (at !== "source" && !existsSync(abs)) fail(where, `@${at} "${spec}" does not exist`);
  }
}

function checkTsconfig(dir, file, fail) {
  const base = path.dirname(path.join(dir, file));
  let cfg;
  try {
    cfg = parseJsonc(readFileSync(path.join(dir, file), "utf8"));
  } catch (err) {
    fail(file, `cannot parse: ${err.message}`);
    return;
  }
  const check = (label, value, { mustExist = false, glob = false, from = base } = {}) => {
    if (typeof value !== "string") return;
    if (!value.startsWith(".") && !value.includes("/") && !glob) return; // a package name (extends) or plain name
    if (!value.startsWith(".") && !glob && label === "extends") return; // package-style extends
    const abs = path.resolve(from, glob ? globBase(value) : value);
    if (!inside(dir, abs)) fail(file, `${label} "${value}" points outside the app folder`);
    else if (mustExist && !existsSync(abs)) fail(file, `${label} "${value}" does not exist`);
  };
  for (const e of [cfg.extends].flat()) check("extends", e, { mustExist: true });
  for (const key of ["include", "exclude", "files"]) for (const v of cfg[key] ?? []) check(key, v, { glob: true });
  for (const ref of cfg.references ?? []) check("references", ref.path, { mustExist: true });
  const co = cfg.compilerOptions ?? {};
  const pathsBase = co.baseUrl ? path.resolve(base, co.baseUrl) : base;
  for (const key of ["baseUrl", "rootDir", "outDir", "declarationDir", "tsBuildInfoFile"]) check(`compilerOptions.${key}`, co[key], { glob: true });
  for (const v of co.typeRoots ?? []) check("compilerOptions.typeRoots", v, { glob: true });
  for (const [alias, targets] of Object.entries(co.paths ?? {})) {
    for (const t of targets) check(`compilerOptions.paths["${alias}"]`, t, { glob: true, from: pathsBase });
  }
}

const PROJECT_VARS = /\$\{CLAUDE_PROJECT_DIR\}|\$CLAUDE_PROJECT_DIR|%CLAUDE_PROJECT_DIR%/g;

/** Tokens of a command line or args that name a file or folder. */
function pathTokens(values) {
  const out = [];
  for (const v of values) {
    if (typeof v !== "string") continue;
    for (const tok of v.match(/"[^"]*"|'[^']*'|\S+/g) ?? []) {
      const t = tok.replace(/^["']|["']$/g, "");
      if (!t || t.startsWith("-") || /^[a-z]+:\/\//i.test(t)) continue;
      if (t.startsWith("@") && !t.includes("/./")) continue; // npm package spec (@scope/name@x)
      if (/[\\/]/.test(t) || /^\$\{?CLAUDE_PROJECT_DIR/.test(t) || /\.(?:m?js|cjs|ts|json|sh|ps1)$/.test(t)) out.push(t);
    }
  }
  return out;
}

function checkCommandPaths(dir, file, label, values, fail, { mustExist = false } = {}) {
  for (const t of pathTokens(values)) {
    const p = t.replace(PROJECT_VARS, dir);
    const abs = path.isAbsolute(p) ? p : path.resolve(dir, p);
    if (!inside(dir, abs)) fail(file, `${label} "${t}" points outside the app folder`);
    else if (mustExist && !existsSync(abs)) fail(file, `${label} "${t}" does not exist`);
  }
}

function checkMcp(dir, fail) {
  const file = ".mcp.json";
  if (!existsSync(path.join(dir, file))) return;
  let cfg;
  try {
    cfg = readJson(path.join(dir, file));
  } catch (err) {
    fail(file, `cannot parse: ${err.message}`);
    return;
  }
  for (const [name, server] of Object.entries(cfg.mcpServers ?? {})) {
    checkCommandPaths(dir, file, `mcpServers.${name}`, [server.command, ...(server.args ?? [])], fail);
  }
}

function checkSettings(dir, fail) {
  const file = ".claude/settings.json";
  if (!existsSync(path.join(dir, file))) return;
  let cfg;
  try {
    cfg = readJson(path.join(dir, file));
  } catch (err) {
    fail(file, `cannot parse: ${err.message}`);
    return;
  }
  for (const [event, matchers] of Object.entries(cfg.hooks ?? {})) {
    for (const m of matchers ?? []) {
      for (const h of m.hooks ?? []) {
        if (h.type && h.type !== "command") continue;
        checkCommandPaths(dir, file, `hooks.${event}`, [h.command, ...(h.args ?? [])], fail, { mustExist: true });
      }
    }
  }
  if (cfg.statusLine?.command) checkCommandPaths(dir, file, "statusLine", [cfg.statusLine.command], fail, { mustExist: true });
  for (const kind of ["allow", "ask", "deny"]) {
    for (const rule of cfg.permissions?.[kind] ?? []) {
      if (/(?:^|[(\s/\\])\.\.[\\/]/.test(rule)) fail(file, `permissions.${kind} "${rule}" reaches outside the app folder`);
    }
  }
}

function checkPackage(dir, fail) {
  const file = "package.json";
  let pkg;
  try {
    pkg = readJson(path.join(dir, file));
  } catch (err) {
    fail(file, `missing or unreadable: ${err.message}`);
    return;
  }
  for (const field of DEP_FIELDS) {
    for (const [name, spec] of Object.entries(pkg[field] ?? {})) {
      if (!EXACT.test(spec)) fail(file, `${field}.${name} "${spec}" is not an exact version`);
    }
  }
  if (pkg.packageManager) fail(file, `packageManager "${pkg.packageManager}" is set (apps install with npm or pnpm alike)`);
  for (const [name, script] of Object.entries(pkg.scripts ?? {})) {
    checkCommandPaths(dir, file, `scripts.${name}`, [script], fail, { mustExist: true });
  }
  for (const problem of checkLock(dir)) fail("package-lock.json", problem);
}

function checkProject(dir, fail) {
  const file = "project.json";
  let project;
  try {
    project = readJson(path.join(dir, file));
  } catch (err) {
    fail(file, `missing or unreadable: ${err.message}`);
    return;
  }
  if (!Number.isInteger(project.port)) fail(file, "no numeric port");
  if (project.brief && !existsSync(path.join(dir, project.brief))) fail(file, `brief "${project.brief}" does not exist`);
  if (project.brief) checkCommandPaths(dir, file, "brief", [project.brief], fail);
}

function checkHtml(dir, fail) {
  const file = "index.html";
  if (!existsSync(path.join(dir, file))) return;
  const text = readFileSync(path.join(dir, file), "utf8");
  for (const m of text.matchAll(/\b(?:src|href)\s*=\s*["']([^"']+)["']/g)) {
    const ref = m[1].split(/[?#]/)[0];
    if (!ref || /^[a-z]+:/i.test(ref) || ref.startsWith("//")) continue;
    const candidates = ref.startsWith("/") ? [path.join(dir, ref), path.join(dir, "public", ref)] : [path.resolve(dir, ref)];
    const where = `${file}:${lineOf(text, m.index)}`;
    if (!candidates.every((c) => inside(dir, c))) fail(where, `"${m[1]}" points outside the app folder`);
    else if (!candidates.some((c) => existsSync(c))) fail(where, `"${m[1]}" does not exist`);
  }
}

/** All static checks for one app folder. Returns [{ where, message }]. */
export function staticCheck(dir) {
  const failures = [];
  const fail = (where, message) => failures.push({ where, message });
  const { files, links } = appFiles(dir);
  for (const l of links) fail(l, "is a symlink (does not survive copying the folder)");
  checkStrings(dir, files, fail);
  checkPackage(dir, fail);
  checkProject(dir, fail);
  for (const file of files) {
    if (JS_EXT.test(file) && !file.endsWith(".d.ts")) checkJs(dir, file, fail);
    else if (file.endsWith(".css")) checkCss(dir, file, fail);
    else if (/(?:^|\/)tsconfig[^/]*\.json$/.test(file)) checkTsconfig(dir, file, fail);
  }
  checkMcp(dir, fail);
  checkSettings(dir, fail);
  checkHtml(dir, fail);
  if (!existsSync(path.join(dir, "data", "fixtures")) || readdirSync(path.join(dir, "data", "fixtures")).length === 0) {
    fail("data/fixtures", "missing or empty: the app has no data of its own (run node scripts/sync-data.mjs)");
  }
  return failures;
}

// ---------------------------------------------------------------------------
// --install
// ---------------------------------------------------------------------------

function dirSize(dir) {
  let total = 0;
  const stack = [dir];
  while (stack.length) {
    const d = stack.pop();
    let entries = [];
    try {
      entries = readdirSync(d, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) stack.push(p);
      else if (e.isFile()) total += lstatSync(p).size;
    }
  }
  return total;
}

const mb = (bytes) => `${(bytes / 1024 / 1024).toFixed(0)} MB`;

function copyApp(src, dest) {
  cpSync(src, dest, {
    recursive: true,
    filter: (s) => {
      const r = path.relative(src, s).split(path.sep).join("/");
      if (!r) return true;
      const parts = r.split("/");
      if (["node_modules", "dist", ".vite", "coverage", ".playwright-mcp"].includes(parts[0])) return false;
      if (parts[0] === "models" && parts.length > 1 && r !== "models/.gitkeep") return false;
      return !r.endsWith(".tsbuildinfo");
    },
  });
}

function step(label, cwd, cmd, args, log, verbose) {
  const t = Date.now();
  appendFileSync(log, `\n\n===== ${label}: ${cmd} ${args.join(" ")}\n`);
  const options = { cwd, encoding: "utf8", windowsHide: true, env: { ...process.env, CI: "1", npm_config_update_notifier: "false" } };
  const r = verbose
    ? spawnSync(WIN ? [cmd, ...args].join(" ") : cmd, WIN ? [] : args, { ...options, stdio: "inherit", shell: WIN })
    : spawnSync(WIN ? [cmd, ...args].join(" ") : cmd, WIN ? [] : args, { ...options, shell: WIN, maxBuffer: 256 * 1024 * 1024 });
  if (!verbose) appendFileSync(log, `${r.stdout ?? ""}${r.stderr ?? ""}`);
  const ok = r.status === 0;
  const ms = Date.now() - t;
  console.log(`  ${ok ? "ok  " : "FAIL"}  ${label.padEnd(26)} ${seconds(ms).padStart(8)}`);
  if (!ok && !verbose) {
    const tail = `${r.stdout ?? ""}${r.stderr ?? ""}`.trim().split("\n").slice(-30);
    for (const line of tail) console.log(`        | ${line}`);
    if (r.error) console.log(`        | ${r.error.message}`);
  }
  return { ok, ms };
}

function installCheck(root, row, { keep, verbose }) {
  const src = appDir(root, row);
  const base = mkdtempSync(path.join(os.tmpdir(), `rcene-standalone-${row.slug}-`));
  const dest = path.join(base, row.slug);
  if (inside(root, base)) throw new Error(`temp folder ${base} is inside the repo; set TMPDIR elsewhere`);
  const log = path.join(base, "steps.log");
  writeFileSync(log, `standalone install check of ${row.slug}\n`);
  console.log(`\n=== ${row.slug}: install check in ${dest}`);
  const t0 = Date.now();
  copyApp(src, dest);
  const results = [];
  const run = (label, args, cmd = "npm") => {
    const r = step(label, dest, cmd, args, log, verbose);
    results.push({ label, ...r });
    return r.ok;
  };
  let ok = run("npm ci", ["ci", "--no-audit", "--no-fund"]);
  let size = 0;
  if (ok) {
    size = dirSize(path.join(dest, "node_modules"));
    console.log(`        node_modules: ${mb(size)}`);
    ok = run("npm run typecheck", ["run", "typecheck"]) && ok;
    ok = run("npm test", ["test"]) && ok;
    const built = run("npm run build", ["run", "build"]);
    ok = built && ok;
    if (built) ok = run("npm run smoke -- --no-build", ["run", "smoke", "--", "--no-build"]) && ok;
    rmSync(path.join(dest, "node_modules"), { recursive: true, force: true });
    ok = run("npm ci --offline", ["ci", "--offline", "--no-audit", "--no-fund"]) && ok;
  }
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${row.slug} in ${seconds(Date.now() - t0)}${size ? `, node_modules ${mb(size)}` : ""}`);
  if (keep || !ok) console.log(`        kept: ${dest} (log: ${log})`);
  if (!keep && ok) rmSync(base, { recursive: true, force: true });
  return { ok, results, size };
}

// ---------------------------------------------------------------------------

function main() {
  const argv = process.argv.slice(2);
  // --install takes the slugs that follow it; everything else is a static-check target.
  const installKeys = [];
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--install") {
      while (argv[i + 1] && !argv[i + 1].startsWith("--")) installKeys.push(argv[++i]);
      if (installKeys.length === 0) {
        console.error(`--install needs at least one app\n${USAGE}`);
        process.exit(2);
      }
    } else rest.push(argv[i]);
  }
  const { values, positionals } = cli(
    rest,
    { all: { type: "boolean" }, keep: { type: "boolean" }, verbose: { type: "boolean" }, root: { type: "string" } },
    USAGE,
  );
  const root = path.resolve(values.root ?? ROOT);
  let targets;
  let installs;
  try {
    targets = resolveTargets(root, positionals, { all: values.all, withTemplate: true });
    installs = resolveTargets(root, installKeys);
  } catch (err) {
    console.error(err.message);
    process.exit(2);
  }
  for (const row of installs) if (!targets.some((t) => t.slug === row.slug)) targets.push(row);
  if (targets.length === 0) {
    console.error(USAGE);
    process.exit(2);
  }

  let failed = 0;
  let checked = 0;
  console.log("Static checks");
  for (const row of targets) {
    const dir = appDir(root, row);
    if (!existsSync(dir)) {
      if (!values.all) {
        failed++;
        console.log(`FAIL  ${row.slug}: no folder`);
      }
      continue;
    }
    checked++;
    const failures = staticCheck(dir);
    if (failures.length) failed++;
    console.log(`${failures.length ? "FAIL" : "ok  "}  ${row.slug}${failures.length ? ` (${failures.length})` : ""}`);
    for (const f of failures.slice(0, 40)) console.log(`        ${f.where}  ${f.message}`);
    if (failures.length > 40) console.log(`        ... ${failures.length - 40} more`);
  }
  console.log(`\n${checked - failed} of ${checked} folder(s) pass the static checks.`);

  for (const row of installs) {
    if (!existsSync(appDir(root, row))) continue;
    const r = installCheck(root, row, values);
    if (!r.ok) failed++;
  }
  if (failed) process.exit(1);
}

if (isMain(import.meta.url)) main();
