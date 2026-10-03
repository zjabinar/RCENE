#!/usr/bin/env node
/**
 * SessionStart hook for RCENE (wired in .claude/settings.json).
 *
 * On a proj/<slug> branch it tells the session which project it is building:
 * brief, write scope, ports, data status, the current STATUS.md and the commits
 * made so far, so a fresh or resumed session continues without asking.
 * On any other branch it prints a short orchestrator guide.
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
  "Follow the session protocol in CLAUDE.md. The brief is the approved spec: do not brainstorm or ask clarifying questions; make reasonable decisions and record them in NOTES.md.";

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

/** Files under dir as POSIX paths relative to it (same rules as @rcene/config's static mount). */
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
  const real = listFiles(path.join(root, "packages", "data", "files"));
  const fixtures = listFiles(path.join(root, "packages", "data", "fixtures"));
  const realSet = new Set(real);
  const fixtureOnly = fixtures.filter((f) => !realSet.has(f));
  return [
    `- Real (packages/data/files): ${real.length ? real.join(", ") : "none yet (the data session has not been merged)"}`,
    `- Fixture only (packages/data/fixtures, fake but schema-valid; the UI shows a "Sample data" badge): ${fixtureOnly.length ? fixtureOnly.join(", ") : "none"}`,
    "- Load layers through @rcene/data; never fetch files ad hoc. Real files override fixtures file by file.",
  ].join("\n");
}

function readText(file) {
  try {
    return readFileSync(file, "utf8").replace(/\r\n/g, "\n").trim();
  } catch {
    return null;
  }
}

function projectContext(root, branch, row, manifest) {
  const base = manifest.base || "main";
  const lines = [];
  lines.push(`RCENE project session: ${row.id} - ${row.title} (${row.slug})`);
  if (row.tagline) lines.push(`Tagline: ${row.tagline}`);
  lines.push(`Branch: ${branch} (from ${base}) | Batch ${row.batch} | Kind: ${row.kind}`);
  const briefExists = row.brief && existsSync(path.join(root, row.brief));
  lines.push(`Brief (the approved spec, read it first): ${row.brief}${briefExists ? "" : " (NOT FOUND in this checkout: tell the human in STATUS.md)"}`);
  if (row.app) {
    let pkgName = `@rcene/${row.slug}`;
    try {
      pkgName = JSON.parse(readFileSync(path.join(root, row.app, "package.json"), "utf8")).name || pkgName;
    } catch {
      // keep the default
    }
    lines.push(`App dir: ${row.app} (package ${pkgName})`);
  }
  lines.push(
    `Write scope (enforced by a PreToolUse guard): ${(row.writeScope || []).join(", ")}. Shared packages are frozen during a batch; put requests in ${row.app ? `${row.app}/NOTES.md` : "packages/data/README.md"}.`,
  );
  if (row.port) {
    lines.push(`Ports: dev ${row.port} (pnpm dev), preview ${row.port + 1000} (vite preview, used by the smoke test).`);
    lines.push(`Definition of done: node scripts/smoke.mjs --app ${row.slug} passes (from ${row.app}: node ../../scripts/smoke.mjs --app ${row.slug}).`);
  } else {
    lines.push("Ports: none (data session).");
  }
  if (row.localOnly) {
    lines.push("Local only: the source GIS archive is D:\\lgu_portal - GIS on this PC (allowed). Never touch D:\\monica or C:\\lgu_portal.");
  }
  if (row.extras && row.extras.length) lines.push(`Extras installed for this app: ${row.extras.join(", ")}`);
  if (typeof row.ai === "boolean") lines.push(`In-browser AI: ${row.ai ? "yes (models under /models/)" : "no"}`);
  if (row.dataNeeds && row.dataNeeds.length) lines.push(`Data needs: ${row.dataNeeds.join(", ")}`);
  lines.push("");
  lines.push("Data layers:");
  lines.push(dataStatus(root));
  lines.push("");
  lines.push("Off limits everywhere: D:\\monica, C:\\lgu_portal, and credential files (.env*, *service-account*.json, gemini_api_key.txt, *.pem).");

  const log = git(root, ["log", "--oneline", "--no-decorate", "-n", "15", `${base}..HEAD`]);
  lines.push("");
  lines.push(`Commits on ${branch} so far: ${log ? `\n${log}` : "none (fresh start)"}`);

  const head = lines.join("\n");
  const statusPath = row.app ? `${row.app}/STATUS.md` : null;
  const status = statusPath ? readText(path.join(root, statusPath)) : null;
  let statusBlock;
  if (!statusPath) statusBlock = "No STATUS.md for the data session: keep progress in packages/data/README.md and commit messages.";
  else if (status === null) statusBlock = `${statusPath} is missing: create it from the template layout.`;
  else {
    const budget = MAX_CONTEXT - head.length - PROTOCOL.length - 200;
    const body =
      status.length > budget
        ? `${status.slice(0, Math.max(0, budget))}\n[... truncated: read ${statusPath} for the rest]`
        : status;
    statusBlock = `Current ${statusPath} (read this first when resuming):\n-----\n${body}\n-----`;
  }
  return `${head}\n\n${statusBlock}\n\n${PROTOCOL}`;
}

function orchestratorContext(root, branch, manifest, note) {
  const batches = new Map();
  for (const p of manifest.projects || []) {
    if (!batches.has(p.batch)) batches.set(p.batch, []);
    batches.get(p.batch).push(p.slug + (p.localOnly ? " (local only)" : ""));
  }
  const lines = [];
  lines.push(`RCENE orchestrator mode (branch ${branch || "unknown"}). This checkout plans, reviews and merges; each project is built in its own worktree on proj/<slug> by its own Claude Code session.`);
  if (note) lines.push(note);
  lines.push("Batches (docs/projects/projects.json):");
  for (const [batch, slugs] of [...batches.entries()].sort((a, b) => a[0] - b[0])) {
    lines.push(`- Batch ${batch}: ${slugs.join(", ")}`);
  }
  const real = listFiles(path.join(root, "packages", "data", "files")).filter((f) => f.endsWith(".geojson"));
  lines.push(`Real data merged: ${real.length ? `${real.length} GeoJSON layers` : "no (batch 0 not merged yet; app sessions will use fixtures)"}`);
  lines.push("Launch a batch (Windows PowerShell): powershell -ExecutionPolicy Bypass -File scripts\\launch-worktrees.ps1 -Batch 1");
  lines.push("Progress: powershell -ExecutionPolicy Bypass -File scripts\\launch-worktrees.ps1 -Status   (add -DryRun to any launch to preview it)");
  lines.push("Review a branch: /code-review proj/<slug> here. Merge: git merge --no-ff proj/<slug> on main, then pnpm install if the lockfile conflicts.");
  lines.push("Clean up after merging: powershell -ExecutionPolicy Bypass -File scripts\\launch-worktrees.ps1 -Project <slug> -Remove (keeps the branch).");
  lines.push("Off limits: D:\\monica, C:\\lgu_portal and credential files.");
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
  if (row) context = projectContext(root, branch, row, manifest);
  else {
    const note = branch.startsWith("proj/") ? `Warning: ${branch} has no row in docs/projects/projects.json, so no write scope is enforced.` : "";
    context = orchestratorContext(root, branch, manifest, note);
  }

  process.stdout.write(
    JSON.stringify({ hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: context } }) + "\n",
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
