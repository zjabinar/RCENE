#!/usr/bin/env node
/**
 * PreToolUse guard for sessions at the REPO ROOT (wired in the root
 * .claude/settings.json). Root sessions are the orchestrator (main) and the
 * data session (proj/00-data). App sessions start inside apps/<slug> of their
 * worktree and are guarded by that folder's own hooks (apps/<slug>/scripts/hooks),
 * not by this file.
 *
 * Reads the hook input JSON from stdin ({ tool_name, tool_input, cwd }).
 * To block, it prints a reason to stderr and exits 2; Claude sees the reason.
 * Anything else exits 0 and the normal permission flow continues.
 *
 * Rules, in order:
 *   1. Always: no path or command may touch D:\monica (another person's
 *      project) or C:\lgu_portal (holds credentials). D:\lgu_portal - GIS is
 *      allowed: it is the GIS archive the data session converts. This rule is
 *      plain string matching and runs first; it is the only rule that fails
 *      closed.
 *   2. Always: no reading or editing credential files (.env, .env.* except
 *      .env.example, *service-account*.json, gemini_api_key.txt, *.pem).
 *   3. Only on proj/<slug> branches (one worktree per project):
 *      - Edit/Write/MultiEdit/NotebookEdit targets must match the project's
 *        writeScope globs from docs/projects/projects.json (00-data: data/**
 *        and scripts/data/**; an app row: apps/<slug>/**).
 *      - Bash/PowerShell may not push, merge, rebase, reset --hard, manage
 *        worktrees, leave or delete branches, or cherry-pick.
 *      - Dependency changes only for the project's own app:
 *        `pnpm --filter @rcene/<slug> add <pkg>` is fine, `pnpm add -w` is not;
 *        the data session has no app, so it may not change dependencies at all.
 *
 * Rules 2 and 3 fail open: an internal error exits 0.
 *
 * Manual check:
 *   echo '{"tool_name":"Read","tool_input":{"file_path":"D:\\monica\\x"}}' | node scripts/hooks/guard.mjs
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const BLOCK = 2;

// ---------------------------------------------------------------------------
// Rule 1: forbidden locations (plain string checks, evaluated first)
// ---------------------------------------------------------------------------

/** Lowercase, forward slashes, no duplicate slashes. */
function flatten(text) {
  return String(text).toLowerCase().replace(/\\/g, "/").replace(/\/{2,}/g, "/");
}

// A drive prefix written any common way: "d:", "/d", "/mnt/d", "/cygdrive/d".
// The folder name must end at a separator, quote, space or end of string, so
// "D:\monica" and "D:\monica - copy" are blocked but "D:\monica2" is not.
const FORBIDDEN = [
  {
    re: /(?:^|[^a-z0-9])(?:d:|\/mnt\/d|\/cygdrive\/d|\/d)\/monica(?=$|[^a-z0-9_])/,
    label: "D:\\monica",
    why: "D:\\monica is another person's dissertation project and is off limits. Do not read, list or copy anything from it.",
  },
  {
    re: /(?:^|[^a-z0-9])(?:c:|\/mnt\/c|\/cygdrive\/c|\/c)\/lgu_portal(?=$|[^a-z0-9_])/,
    label: "C:\\lgu_portal",
    why: "C:\\lgu_portal holds credential files and is off limits. The GIS archive you may use is D:\\lgu_portal - GIS.",
  },
];

/** The tool_input fields that can name a location. */
const PATH_FIELDS = ["file_path", "path", "notebook_path", "pattern", "glob", "command"];

function inputStrings(toolInput) {
  if (!toolInput || typeof toolInput !== "object") return [];
  const out = [];
  for (const key of PATH_FIELDS) {
    if (typeof toolInput[key] === "string") out.push(toolInput[key]);
  }
  return out;
}

