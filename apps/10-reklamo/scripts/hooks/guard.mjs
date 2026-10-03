#!/usr/bin/env node
/**
 * PreToolUse guard for this app's Claude Code sessions (wired in .claude/settings.json).
 *
 * The app root is the folder two levels above this file, never CLAUDE_PROJECT_DIR,
 * so the guard protects the folder it ships in wherever that folder is copied.
 *
 * Reads the hook input JSON from stdin ({ tool_name, tool_input, cwd, scratchpad_dir? }).
 * To block, it prints a reason to stderr and exits 2; Claude sees the reason.
 * Anything else exits 0 and the normal permission flow continues.
 *
 * Modes (from git, looked up from the app root):
 *   project   the current branch starts with proj/ (one worktree per project)
 *   monorepo  the git top level holds pnpm-workspace.yaml and is not the app root
 *   free      anything else: no git, main, entry/*, a standalone copy
 *
 * Rules:
 *   always    no path or command may touch D:\monica or C:\lgu_portal (all spellings;
 *             D:\lgu_portal - GIS is allowed). ./ and ../ are collapsed and relative paths
 *             resolved against the cwd and any earlier cd. Evaluated first, and the
 *             only rule that fails closed.
 *   always    no reading or editing credential files (.env, .env.* except .env.example,
 *             *service-account*.json, gemini_api_key.txt, *.pem).
 *   always    Edit/Write/MultiEdit/NotebookEdit only inside the app root, ~/.claude,
 *             the session scratchpad or the OS temp dir (never another part of the
 *             repository that contains the app); never under node_modules/ or dist/.
 *   project   edits only while the checkout is on project.json "branch"; no edits to
 *             data/**, docs/brief.md and docs/modules/** (synced from the repo), scripts/hooks/** or
 *             .claude/settings{,.local}.json (this guard and its wiring).
 *   project + monorepo
 *             no edits to ~/.claude/settings{,.local}.json (they can disable hooks).
 *   project   no git push, pull, merge, rebase, cherry-pick, am, worktree, reset --hard,
 *             branch delete/rename/copy/force, or checkout/switch off the branch.
 *   project + monorepo
 *             dependency changes only for this app: pnpm add/remove inside the app
 *             (or --filter this package), never -w/-r; npm only with
 *             --package-lock-only or read-only verbs (npm would break pnpm's
 *             node_modules); no yarn/bun installs.
 *   free      npm install/ci/add and git push are fine.
 *
 * Everything after the forbidden-path rule fails open: an internal error exits 0.
 *
 * Manual check:
 *   echo '{"tool_name":"Bash","tool_input":{"command":"git push"}}' | node scripts/hooks/guard.mjs
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BLOCK = 2;
const WIN = process.platform === "win32";
const APP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

// ---------------------------------------------------------------------------
// Always: forbidden locations (plain string checks, evaluated first)
// ---------------------------------------------------------------------------

/** Lowercase, forward slashes, no duplicate slashes. */
function flatten(text) {
  return String(text).toLowerCase().replace(/\\/g, "/").replace(/\/{2,}/g, "/");
}

// A drive prefix written any common way: "d:", "/d", "/mnt/d", "/cygdrive/d", or the
// Windows admin share ("\\host\d$\...").
// The folder name must end at a separator, quote, space or end of string, so
// "D:\monica" and "D:\monica - copy" are blocked but "D:\monica2" is not.
const FORBIDDEN = [
  {
    re: /(?:^|[^a-z0-9])(?:d:|d\$|\/mnt\/d|\/cygdrive\/d|\/d)\/monica(?=$|[^a-z0-9_])/,
    label: "D:\\monica",
    why: "D:\\monica is another person's dissertation project and is off limits. Do not read, list or copy anything from it.",
  },
  {
    re: /(?:^|[^a-z0-9])(?:c:|c\$|\/mnt\/c|\/cygdrive\/c|\/c)\/lgu_portal(?=$|[^a-z0-9_])/,
    label: "C:\\lgu_portal",
    why: "C:\\lgu_portal holds credential files and is off limits. The GIS archive you may use is D:\\lgu_portal - GIS.",
  },
];

