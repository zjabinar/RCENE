#!/usr/bin/env node
/**
 * SessionStart hook for sessions at the REPO ROOT (wired in .claude/settings.json).
 *
 * Root sessions are the orchestrator (main) and the data session (proj/00-data).
 * App sessions start inside apps/<slug> of their worktree and use that folder's
 * own CLAUDE.md, hooks and settings, so this hook never runs for them.
 *
 *   - proj/00-data (any row without an app): brief, write scope, data status and
 *     the commits so far, so a fresh or resumed data session continues.
 *   - proj/<slug> of an app opened at the root by mistake: says to restart
 *     Claude Code inside apps/<slug>, plus its STATUS.md.
 *   - anything else: the orchestrator guide (batches, tooling, merge steps).
 *
 * Output: {"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"..."}}
 * Claude Code caps additionalContext at 10,000 characters, so long STATUS.md
 * files are truncated with a pointer to the file.
 *
 * In a cloud session (CLAUDE_CODE_REMOTE=true) with no node_modules yet, it runs
 * `pnpm install --frozen-lockfile` first, with its output on stderr.
 *
 * It never fails the session: any error prints nothing and exits 0.
 *
 * Manual check:  echo '{}' | node scripts/hooks/session-context.mjs
 */
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const MAX_CONTEXT = 9500;
const PROTOCOL =
  "The brief is the approved spec: do not brainstorm or ask clarifying questions; make reasonable decisions and record them (data session: in data/README.md and the commit messages).";
const OFF_LIMITS =
  "Off limits everywhere: D:\\monica, C:\\lgu_portal, and credential files (.env*, *service-account*.json, gemini_api_key.txt, *.pem).";

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

function git(cwd, args) {
  try {
    return execFileSync("git", ["-C", cwd, ...args], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 10000,
      windowsHide: true,
    }).trim();
  } catch {
    return "";
  }
}