function forbiddenReason(strings) {
  for (const s of strings) {
    const flat = flatten(s);
    for (const rule of FORBIDDEN) {
      if (rule.re.test(flat)) return `Blocked: this touches ${rule.label}. ${rule.why}`;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Rule 2: credential files
// ---------------------------------------------------------------------------

function baseName(p) {
  const parts = String(p).split(/[\\/]/);
  return parts[parts.length - 1] ?? "";
}

/** True when a file name (or a glob for one) names a credential file. */
function isCredentialName(name) {
  const n = String(name).toLowerCase().replace(/^["']|["']$/g, "");
  if (!n) return false;
  if (n === ".env.example") return false;
  if (n === ".env" || n.startsWith(".env.") || n.startsWith(".env*")) return true;
  if (n.endsWith(".pem")) return true;
  if (n === "gemini_api_key.txt") return true;
  if (/service-account.*\.json$/.test(n)) return true;
  return false;
}

/** Splits a shell command into word-ish tokens (good enough for file names). */
function words(command) {
  return String(command)
    .split(/[\s"'`;|&()<>=,]+/)
    .filter(Boolean);
}

function credentialReason(toolName, toolInput) {
  if (!toolInput || typeof toolInput !== "object") return null;
  const candidates = [];
  for (const key of ["file_path", "path", "notebook_path"]) {
    if (typeof toolInput[key] === "string") candidates.push(baseName(toolInput[key]));
  }
  // Glob's pattern names files; Grep's pattern is a content regex, so only its glob counts.
  if (toolName === "Glob" && typeof toolInput.pattern === "string") candidates.push(baseName(toolInput.pattern));
  if (typeof toolInput.glob === "string") candidates.push(baseName(toolInput.glob));
  if ((toolName === "Bash" || toolName === "PowerShell") && typeof toolInput.command === "string") {
    for (const w of words(toolInput.command)) candidates.push(baseName(w));
  }
  const hit = candidates.find(isCredentialName);
  if (!hit) return null;
  return (
    `Blocked: "${hit}" is a credential file (.env, .env.*, *service-account*.json, gemini_api_key.txt, *.pem). ` +
    "Never read, print or edit secrets. If the app needs configuration, document it in .env.example or NOTES.md instead."
  );
}

// ---------------------------------------------------------------------------
// Rule 3: project branches
// ---------------------------------------------------------------------------

function git(cwd, args) {
  return execFileSync("git", ["-C", cwd, ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
    timeout: 5000,
    windowsHide: true,
  }).trim();
}

/** { root, branch } for the checkout containing cwd, or null outside git. */
function checkoutInfo(cwd) {
  try {
    const [root, branch] = git(cwd, ["rev-parse", "--show-toplevel", "--abbrev-ref", "HEAD"]).split(/\r?\n/);
    return root && branch ? { root, branch } : null;
  } catch {
    return null;
  }
}

function loadManifest(root) {
  const file = path.join(root, "docs", "projects", "projects.json");
  if (!existsSync(file)) return null;
  return JSON.parse(readFileSync(file, "utf8"));
}

function projectForBranch(manifest, branch) {
  if (!manifest || !Array.isArray(manifest.projects) || !branch.startsWith("proj/")) return null;
  return (
    manifest.projects.find((p) => p.branch === branch) ??
    manifest.projects.find((p) => p.slug === branch.slice("proj/".length)) ??
    null
  );
}

const WIN = process.platform === "win32";

/** Forward slashes, lowercase drive letter, Git Bash /c/... to c:/..., no trailing slash. */
function normalizePath(p, { windows = WIN } = {}) {
  let s = String(p).replace(/\\/g, "/");
  if (windows) {
    const gitBash = /^\/([a-zA-Z])(\/|$)/.exec(s);
    if (gitBash) s = `${gitBash[1]}:/${s.slice(3)}`;
  }
  s = s.replace(/^([a-zA-Z]):/, (_, d) => `${d.toLowerCase()}:`);
  s = path.posix.normalize(s);
  if (s.length > 1 && s.endsWith("/") && !/^[a-z]:\/$/.test(s)) s = s.slice(0, -1);
  return s;
}

/** Resolves junctions and symlinks on the nearest existing ancestor of a normalized path. */
function realish(p) {
  const rest = [];
  let cur = p;
  for (;;) {
    try {
      return normalizePath(path.join(realpathSync.native(cur), ...rest.reverse()));
    } catch {
      const parent = path.posix.dirname(cur);
      if (parent === cur) return null;
      rest.push(path.posix.basename(cur));
      cur = parent;
    }
  }
}

/** Path relative to the worktree root, tolerating junctions; null when outside. */
function repoRelative(root, abs) {
  const direct = relativeTo(root, abs);
  if (direct !== null) return direct;
  const realRoot = realish(root);
  const realAbs = realish(abs);
  return realRoot && realAbs ? relativeTo(realRoot, realAbs) : null;
}

function isAbsoluteAny(p) {
  return p.startsWith("/") || /^[a-z]:\//i.test(p);
}

/** Path of `target` relative to `root`, or null when it lies outside. Both normalized. */
function relativeTo(root, target, { windows = WIN } = {}) {
  const r = windows ? root.toLowerCase() : root;
  const t = windows ? target.toLowerCase() : target;
  if (t === r) return "";
  const prefix = r.endsWith("/") ? r : `${r}/`;
  if (!t.startsWith(prefix)) return null;
  return target.slice(prefix.length);
}

/** Minimal glob: `**` spans directories, `*` and `?` stay within one segment. */
function globToRegExp(glob, { ignoreCase = WIN } = {}) {
  let re = "";
  const g = String(glob).replace(/\\/g, "/").replace(/^\.\//, "");
  for (let i = 0; i < g.length; i++) {
    const c = g[i];
    if (c === "*") {
      if (g[i + 1] === "*") {
        const atStart = i === 0 || g[i - 1] === "/";
        const slashAfter = g[i + 2] === "/";
        if (atStart && slashAfter) {
          re += "(?:.*/)?"; // "**/" matches zero or more directories
          i += 2;
        } else if (atStart && i + 2 === g.length && i > 0) {
          re = re.slice(0, -1) + "(?:/.*)?"; // "dir/**" also matches "dir" itself
          i += 1;
        } else {
          re += ".*";
          i += 1;
        }
      } else re += "[^/]*";
    } else if (c === "?") re += "[^/]";
    else re += c.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^${re}$`, ignoreCase ? "i" : "");
}

function inScope(relPath, globs, opts) {
  return globs.some((g) => globToRegExp(g, opts).test(relPath));
}

function notesFile(row) {
  if (row.app) return `${row.app}/NOTES.md`;
  if (row.kind === "data") return "data/README.md";
  const readme = (row.writeScope ?? []).find((g) => !/[*?]/.test(g) && g.endsWith(".md"));
  return readme ?? "your notes";
}

function scopeText(row) {
  return (row.writeScope ?? []).join(", ");
}

/** Places outside the repo a session may still write: Claude's own files and the temp dir. */
function outsideRepoAllowed(target) {
  const roots = [path.join(os.homedir(), ".claude"), os.tmpdir()].map((p) => normalizePath(p));
  return roots.some((r) => relativeTo(r, target) !== null);
}

function editReason(toolInput, ctx) {
  const raw = toolInput.file_path ?? toolInput.notebook_path;
  if (typeof raw !== "string" || !raw) return null;
  const abs = isAbsoluteAny(normalizePath(raw)) ? normalizePath(raw) : normalizePath(path.resolve(ctx.cwd, raw));
  const rel = repoRelative(ctx.root, abs);
  const { row } = ctx;
  if (rel === null) {
    if (outsideRepoAllowed(abs)) return null;
    return (
      `Blocked: ${raw} is outside this worktree. This session (${row.slug}) may only edit ${scopeText(row)}. ` +
      `Put requests for anything else in ${notesFile(row)}.`
    );
  }
  if (inScope(rel, row.writeScope ?? [])) return null;
  return (
    `Blocked: ${rel} is outside this session's write scope. This session may only edit ${scopeText(row)}. ` +
    `Put requests for anything else (the shared code in apps/_template, tooling, docs) in ${notesFile(row)}; the orchestrator applies them on main.`
  );
}

/** Splits a command line into simple commands on ; && || | & and newlines. */
function segments(command) {
  return String(command)
    .split(/\r?\n|&&|\|\||[;|&]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Shell-ish tokenizer that honours single and double quotes. */
function tokenize(segment) {
  const out = [];
  const re = /"((?:[^"\\]|\\.)*)"|'([^']*)'|(\S+)/g;
  let m;
  while ((m = re.exec(segment))) out.push(m[1] ?? m[2] ?? m[3]);
  return out;
}

function isProgram(token, name) {
  const b = baseName(token).toLowerCase().replace(/\.(exe|cmd|bat|ps1)$/, "");
  return b === name;
}

// git global options that take a separate value.
const GIT_OPTS_WITH_VALUE = new Set(["-C", "-c", "--git-dir", "--work-tree", "--namespace", "--exec-path"]);

function parseGit(tokens, start) {
  let i = start + 1;
  while (i < tokens.length && tokens[i].startsWith("-")) {
    if (GIT_OPTS_WITH_VALUE.has(tokens[i])) i += 2;
    else i += 1;
  }
  return { sub: tokens[i], args: tokens.slice(i + 1) };
}

function gitReason(sub, args, row) {
  const own = row.branch;
  const fix = `Commit on ${own} and leave integration to the orchestrator (main checkout).`;
  const plain = args.filter((a) => !a.startsWith("-"));
  switch (sub) {
    case "push":
    case "merge":
    case "rebase":
    case "cherry-pick":
      return `Blocked: git ${sub} is not allowed in a project session. ${fix}`;
    case "worktree":
      return `Blocked: git worktree is managed by scripts/launch-worktrees.ps1, not by project sessions. ${fix}`;
    case "reset":
      if (args.includes("--hard")) {
        return "Blocked: git reset --hard can destroy work. Use git restore <file> or git revert, or stop and write the problem in STATUS.md.";
      }
      return null;
    case "branch":
      if (
        args.some(
          (a) =>
            /^-[a-zA-Z]*[dDmMcCf]/.test(a) ||
            ["--delete", "--move", "--copy", "--force", "--set-upstream-to", "--unset-upstream"].includes(a.split("=")[0]),
        )
      ) {
        return `Blocked: deleting or renaming branches is not allowed in a project session. Stay on ${own}.`;
      }
      return null;
    case "checkout":
    case "switch": {
      // Allowed: restoring files (`git checkout -- <paths>`) or naming the own branch.
      // Anything else (a sha, HEAD~0, another branch, -b/--detach) would move HEAD off
      // the project branch, and a detached HEAD turns these project rules off.
      const restoresFiles = sub === "checkout" && args.includes("--");
      const staysOnOwn = plain.length === 1 && plain[0] === own && !args.some((a) => a.startsWith("-"));
      if (!restoresFiles && !staysOnOwn) {
        return `Blocked: this session must stay on ${own}. Use git restore <file> to discard changes; switching or creating branches is the orchestrator's job.`;
      }
      return null;
    }
    default:
      return null;
  }
}

const PNPM_OPTS_WITH_VALUE = new Set(["--filter", "-F", "-C", "--dir", "--reporter", "--loglevel", "--workspace-concurrency", "--store-dir"]);
const PNPM_DEP_COMMANDS = new Set(["add", "remove", "rm", "uninstall", "un", "update", "up", "upgrade", "link", "unlink"]);

function parsePnpm(tokens, start) {
  const filters = [];
  let dir = null;
  let workspaceRoot = false;
  let recursive = false;
  let sub;
  const subArgs = [];
  for (let i = start + 1; i < tokens.length; i++) {
    const t = tokens[i];
    if (sub === undefined) {
      if (t === "--filter" || t === "-F") {
        filters.push(tokens[++i] ?? "");
        continue;
      }
      if (t.startsWith("--filter=")) {
        filters.push(t.slice("--filter=".length));
        continue;
      }
      if (t === "-C" || t === "--dir") {
        dir = tokens[++i] ?? null;
        continue;
      }
      if (t.startsWith("--dir=")) {
        dir = t.slice("--dir=".length);
        continue;
      }
      if (t === "-w" || t === "--workspace-root") workspaceRoot = true;
      if (t === "-r" || t === "--recursive") recursive = true;
      if (t.startsWith("-")) {
        if (PNPM_OPTS_WITH_VALUE.has(t)) i++;
        continue;
      }
      sub = t;
      continue;
    }
    if (t === "-w" || t === "--workspace-root") workspaceRoot = true;
    if (t === "-r" || t === "--recursive") recursive = true;
    if (t === "--filter" || t === "-F") {
      filters.push(tokens[++i] ?? "");
      continue;
    }
    if (t.startsWith("--filter=")) {
      filters.push(t.slice("--filter=".length));
      continue;
    }
    if (t === "-C" || t === "--dir") {
      dir = tokens[++i] ?? null;
      continue;
    }
    if (t.startsWith("--dir=")) {
      dir = t.slice("--dir=".length);
      continue;
    }
    subArgs.push(t);
  }
  return { sub, subArgs, filters, dir, workspaceRoot, recursive };
}

function ownFilter(filter, row, pkgName) {
  const f = filter.replace(/^\{|\}$/g, "").replace(/\\/g, "/").replace(/^\.\//, "").replace(/\/$/, "");
  return f === pkgName || f === row.app || f === row.slug;
}

function pnpmReason(parsed, ctx, effectiveCwd) {
  const { row } = ctx;
  const { sub, subArgs, filters, dir, workspaceRoot, recursive } = parsed;
  if (!sub) return null;
  const installsPackages = (sub === "install" || sub === "i") && subArgs.some((a) => !a.startsWith("-"));
  if (!PNPM_DEP_COMMANDS.has(sub) && !installsPackages) return null;

  const pkgName = readPackageName(ctx.root, row);
  const allowed = (() => {
    if (!row.app || !pkgName) return false;
    if (workspaceRoot || recursive) return false;
    if (filters.length > 0) return filters.every((f) => ownFilter(f, row, pkgName));
    const where = dir ? normalizePath(path.resolve(effectiveCwd, dir)) : normalizePath(effectiveCwd);
    const rel = repoRelative(ctx.root, where);
    return rel !== null && inScope(rel, [`${row.app}/**`]);
  })();
  if (allowed) return null;
  const example = pkgName ? ` Use: pnpm --filter ${pkgName} add <pkg>.` : "";
  return (
    `Blocked: pnpm ${sub} here would change dependencies outside ${scopeText(row)}.${example} ` +
    `Requests for root or template dependencies go in ${notesFile(row)}.`
  );
}

const NPM_DEP_VERBS = new Set(["add", "uninstall", "remove", "rm", "un", "update", "up", "link", "install", "i", "in", "isntall", "ci"]);

function npmReason(tokens, start, ctx) {
  // Any dependency verb anywhere: this is a pnpm workspace, so even a bare `npm install`
  // is wrong, and option values (e.g. --prefix <dir>) can't hide the verb.
  const changesDeps = tokens.slice(start + 1).some((t) => NPM_DEP_VERBS.has(t));
  if (!changesDeps) return null;
  const pkgName = readPackageName(ctx.root, ctx.row);
  const example = pkgName ? `pnpm --filter ${pkgName} add <pkg>` : "nothing: record the request";
  return `Blocked: at the repo root this is a pnpm workspace; npm/yarn would break pnpm-lock.yaml. Use ${example} (or note it in ${notesFile(ctx.row)}).`;
}

const packageNames = new Map();
function readPackageName(root, row) {
  if (!row.app) return null;
  if (packageNames.has(row.app)) return packageNames.get(row.app);
  let name = null;
  try {
    name = JSON.parse(readFileSync(path.join(root, row.app, "package.json"), "utf8")).name ?? null;
  } catch {
    name = `@rcene/${row.slug}`;
  }
  packageNames.set(row.app, name);
  return name;
}

function commandReason(command, ctx) {
  let cwd = ctx.cwd;
  for (const segment of segments(command)) {
    const tokens = tokenize(segment);
    if (tokens.length === 0) continue;
    // Track `cd dir` / `Set-Location dir` so `cd apps/x && pnpm add y` resolves correctly.
    if ((isProgram(tokens[0], "cd") || isProgram(tokens[0], "set-location") || isProgram(tokens[0], "pushd")) && tokens[1]) {
      const target = normalizePath(tokens[1]); // also maps Git Bash /c/... to c:/... on Windows
      cwd = isAbsoluteAny(target) ? target : path.resolve(cwd, tokens[1]);
      continue;
    }
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i];
      let reason = null;
      if (isProgram(t, "git")) {
        const { sub, args } = parseGit(tokens, i);
        if (sub) reason = gitReason(sub, args, ctx.row);
      } else if (isProgram(t, "pnpm")) {
        reason = pnpmReason(parsePnpm(tokens, i), ctx, cwd);
      } else if (isProgram(t, "npm") || isProgram(t, "yarn")) {
        reason = npmReason(tokens, i, ctx);
      } else continue;
      if (reason) return reason;
      break; // one program per simple command
    }
  }
  return null;
}

function projectReason(toolName, toolInput, hookCwd) {
  const editTools = new Set(["Edit", "Write", "MultiEdit", "NotebookEdit"]);
  const shellTools = new Set(["Bash", "PowerShell"]);
  if (!editTools.has(toolName) && !shellTools.has(toolName)) return null;

  const cwd = hookCwd || process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const info = checkoutInfo(cwd);
  if (!info || !info.branch.startsWith("proj/")) return null;
  const row = projectForBranch(loadManifest(info.root), info.branch);
  if (!row) return null;
  const ctx = { row, root: normalizePath(info.root), cwd };

  if (editTools.has(toolName)) return editReason(toolInput, ctx);
  if (typeof toolInput.command === "string") return commandReason(toolInput.command, ctx);
  return null;
}

// ---------------------------------------------------------------------------

function readStdin() {
  return new Promise((resolve) => {
    if (process.stdin.isTTY) return resolve("");
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => (data += chunk));
    process.stdin.on("end", () => resolve(data));
    process.stdin.on("error", () => resolve(data));
  });
}

async function main() {
  const raw = await readStdin();
  let input = null;
  try {
    input = JSON.parse(raw);
  } catch {
    input = null;
  }

  // Rule 1 first, failing closed: if the input can't be parsed, scan the raw text.
  const strings = input ? inputStrings(input.tool_input) : [raw.replace(/\\\\/g, "\\")];
  const forbidden = forbiddenReason(strings);
  if (forbidden) return forbidden;
  if (!input) return null;

  try {
    const toolName = String(input.tool_name ?? "");
    const toolInput = input.tool_input && typeof input.tool_input === "object" ? input.tool_input : {};
    return (
      credentialReason(toolName, toolInput) ??
      projectReason(toolName, toolInput, typeof input.cwd === "string" ? input.cwd : "")
    );
  } catch {
    return null; // fail open: a bug in the guard must not stall an unattended session
  }
}

// Exit codes are set rather than forced with process.exit() so stderr is fully
// flushed first (pipes can be asynchronous on Windows).
main().then(
  (reason) => {
    if (reason) {
      process.stderr.write(`${reason}\n`);
      process.exitCode = BLOCK;
    }
  },
  () => {
    process.exitCode = 0;
  },
);