/** The tool_input fields that can name a location (never file contents). */
const PATH_FIELDS = ["file_path", "path", "notebook_path", "pattern", "glob", "command"];

function inputStrings(toolInput) {
  if (!toolInput || typeof toolInput !== "object") return [];
  return PATH_FIELDS.filter((key) => typeof toolInput[key] === "string").map((key) => toolInput[key]);
}

/** Leading subshell/group openers and trailing closers: "(cd" -> "cd", "zod)" -> "zod". */
function bare(token) {
  return String(token).replace(/^[({]+/, "").replace(/[)}]+$/, "");
}

function isCd(token) {
  return ["cd", "set-location", "sl", "chdir", "pushd", "push-location"].some((name) => isProgram(token, name));
}

/**
 * Every spelling of the locations an input names, for the forbidden-location rule: the raw
 * fields; each path with ./ and ../ collapsed; each path resolved against the working
 * directory (in shell commands, the directory after any earlier cd / Set-Location); and the
 * working directory itself. If this throws, the raw fields are still checked.
 */
function forbiddenCandidates(input) {
  const toolInput = input.tool_input && typeof input.tool_input === "object" ? input.tool_input : {};
  const out = inputStrings(toolInput);
  try {
    const cwd = typeof input.cwd === "string" && input.cwd ? input.cwd : null;
    if (cwd) out.push(cwd);
    const variants = (token, base) => {
      const t = String(token);
      out.push(path.posix.normalize(flatten(t)));
      if (base && t && !t.startsWith("-")) out.push(resolveDir(base, t));
    };
    for (const key of ["file_path", "path", "notebook_path", "pattern", "glob"]) {
      if (typeof toolInput[key] !== "string") continue;
      variants(toolInput[key], cwd);
      if ((key === "pattern" || key === "glob") && typeof toolInput.path === "string") {
        variants(toolInput[key], cwd ? resolveDir(cwd, toolInput.path) : toolInput.path);
      }
    }
    if (typeof toolInput.command === "string") {
      let dir = cwd;
      for (const segment of segments(toolInput.command)) {
        const tokens = tokenize(segment).map(bare).filter(Boolean);
        if (tokens.length === 0) continue;
        if (isCd(tokens[0]) && tokens[1]) {
          if (dir) dir = resolveDir(dir, tokens[1]);
          variants(tokens[1], dir);
          continue;
        }
        for (const t of tokens) variants(t, dir);
      }
    }
  } catch {
    // the raw fields above are still checked
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
// Always: credential files
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

/**
 * The words of a shell command that may name files. A git commit/tag message (-m "...",
 * --message=...) only mentions names, so "chore: ignore .env files" is not a file access.
 */
function shellFileWords(command) {
  const out = [];
  for (const segment of segments(command)) {
    const tokens = tokenize(segment);
    const isGit = tokens.some((t) => isProgram(bare(t), "git"));
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i];
      if (isGit && (t === "--message" || /^-[a-zA-Z]*m$/.test(t))) {
        i++; // skip the message
        continue;
      }
      if (isGit && t.startsWith("--message=")) continue;
      out.push(...words(t));
    }
  }
  return out;
}

function credentialReason(toolName, toolInput) {
  const candidates = [];
  for (const key of ["file_path", "path", "notebook_path"]) {
    if (typeof toolInput[key] === "string") candidates.push(baseName(toolInput[key]));
  }
  // Glob's pattern names files; Grep's pattern is a content regex, so only its glob counts.
  if (toolName === "Glob" && typeof toolInput.pattern === "string") candidates.push(baseName(toolInput.pattern));
  if (typeof toolInput.glob === "string") candidates.push(baseName(toolInput.glob));
  if ((toolName === "Bash" || toolName === "PowerShell") && typeof toolInput.command === "string") {
    for (const w of shellFileWords(toolInput.command)) candidates.push(baseName(w));
  }
  const hit = candidates.find(isCredentialName);
  if (!hit) return null;
  return (
    `Blocked: "${hit}" is a credential file (.env, .env.*, *service-account*.json, gemini_api_key.txt, *.pem). ` +
    "Never read, print or edit secrets. If the app needs configuration, document it in .env.example or NOTES.md instead."
  );
}

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

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