function findRoot(cwd) {
  const top = git(cwd, ["rev-parse", "--show-toplevel"]);
  if (top && existsSync(path.join(top, "docs", "projects", "projects.json"))) return top;
  let dir = path.resolve(cwd);
  for (;;) {
    if (existsSync(path.join(dir, "docs", "projects", "projects.json"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return top || null;
    dir = parent;
  }
}

function ensureInstalled(root) {
  if (process.env.CLAUDE_CODE_REMOTE !== "true") return;
  if (existsSync(path.join(root, "node_modules"))) return;
  process.stderr.write("session-context: node_modules missing in a cloud session; running pnpm install --frozen-lockfile\n");
  const win = process.platform === "win32";
  spawnSync(win ? "pnpm install --frozen-lockfile" : "pnpm", win ? [] : ["install", "--frozen-lockfile"], {
    cwd: root,
    stdio: ["ignore", 2, 2], // keep stdout clean: it carries the hook's JSON
    shell: win,
    timeout: 540000,
  });
}

const IGNORED_FILES = new Set([".gitkeep", "README.md", ".DS_Store", "Thumbs.db"]);

/** Files under dir as POSIX paths relative to it (same rules as the apps' /data/ mount). */
function listFiles(dir) {
  const out = [];
  const walk = (abs, rel) => {
    let entries = [];
    try {
      entries = readdirSync(abs, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (IGNORED_FILES.has(entry.name)) continue;
      const childRel = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(path.join(abs, entry.name), childRel);
      else out.push(childRel);
    }
  };
  walk(dir, "");
  return out.sort();
}

function dataStatus(root) {
  const real = listFiles(path.join(root, "data", "files"));
  const fixtures = listFiles(path.join(root, "data", "fixtures"));
  const realSet = new Set(real);
  const fixtureOnly = fixtures.filter((f) => !realSet.has(f));
  return [
    `- Real (data/files): ${real.length ? real.join(", ") : "none yet (the data session has not been merged)"}`,
    `- Fixture only (data/fixtures, fake but schema-valid; apps show a "Sample data" badge): ${fixtureOnly.length ? fixtureOnly.join(", ") : "none"}`,
    "- Root data/ is the canonical copy; `pnpm sync-data` mirrors it into every apps/<slug>/data/. Real files override fixtures file by file.",
  ].join("\n");
}

function readText(file) {
  try {
    return readFileSync(file, "utf8").replace(/\r\n/g, "\n").trim();
  } catch {
    return null;
  }
}

function commitsSoFar(root, base, branch) {
  const log = git(root, ["log", "--oneline", "--no-decorate", "-n", "15", `${base}..HEAD`]);
  return `Commits on ${branch} so far: ${log ? `\n${log}` : "none (fresh start)"}`;
}

/** The data session (and any other row without an app), which runs at the repo root. */
function dataContext(root, branch, row, manifest) {
  const base = manifest.base || "main";
  const lines = [];
  lines.push(`RCENE data session: ${row.id} - ${row.title} (${row.slug}). It runs at the repo root, not in an app folder.`);
  if (row.tagline) lines.push(`Tagline: ${row.tagline}`);
  lines.push(`Branch: ${branch} (from ${base}) | Batch ${row.batch} | Kind: ${row.kind}`);
  const briefExists = row.brief && existsSync(path.join(root, row.brief));
  lines.push(`Brief (the approved spec, read it first): ${row.brief}${briefExists ? "" : " (NOT FOUND in this checkout: tell the human)"}`);
  lines.push(
    `Write scope (enforced by a PreToolUse guard): ${(row.writeScope || []).join(", ")}. Keep progress and decisions in data/README.md (its mapping and conversion-record sections) and in commit messages; requests for anything else go there too.`,
  );
  lines.push(
    "Outputs go to the root data/files (canonical). Never edit apps/*/data by hand: after this branch is merged the orchestrator runs `pnpm sync-data` to copy data/ into every app.",
  );
  lines.push("Check before each commit: node scripts/data/validate.mjs (exit 0), then node scripts/data/derive.mjs. Tests: pnpm exec vitest run scripts/data.");
  lines.push("Schemas, layer names and levels come from apps/_template/rcene/data (read-only here).");
  if (row.localOnly) {
    lines.push("Local only: the source GIS archive is D:\\lgu_portal - GIS on this PC (allowed). Never touch D:\\monica or C:\\lgu_portal.");
  }
  lines.push("");
  lines.push("Data layers:");
  lines.push(dataStatus(root));
  lines.push("");
  lines.push(OFF_LIMITS);
  lines.push("");
  lines.push(commitsSoFar(root, base, branch));
  lines.push("");
  lines.push(PROTOCOL);
  return lines.join("\n");
}

/** An app branch opened at the worktree root: app sessions belong inside apps/<slug>. */
function appAtRootContext(root, branch, row, manifest) {
  const base = manifest.base || "main";
  const app = row.app || `apps/${row.slug}`;
  const lines = [];
  lines.push(`RCENE app worktree: ${row.id} - ${row.title} (${row.slug}), branch ${branch} (from ${base}), batch ${row.batch}.`);
  lines.push(
    `This session started at the worktree ROOT. App sessions run INSIDE ${app}: that folder has its own CLAUDE.md, hooks, settings, brief (${app}/docs/brief.md) and smoke test. Tell the human to restart Claude Code there (cd ${app}; claude, or claude --continue), or relaunch with scripts\\launch-worktrees.ps1 -Project ${row.slug} -Resume. Do not build the app from here.`,
  );
  lines.push(`Write scope here (enforced by the root guard): ${(row.writeScope || []).join(", ")}.`);
  if (row.port) lines.push(`Ports: dev ${row.port}, preview ${row.port + 1000}. Done = npm run smoke passes inside ${app} (from the root: node scripts/smoke.mjs --app ${row.slug}).`);
  lines.push(OFF_LIMITS);
  lines.push("");
  lines.push(commitsSoFar(root, base, branch));
  const head = lines.join("\n");
  const statusPath = `${app}/STATUS.md`;
  const status = readText(path.join(root, statusPath));
  if (status === null) return `${head}\n\n${statusPath} is missing: generate the app with node scripts/new-app.mjs ${row.slug} on main.`;
  const budget = MAX_CONTEXT - head.length - 200;
  const body = status.length > budget ? `${status.slice(0, Math.max(0, budget))}\n[... truncated: read ${statusPath} for the rest]` : status;
  return `${head}\n\nCurrent ${statusPath}:\n-----\n${body}\n-----`;
}

function orchestratorContext(root, branch, manifest, note) {
  const batches = new Map();
  for (const p of manifest.projects || []) {
    if (p.launch === false || p.batch === null || p.batch === undefined) continue; // reference projects are not launched
    if (!batches.has(p.batch)) batches.set(p.batch, []);
    batches.get(p.batch).push(p.slug + (p.localOnly ? " (local only)" : ""));
  }
  const lines = [];
  lines.push(
    `RCENE orchestrator mode (branch ${branch || "unknown"}). This checkout plans, reviews and merges. Each app is a self-contained folder apps/<slug> (own package.json + package-lock.json, own copy of the shared code in rcene/, own data/, scripts, hooks, CLAUDE.md and brief in docs/brief.md); apps/_template is the reference copy.`,
  );
  if (note) lines.push(note);
  lines.push(
    "Each project is built in its own worktree on proj/<slug>. App sessions start INSIDE <worktree>/apps/<slug> and use that folder's own hooks and settings; this root's hooks apply only to the orchestrator and to the 00-data session (which runs at the worktree root).",
  );
  lines.push("Batches (docs/projects/projects.json):");
  for (const [batch, slugs] of [...batches.entries()].sort((a, b) => a[0] - b[0])) {
    lines.push(`- Batch ${batch}: ${slugs.join(", ")}`);
  }
  const real = listFiles(path.join(root, "data", "files")).filter((f) => f.endsWith(".geojson"));
  lines.push(`Real data merged: ${real.length ? `${real.length} GeoJSON layers in data/files` : "no (batch 0 not merged yet; apps use the fixtures)"}`);
  lines.push("Tooling (repo root; each accepts --help):");
  lines.push("- pnpm new-app <slug|id>... | --all  generate apps/<slug> from apps/_template (skips started apps unless --force)");
  lines.push("- pnpm sync-shared --all [--dry-run | --report]  three-way update of template-owned files (rcene/, scripts/, .claude, config, docs, package.json fields); conflicts are reported, not overwritten");
  lines.push("- pnpm sync-data  mirror root data/ into every app (run after merging 00-data or changing fixtures)");
  lines.push("- pnpm lockfiles [--check]  per-app package-lock.json so `npm ci` works in any app folder");
  lines.push("- pnpm check-standalone --all [--install <slug>]  static standalone checks; --install does a real npm ci/typecheck/test/build/smoke in a temp copy");
  lines.push("- pnpm stack:check (node scripts/stack.mjs --write to fix)  package.json versions vs stack.json");
  lines.push("- pnpm smoke --app <slug>  runs that app's own smoke test (npm run smoke inside the app)");
  lines.push("Launch a batch (Windows PowerShell): powershell -ExecutionPolicy Bypass -File scripts\\launch-worktrees.ps1 -Batch 1");
  lines.push("Progress: powershell -ExecutionPolicy Bypass -File scripts\\launch-worktrees.ps1 -Status   (add -DryRun to any launch to preview it)");
  lines.push("Review a branch: /code-review proj/<slug> here, plus pnpm check-standalone <slug>. Merge: git merge --no-ff proj/<slug> on main.");
  lines.push("After changing apps/_template: pnpm sync-shared --all. After changing stack.json: node scripts/stack.mjs --write, pnpm install, pnpm lockfiles --fresh.");
  lines.push("Clean up after merging: powershell -ExecutionPolicy Bypass -File scripts\\launch-worktrees.ps1 -Project <slug> -Remove (keeps the branch).");
  lines.push(OFF_LIMITS);
  return lines.join("\n");
}

async function main() {
  let input = {};
  try {
    const raw = await readStdin();
    input = raw.trim() ? JSON.parse(raw) : {};
  } catch {
    input = {};
  }
  const cwd = (typeof input.cwd === "string" && input.cwd) || process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const root = findRoot(cwd);
  if (!root) return;

  try {
    ensureInstalled(root);
  } catch {
    // never fail the session
  }

  const manifestPath = path.join(root, "docs", "projects", "projects.json");
  if (!existsSync(manifestPath)) return;
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const branch = git(root, ["rev-parse", "--abbrev-ref", "HEAD"]);

  let context;
  const row = branch.startsWith("proj/")
    ? (manifest.projects || []).find((p) => p.branch === branch) ||
      (manifest.projects || []).find((p) => p.slug === branch.slice("proj/".length))
    : null;
  if (row && row.app) context = appAtRootContext(root, branch, row, manifest);
  else if (row) context = dataContext(root, branch, row, manifest);
  else {
    const note = branch.startsWith("proj/") ? `Warning: ${branch} has no row in docs/projects/projects.json, so no write scope is enforced.` : "";
    context = orchestratorContext(root, branch, manifest, note);
  }

  process.stdout.write(
    JSON.stringify({ hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: context.slice(0, MAX_CONTEXT) } }) + "\n",
  );
}

// No process.exit(): let stdout drain (pipes can be asynchronous on Windows).
main().then(
  () => {
    process.exitCode = 0;
  },
  () => {
    process.exitCode = 0;
  },
);
