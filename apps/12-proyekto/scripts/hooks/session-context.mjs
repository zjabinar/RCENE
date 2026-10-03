#!/usr/bin/env node
/**
 * SessionStart hook for this app (wired in .claude/settings.json).
 *
 * Tells a fresh or resumed session which app it is building and where it stands:
 * project title, mode (project / monorepo / free), branch, brief, ports, data and
 * model status, the current STATUS.md, recent commits, the commands and the
 * dependency rule for the mode. Everything is read from this app folder (the
 * folder two levels above this file) and the git checkout around it.
 *
 * Output: {"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"..."}}
 * Claude Code caps additionalContext at 10,000 characters, so a long STATUS.md is
 * truncated with a pointer to the file.
 *
 * In a cloud session (CLAUDE_CODE_REMOTE=true) without node_modules it installs
 * first, with the installer's output on stderr: in a monorepo
 * `pnpm install --frozen-lockfile` at the git root, standalone `npm ci` here.
 *
 * It never fails the session: errors are swallowed and it exits 0.
 *
 * Manual check:  echo '{}' | node scripts/hooks/session-context.mjs
 */
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const APP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const MAX_CONTEXT = 9500;
const PROTOCOL =
  "Follow the session protocol in CLAUDE.md. The brief is the approved spec: do not brainstorm or ask clarifying questions; make reasonable decisions and record them in NOTES.md.";
const OFF_LIMITS =
  "Off limits everywhere: D:\\monica, C:\\lgu_portal, and credential files (.env*, *service-account*.json, gemini_api_key.txt, *.pem). A PreToolUse guard enforces the rules below.";

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

function git(args) {
  try {
    return execFileSync("git", ["-C", APP_ROOT, ...args], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 10000,
      windowsHide: true,
    }).trim();
  } catch {
    return null;
  }
}

function readText(file) {
  try {
    return readFileSync(file, "utf8").replace(/\r\n/g, "\n").trim();
  } catch {
    return null;
  }
}