function isAbsoluteAny(p) {
  return p.startsWith("/") || /^[a-z]:\//i.test(p);
}

/** Absolute, normalized form of a path the tool named (relative paths resolve against cwd). */
function toAbs(raw, cwd) {
  let s = String(raw);
  if (s === "~" || s.startsWith("~/") || s.startsWith("~\\")) s = path.join(os.homedir(), s.slice(1));
  const n = normalizePath(s);
  return isAbsoluteAny(n) ? n : normalizePath(path.resolve(cwd, s));
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

/** Path of `target` relative to `root`, or null when it lies outside. Both normalized. */
function relativeTo(root, target, { windows = WIN } = {}) {
  const r = windows ? root.toLowerCase() : root;
  const t = windows ? target.toLowerCase() : target;
  if (t === r) return "";
  const prefix = r.endsWith("/") ? r : `${r}/`;
  if (!t.startsWith(prefix)) return null;
  return target.slice(prefix.length);
}

/** Like relativeTo, but tolerates symlinks and junctions (e.g. /tmp vs /private/tmp). */
function within(root, abs) {
  if (!root) return null;
  const direct = relativeTo(root, abs);
  if (direct !== null) return direct;
  const realRoot = realish(root);
  const realAbs = realish(abs);
  return realRoot && realAbs ? relativeTo(realRoot, realAbs) : null;
}

// ---------------------------------------------------------------------------
// Context: the app, its project.json and the git checkout around it
// ---------------------------------------------------------------------------

function readJson(file) {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function git(cwd, args) {
  try {
    return execFileSync("git", ["-C", cwd, ...args], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 5000,
      windowsHide: true,
    }).trim();
  } catch {
    return null;
  }
}

let cachedContext = null;

/** Mode, branch and paths for this app. Computed once, lazily (Read/Grep calls never need git). */
function appContext(input) {
  if (cachedContext) return cachedContext;
  const project = readJson(path.join(APP_ROOT, "project.json")) ?? {};
  const pkg = readJson(path.join(APP_ROOT, "package.json")) ?? {};
  const appRoot = normalizePath(APP_ROOT);
  const topRaw = git(APP_ROOT, ["rev-parse", "--show-toplevel"]);
  const top = topRaw ? normalizePath(topRaw) : null;
  // `branch --show-current` also works on a fresh repo without commits; it is empty when detached.
  const branch = top ? (git(APP_ROOT, ["branch", "--show-current"]) ?? "") : "";
  const sameAsApp = top !== null && within(appRoot, top) === "";
  const workspace = top !== null && !sameAsApp && existsSync(path.join(topRaw, "pnpm-workspace.yaml"));
  const mode = branch.startsWith("proj/") ? "project" : workspace ? "monorepo" : "free";
  const cwd = (typeof input.cwd === "string" && input.cwd) || process.env.CLAUDE_PROJECT_DIR || APP_ROOT;
  const scratchpad = typeof input.scratchpad_dir === "string" && input.scratchpad_dir ? toAbs(input.scratchpad_dir, cwd) : null;
  cachedContext = {
    appRoot,
    top: sameAsApp ? null : top,
    branch,
    mode,
    workspace,
    expectedBranch: typeof project.branch === "string" ? project.branch : null,
    slug: typeof project.slug === "string" ? project.slug : path.basename(APP_ROOT),
    pkgName: typeof pkg.name === "string" ? pkg.name : null,
    cwd,
    scratchpad,
  };
  return cachedContext;
}

// ---------------------------------------------------------------------------
// Edits
// ---------------------------------------------------------------------------

const EDIT_TOOLS = new Set(["Edit", "Write", "MultiEdit", "NotebookEdit"]);
const SHELL_TOOLS = new Set(["Bash", "PowerShell"]);

/** Claude Code settings in ~/.claude: they can switch hooks off (disableAllHooks). */
function isUserSettings(abs) {
  const rel = within(normalizePath(path.join(os.homedir(), ".claude")), abs);
  return rel !== null && /^settings(\.local)?\.json$/i.test(rel);
}

/** Places outside the app a session may still write: Claude's own files and its scratchpad. */
function personalAllowed(abs, ctx) {
  const roots = [normalizePath(path.join(os.homedir(), ".claude"))];
  if (ctx.scratchpad) roots.push(ctx.scratchpad);
  return roots.some((r) => within(r, abs) !== null);
}

function editReason(toolInput, ctx) {
  const raw = toolInput.file_path ?? toolInput.notebook_path;
  if (typeof raw !== "string" || !raw) return null;
  const abs = toAbs(raw, ctx.cwd);
  const rel = within(ctx.appRoot, abs);

  if (rel === null) {
    if (ctx.mode !== "free" && isUserSettings(abs)) {
      return `Blocked: ${raw} is Claude Code's own configuration (it can turn this guard off). A project session never edits it; the human does.`;
    }
    if (personalAllowed(abs, ctx)) return null;
    if (ctx.top && within(ctx.top, abs) !== null) {
      const repoRel = within(ctx.top, abs);
      return (
        `Blocked: ${repoRel} is outside this app (${ctx.slug}). A session edits only files inside its own app folder. ` +
        "Shared code, other apps and repo files change between batches: write the request in NOTES.md."
      );
    }
    if (within(normalizePath(os.tmpdir()), abs) !== null) return null;
    return (
      `Blocked: ${raw} is outside this app folder (${ctx.appRoot}). Edit files inside the app only; ` +
      "scratch files can go in your scratchpad or the OS temp folder. Write anything else you need in NOTES.md."
    );
  }

  const relLower = WIN ? rel.toLowerCase() : rel;
  const segments = relLower.split("/");
  if (segments.includes("node_modules")) {
    return `Blocked: ${rel} is inside node_modules/, which the package manager owns. Change dependencies through the package manager (see the dependency rule in the session context) or note the problem in NOTES.md.`;
  }
  if (segments[0] === "dist") {
    return `Blocked: ${rel} is build output. Edit the source under src/ and rebuild (npm run build).`;
  }
  if (ctx.mode !== "project") return null;

  if (ctx.expectedBranch && ctx.branch !== ctx.expectedBranch) {
    return (
      `Blocked: this worktree belongs to ${ctx.expectedBranch} (project.json "branch"), but the checkout is on ${ctx.branch}. ` +
      `Do not edit here. Switch back with git switch ${ctx.expectedBranch}, or stop and tell the human.`
    );
  }
  if (segments[0] === "data" || relLower === "docs/brief.md" || relLower.startsWith("docs/modules/")) {
    return (
      `Blocked: ${rel} is synced from the RCENE repo (data layers and the brief are read-only in a project session). ` +
      "Write the change you need (a new layer, a field, a brief correction) in NOTES.md, and work around it locally meanwhile."
    );
  }
  if (relLower.startsWith("scripts/hooks/") || relLower === ".claude/settings.json" || relLower === ".claude/settings.local.json") {
    return `Blocked: ${rel} is this session's guard or its wiring and is read-only in a project session. Write the change you need in NOTES.md.`;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Shell commands
// ---------------------------------------------------------------------------

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

function expandHome(p) {
  const s = String(p);
  return s === "~" || s.startsWith("~/") || s.startsWith("~\\") ? path.join(os.homedir(), s.slice(1)) : s;
}

/** Resolves a directory named in a command against the current one (Git Bash /c/..., drive letters and ~ too). */
function resolveDir(cwd, dir) {
  const target = normalizePath(expandHome(dir));
  if (isAbsoluteAny(target)) return target;
  const base = normalizePath(cwd);
  return isAbsoluteAny(base) ? normalizePath(`${base}/${target}`) : normalizePath(path.resolve(cwd, dir));
}

// --- git (project mode) ----------------------------------------------------

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

function gitReason(sub, args, ctx) {
  const own = ctx.expectedBranch || ctx.branch;
  const fix = `Commit on ${own}; the human reviews and merges.`;
  const plain = args.filter((a) => !a.startsWith("-"));
  switch (sub) {
    case "push":
    case "pull":
    case "merge":
    case "rebase":
    case "cherry-pick":
    case "am":
      return `Blocked: git ${sub} is not allowed in a project session. ${fix}`;
    case "worktree":
      return `Blocked: worktrees are managed by the orchestrator, not by project sessions. ${fix}`;
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
        return `Blocked: deleting, renaming or copying branches is not allowed in a project session. Stay on ${own}.`;
      }
      return null;
    case "checkout":
    case "switch": {
      // Allowed: restoring files (`git checkout [<tree>] -- <paths>`, at least one path) or
      // naming the own branch. Anything else (a sha, HEAD~0, another branch, -b/--detach,
      // `git checkout main --`) would move HEAD off the project branch, and a detached HEAD
      // turns these project rules off.
      const dashes = args.indexOf("--");
      const movesHead = args.some((a) => /^-[a-zA-Z]*[bB]/.test(a) || ["--orphan", "--detach"].includes(a.split("=")[0]));
      const restoresFiles = sub === "checkout" && dashes !== -1 && dashes < args.length - 1 && !movesHead;
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

// --- pnpm (project + monorepo) ----------------------------------------------

const PNPM_OPTS_WITH_VALUE = new Set(["--reporter", "--loglevel", "--workspace-concurrency", "--store-dir", "--virtual-store-dir"]);
const PNPM_ADD_REMOVE = new Set(["add", "remove", "rm", "uninstall", "un"]);
const PNPM_OTHER_DEP_COMMANDS = new Set(["update", "up", "upgrade", "link", "ln", "unlink", "dedupe", "import"]);

function parsePnpm(tokens, start) {
  const filters = [];
  let dir = null;
  let workspaceRoot = false;
  let recursive = false;
  let sub;
  const subArgs = [];
  for (let i = start + 1; i < tokens.length; i++) {
    const t = tokens[i];
    // These options are honoured before and after the subcommand.
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
    if (sub === undefined) {
      if (t.startsWith("-")) {
        if (PNPM_OPTS_WITH_VALUE.has(t)) i++;
        continue;
      }
      sub = t;
      continue;
    }
    subArgs.push(t);
  }
  return { sub, subArgs, filters, dir, workspaceRoot, recursive };
}

/** True when a pnpm --filter selector names exactly this app (by name, slug or path). */
function ownFilter(filter, ctx, cwd) {
  const f = filter.replace(/^\{|\}$/g, "").replace(/\\/g, "/").replace(/\/$/, "");
  if (!f) return false;
  if (f === ctx.pkgName || f === ctx.slug) return true;
  if (f.startsWith(".") || f.includes("/") || isAbsoluteAny(normalizePath(f))) {
    const bases = [cwd, ctx.top].filter(Boolean);
    return bases.some((base) => within(ctx.appRoot, resolveDir(base, f)) === "");
  }
  return false;
}

function pnpmReason(parsed, ctx, cwd) {
  const { sub, subArgs, filters, dir, workspaceRoot, recursive } = parsed;
  if (!sub) return null;
  const installsPackages = (sub === "install" || sub === "i") && subArgs.some((a) => !a.startsWith("-"));
  const addRemove = PNPM_ADD_REMOVE.has(sub) || installsPackages;
  if (!addRemove && !PNPM_OTHER_DEP_COMMANDS.has(sub)) return null;

  if (!addRemove) {
    return `Blocked: pnpm ${sub} would move this app off its exact pinned versions. Keep the pins; if a version really must change, write the request in NOTES.md.`;
  }
  if (!ctx.workspace) {
    return `Blocked: dependencies are frozen in this project session (the app is not in a pnpm workspace, so pnpm would replace its npm install). Write the request in NOTES.md.`;
  }
  const allowed = (() => {
    if (workspaceRoot || recursive) return false;
    if (filters.length > 0) return filters.every((f) => ownFilter(f, ctx, cwd));
    const where = dir ? resolveDir(cwd, dir) : normalizePath(cwd);
    return within(ctx.appRoot, where) !== null;
  })();
  if (allowed) return null;
  const name = ctx.pkgName ?? ctx.slug;
  return (
    `Blocked: pnpm ${sub} here would change dependencies outside this app. Run pnpm add <pkg> inside the app folder ` +
    `(or pnpm --filter ${name} add <pkg>), never with -w or -r. Pin an exact version (never ^ or ~, no new major) and justify the dependency in NOTES.md; ` +
    "requests for root or other packages go in NOTES.md too."
  );
}

// --- npm / yarn / bun (project + monorepo) ---------------------------------

const NPM_OPTS_WITH_VALUE = new Set(["--prefix", "-C", "--workspace", "-w", "--registry", "--cache", "--userconfig", "--globalconfig", "--loglevel", "--tag", "--omit", "--include"]);
const NPM_LOCKFILE_VERBS = new Set(["install", "i", "in", "ins", "inst", "insta", "instal", "isnt", "isnta", "isntal", "isntall", "add", "uninstall", "remove", "rm", "r", "un", "unlink", "update", "up", "upgrade", "udpate", "dedupe", "ddp"]);
const NPM_DEP_VERBS = new Set([
  ...NPM_LOCKFILE_VERBS,
  "ci",
  "clean-install",
  "ic",
  "install-clean",
  "isntall-clean",
  "link",
  "ln",
  "prune",
  "rebuild",
  "rb",
  "install-test",
  "it",
  "install-ci-test",
  "cit",
]);
/** npm verbs that never touch node_modules; once one is seen the rest are its arguments. */
const NPM_SAFE_VERBS = new Set([
  "run", "run-script", "rum", "urn", "test", "t", "tst", "start", "stop", "restart", "exec", "x",
  "ls", "list", "ll", "la", "view", "v", "info", "show", "outdated", "explain", "why", "config", "c",
  "get", "help", "version", "pack", "query", "doctor", "fund", "search", "find", "pkg", "prefix", "root",
  "bin", "docs", "home", "repo", "bugs", "whoami", "ping", "cache", "init", "create",
]);

function npmVerb(tokens, start) {
  for (let i = start + 1; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.startsWith("-")) {
      if (NPM_OPTS_WITH_VALUE.has(t)) i++;
      continue;
    }
    if (NPM_DEP_VERBS.has(t)) return { verb: t, index: i };
    if (t === "audit") return { verb: tokens.slice(i + 1).includes("fix") ? "audit fix" : "audit", index: i };
    if (NPM_SAFE_VERBS.has(t)) return { verb: t, index: i };
    // Unknown word: probably the value of an option we don't know; keep looking.
  }
  return { verb: null, index: -1 };
}

function optionValue(tokens, names) {
  for (let i = 0; i < tokens.length; i++) {
    for (const n of names) {
      if (tokens[i] === n) return tokens[i + 1] ?? null;
      if (tokens[i].startsWith(`${n}=`)) return tokens[i].slice(n.length + 1);
    }
  }
  return null;
}

function npmReason(tokens, start, ctx, cwd) {
  const { verb } = npmVerb(tokens, start);
  if (!verb || (!NPM_DEP_VERBS.has(verb) && verb !== "audit fix")) return null;
  const rest = tokens.slice(start + 1);
  const lockOnly = rest.some((t) => t === "--package-lock-only" || t === "--package-lock-only=true");
  if (lockOnly && NPM_LOCKFILE_VERBS.has(verb)) {
    const prefix = optionValue(rest, ["--prefix", "-C"]);
    const where = prefix ? resolveDir(cwd, prefix) : normalizePath(cwd);
    if (within(ctx.appRoot, where) !== null) return null; // rewrites only this app's package-lock.json
  }
  const name = ctx.pkgName ?? ctx.slug;
  if (!ctx.workspace) {
    return `Blocked: npm ${verb} changes dependencies, which are frozen in this project session. Write the request in NOTES.md.`;
  }
  return (
    `Blocked: npm ${verb} would rewrite node_modules, which pnpm manages here (npm would break pnpm's layout). ` +
    `Add a dependency with pnpm add <pkg> inside the app (or pnpm --filter ${name} add <pkg>), then refresh the app's own ` +
    "lockfile with npm install --package-lock-only. Justify the dependency in NOTES.md."
  );
}

const OTHER_PM_DEP_VERBS = new Set(["add", "remove", "install", "i", "upgrade", "up", "update", "dedupe", "link", "unlink", "import"]);

function otherPmReason(program, tokens, start) {
  const first = tokens.slice(start + 1).find((t) => !t.startsWith("-"));
  if (first !== undefined && !OTHER_PM_DEP_VERBS.has(first)) return null;
  if (first === undefined && program !== "yarn") return null; // bare `yarn` installs; bare `bun` does not
  return `Blocked: ${program} would create another lockfile and node_modules layout. This app uses pnpm here (npm standalone); write dependency requests in NOTES.md.`;
}

function commandReason(command, ctx) {
  const gitRules = ctx.mode === "project";
  const depRules = ctx.mode === "project" || ctx.mode === "monorepo";
  if (!gitRules && !depRules) return null;
  let cwd = ctx.cwd;
  for (const segment of segments(command)) {
    const tokens = tokenize(segment).map(bare).filter(Boolean);
    if (tokens.length === 0) continue;
    // Track `cd dir` / `Set-Location dir` (also in a subshell, "(cd x && ...)") so
    // `cd ../.. && pnpm add y` resolves correctly. Conservative: a subshell's cd is kept.
    if (isCd(tokens[0]) && tokens[1]) {
      cwd = resolveDir(cwd, tokens[1]);
      continue;
    }
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i];
      let reason = null;
      if (isProgram(t, "git")) {
        if (!gitRules) break;
        const { sub, args } = parseGit(tokens, i);
        if (sub) reason = gitReason(sub, args, ctx);
      } else if (isProgram(t, "pnpm")) {
        if (!depRules) break;
        reason = pnpmReason(parsePnpm(tokens, i), ctx, cwd);
      } else if (isProgram(t, "npm")) {
        if (!depRules) break;
        reason = npmReason(tokens, i, ctx, cwd);
      } else if (isProgram(t, "yarn") || isProgram(t, "bun")) {
        if (!depRules) break;
        reason = otherPmReason(baseName(t).toLowerCase().replace(/\.(exe|cmd|bat|ps1)$/, ""), tokens, i);
      } else continue;
      if (reason) return reason;
      break; // one program per simple command
    }
  }
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

  // Forbidden locations first, failing closed: if the input can't be parsed, scan the raw text.
  const strings = input && typeof input === "object" ? forbiddenCandidates(input) : [raw.replace(/\\\\/g, "\\")];
  const forbidden = forbiddenReason(strings);
  if (forbidden) return forbidden;
  if (!input || typeof input !== "object") return null;

  try {
    const toolName = String(input.tool_name ?? "");
    const toolInput = input.tool_input && typeof input.tool_input === "object" ? input.tool_input : {};
    const credential = credentialReason(toolName, toolInput);
    if (credential) return credential;
    if (EDIT_TOOLS.has(toolName)) return editReason(toolInput, appContext(input));
    if (SHELL_TOOLS.has(toolName) && typeof toolInput.command === "string") return commandReason(toolInput.command, appContext(input));
    return null;
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