function readJson(file) {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

const samePath = (a, b) => {
  const n = (p) => path.resolve(p).replace(/\\/g, "/").replace(/\/$/, "");
  return process.platform === "win32" ? n(a).toLowerCase() === n(b).toLowerCase() : n(a) === n(b);
};

/** { mode, branch, top, workspace } for the checkout around the app (same rules as guard.mjs). */
function checkout() {
  const top = git(["rev-parse", "--show-toplevel"]);
  if (!top) return { mode: "free", branch: null, top: null, workspace: false };
  const branch = git(["branch", "--show-current"]) ?? "";
  const workspace = !samePath(top, APP_ROOT) && existsSync(path.join(top, "pnpm-workspace.yaml"));
  const mode = branch.startsWith("proj/") ? "project" : workspace ? "monorepo" : "free";
  return { mode, branch, top, workspace };
}

function ensureInstalled(co) {
  if (process.env.CLAUDE_CODE_REMOTE !== "true") return;
  if (existsSync(path.join(APP_ROOT, "node_modules"))) return;
  const win = process.platform === "win32";
  const [cmd, args, cwd] = co.workspace ? ["pnpm", ["install", "--frozen-lockfile"], co.top] : ["npm", ["ci"], APP_ROOT];
  process.stderr.write(`session-context: node_modules missing in a cloud session; running ${cmd} ${args.join(" ")} in ${cwd}\n`);
  // On Windows npm/pnpm are .cmd shims and need a shell; pass one command string (plain words).
  spawnSync(win ? [cmd, ...args].join(" ") : cmd, win ? [] : args, {
    cwd,
    stdio: ["ignore", 2, 2], // keep stdout clean: it carries the hook's JSON
    shell: win,
    timeout: 540000,
    windowsHide: true,
  });
}

const IGNORED_FILES = new Set([".gitkeep", "README.md", ".DS_Store", "Thumbs.db"]);

/** Files under dir as POSIX paths relative to it (same rules as the /data/ static mount). */
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

function dataStatus() {
  const real = listFiles(path.join(APP_ROOT, "data", "files"));
  const realSet = new Set(real);
  const fixtureOnly = listFiles(path.join(APP_ROOT, "data", "fixtures")).filter((f) => !realSet.has(f));
  return [
    `- Real (data/files): ${real.length ? real.join(", ") : "none yet (only fixtures)"}`,
    `- Fixture only (data/fixtures, fake but schema-valid; the UI shows a "Sample data" badge): ${fixtureOnly.length ? fixtureOnly.join(", ") : "none"}`,
    "- /data/ serves data/files first, then data/fixtures, file by file. Load layers through @rcene/data; never fetch files ad hoc.",
  ].join("\n");
}

function modelStatus(project) {
  if (!project.ai) return "In-browser AI: off (project.json \"ai\": false, so /models/ is not served).";
  const files = listFiles(path.join(APP_ROOT, "models"));
  if (files.length === 0) {
    return "In-browser AI: on, but models/ is empty. While online: npm run fetch-models -- --model e5|clip|all (or --from <another app>/models). Start the AI lazily and keep a keyword fallback.";
  }
  const groups = new Set(files.map((f) => {
    const parts = f.split("/");
    return parts[0] === "ort" ? "ort" : parts.slice(0, 2).join("/");
  }));
  return `In-browser AI: on; models/ holds ${[...groups].join(", ")} (served at /models/).`;
}

function commandLines(co, project) {
  const lines = ["Commands (run in this folder):"];
  lines.push("- npm run dev | npm test | npm run typecheck | npm run build | npm run smoke | npm run fetch-models -- --model e5|clip|all");
  if (co.workspace) lines.push("- pnpm equivalents: pnpm dev | pnpm test | pnpm typecheck | pnpm build | pnpm run smoke | pnpm run fetch-models --model e5");
  lines.push(`- Definition of done: npm run smoke passes (builds, previews on ${project.port ? project.port + 1000 : "port + 1000"}, checks ${(project.smokeRoutes ?? ["/", "/sources"]).join(" ")} offline at 390 and 1280 px, axe, screenshots in docs/screenshots/).`);
  return lines;
}

function ruleLines(co, project) {
  const lines = [];
  if (co.workspace) {
    lines.push(
      "Dependencies (pnpm workspace): add one with pnpm add <pkg> inside this folder (or pnpm --filter <this package> add <pkg>), catalog versions only, and justify it in NOTES.md. Never -w/-r, never npm/yarn install or npm ci (npm would break pnpm's node_modules); npm install --package-lock-only refreshes this app's package-lock.json for standalone use.",
    );
  } else if (co.mode === "project") {
    lines.push("Dependencies: frozen in this project session; write requests in NOTES.md.");
  } else {
    lines.push("Dependencies (standalone): npm ci installs from package-lock.json; npm install <pkg> adds one (exact pins via .npmrc). Prefer what package.json already has.");
  }
  lines.push("Edits: only inside this app folder (plus your scratchpad, ~/.claude and the OS temp folder); never node_modules/ or dist/.");
  if (co.mode === "project") {
    lines.push(
      `Project session rules: stay on ${project.branch ?? co.branch} and commit only (no push, merge, rebase, reset --hard, worktree or branch switching); data/** and docs/brief.md are synced from the repo and read-only, so write requests in NOTES.md.`,
    );
  }
  return lines;
}

function recentCommits(co) {
  if (!co.top) return "Commits: no git repository here.";
  if (co.mode !== "free" && git(["rev-parse", "--verify", "--quiet", "main"]) !== null) {
    const log = git(["log", "--oneline", "--no-decorate", "-n", "15", "main..HEAD"]);
    return `Commits on ${co.branch || "HEAD"} since main:${log ? `\n${log}` : " none yet (fresh start)"}`;
  }
  const log = git(["log", "--oneline", "--no-decorate", "-n", "10"]);
  return `Recent commits:${log ? `\n${log}` : " none yet"}`;
}

function buildContext(co, project) {
  const lines = [];
  const id = project.id ?? "??";
  const slug = project.slug ?? path.basename(APP_ROOT);
  lines.push(`RCENE app session: ${id} - ${project.title ?? slug} (${slug})`);
  if (project.tagline) lines.push(`Tagline: ${project.tagline}`);
  const where = co.workspace ? `app at ${path.relative(co.top, APP_ROOT).split(path.sep).join("/")} in a pnpm workspace` : "standalone app folder";
  const modeText = {
    project: `project (${where}; branch ${co.branch})`,
    monorepo: `monorepo (${where}; branch ${co.branch || "detached HEAD"})`,
    free: co.top ? `free (${where}; branch ${co.branch || "detached HEAD"})` : "free (standalone app folder, no git)",
  }[co.mode];
  lines.push(`Mode: ${modeText}`);
  if (co.mode === "project" && project.branch && co.branch !== project.branch) {
    lines.push(`WARNING: this app belongs to ${project.branch} (project.json), but the checkout is on ${co.branch}. Edits are blocked until you git switch ${project.branch}.`);
  }
  const brief = project.brief ?? "docs/brief.md";
  const briefExists = existsSync(path.join(APP_ROOT, brief));
  lines.push(`Brief (the approved spec, read it first): ${brief}${briefExists ? "" : " (NOT FOUND: tell the human in STATUS.md)"}`);
  if (project.port) lines.push(`Ports: dev ${project.port} (npm run dev), preview ${project.port + 1000} (vite preview, used by the smoke test).`);
  lines.push("");
  lines.push("Data layers:");
  lines.push(dataStatus());
  lines.push(modelStatus(project));
  lines.push("");
  lines.push(...commandLines(co, project));
  lines.push("");
  lines.push(...ruleLines(co, project));
  lines.push(OFF_LIMITS);
  lines.push("");
  lines.push(recentCommits(co));
  lines.push(`CLAUDE_PROJECT_DIR=${process.env.CLAUDE_PROJECT_DIR ?? "(not set)"}`);
  const head = lines.join("\n");

  const status = readText(path.join(APP_ROOT, "STATUS.md"));
  let statusBlock;
  if (status === null) statusBlock = "STATUS.md is missing: create it (Phase / Done / Next / Blockers).";
  else {
    const budget = MAX_CONTEXT - head.length - PROTOCOL.length - 200;
    const body = status.length > budget ? `${status.slice(0, Math.max(0, budget))}\n[... truncated: read STATUS.md for the rest]` : status;
    statusBlock = `Current STATUS.md (read this first when resuming):\n-----\n${body}\n-----`;
  }
  return `${head}\n\n${statusBlock}\n\n${PROTOCOL}`;
}

async function main() {
  try {
    await readStdin(); // the input is not needed: everything is relative to this app folder
  } catch {
    // ignore
  }
  const co = checkout();
  try {
    ensureInstalled(co);
  } catch {
    // never fail the session
  }
  const project = readJson(path.join(APP_ROOT, "project.json"));
  const context = project
    ? buildContext(co, project)
    : `RCENE app session in ${APP_ROOT}, but project.json is missing or invalid: restore it (id, slug, title, port, ai, brief, branch, smokeRoutes) before building.\nCLAUDE_PROJECT_DIR=${process.env.CLAUDE_PROJECT_DIR ?? "(not set)"}`;
  process.stdout.write(`${JSON.stringify({ hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: context } })}\n`);
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
