/**
 * Tests for the PreToolUse guard. The guard is spawned exactly as Claude Code
 * runs it: hook JSON on stdin, exit 2 + stderr to block, exit 0 to allow.
 * Branch rules run against throwaway git repos holding a copy of projects.json.
 */
import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..");
const guard = path.join(here, "guard.mjs");

function run(input) {
  const result = spawnSync(process.execPath, [guard], {
    input: typeof input === "string" ? input : JSON.stringify(input),
    encoding: "utf8",
    timeout: 20000,
  });
  return { status: result.status, stderr: result.stderr };
}

function git(cwd, ...args) {
  const result = spawnSync(
    "git",
    ["-c", "user.name=test", "-c", "user.email=test@example.com", "-c", "commit.gpgsign=false", ...args],
    { cwd, encoding: "utf8" },
  );
  if (result.status !== 0) throw new Error(`git ${args.join(" ")} failed: ${result.stderr}`);
  return result.stdout.trim();
}

/** A tiny repo shaped like RCENE: manifest + one app package.json, on main. */
function makeRepo() {
  const dir = realpathSync.native(mkdtempSync(path.join(os.tmpdir(), "rcene-guard-")));
  mkdirSync(path.join(dir, "docs", "projects"), { recursive: true });
  cpSync(path.join(repoRoot, "docs", "projects", "projects.json"), path.join(dir, "docs", "projects", "projects.json"));
  mkdirSync(path.join(dir, "apps", "01-ligtas", "src"), { recursive: true });
  writeFileSync(path.join(dir, "apps", "01-ligtas", "package.json"), JSON.stringify({ name: "@rcene/01-ligtas" }));
  writeFileSync(path.join(dir, "apps", "01-ligtas", "STATUS.md"), "Not started\n");
  git(dir, "init", "-q", "-b", "main");
  git(dir, "add", "-A");
  git(dir, "commit", "-q", "-m", "init");
  return dir;
}

let mainRepo;
let projRepo;
let dataWorktree;

beforeAll(() => {
  mainRepo = makeRepo();
  projRepo = makeRepo();
  git(projRepo, "checkout", "-q", "-b", "proj/01-ligtas");
  dataWorktree = path.join(path.dirname(projRepo), `${path.basename(projRepo)}-00-data`);
  git(projRepo, "worktree", "add", "-q", "-b", "proj/00-data", dataWorktree, "main");
  dataWorktree = realpathSync.native(dataWorktree);
}, 30000);

afterAll(() => {
  for (const dir of [mainRepo, projRepo, dataWorktree]) {
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

describe("forbidden locations (any branch)", () => {
  it("blocks D:\\monica on main", () => {
    const r = run({ tool_name: "Read", tool_input: { file_path: "D:\\monica\\thesis.docx" }, cwd: mainRepo });
    expect(r.status).toBe(2);
    expect(r.stderr).toContain("D:\\monica");
  });

  it("blocks other spellings of D:\\monica", () => {
    for (const p of ["d:/Monica/data", "/d/monica", "/mnt/d/monica/x.csv", "D:\\MONICA", "\\\\localhost\\d$\\monica\\x", "//PC/D$/monica"]) {
      expect(run({ tool_name: "Glob", tool_input: { pattern: "**/*", path: p }, cwd: mainRepo }).status).toBe(2);
    }
    const bash = run({ tool_name: "Bash", tool_input: { command: "ls -la /d/monica && echo done" }, cwd: mainRepo });
    expect(bash.status).toBe(2);
  });

  it("blocks C:\\lgu_portal", () => {
    const r = run({ tool_name: "PowerShell", tool_input: { command: "Get-ChildItem C:\\lgu_portal" }, cwd: mainRepo });
    expect(r.status).toBe(2);
    expect(r.stderr).toContain("C:\\lgu_portal");
  });

  it("allows the GIS archive at D:\\lgu_portal - GIS", () => {
    const read = run({ tool_name: "Read", tool_input: { file_path: "D:\\lgu_portal - GIS\\Hazard\\flood.kml" }, cwd: mainRepo });
    expect(read.status).toBe(0);
    const bash = run({
      tool_name: "Bash",
      tool_input: { command: 'ls "/d/lgu_portal - GIS" && mapshaper "D:\\lgu_portal - GIS\\x.shp" -o out.geojson' },
      cwd: mainRepo,
    });
    expect(bash.status).toBe(0);
  });

  it("blocks forbidden folders reached through ./, ../, the cwd or an earlier cd", () => {
    const bash = (command, cwd = mainRepo) => run({ tool_name: "Bash", tool_input: { command }, cwd }).status;
    expect(run({ tool_name: "Read", tool_input: { file_path: "D:/./monica/x" }, cwd: mainRepo }).status).toBe(2);
    expect(bash('cat "D:/lgu_portal - GIS/../monica/notes.txt"')).toBe(2);
    expect(bash("cd /d/ && ls monica")).toBe(2);
    expect(run({ tool_name: "PowerShell", tool_input: { command: "Set-Location D:\\; Get-ChildItem monica" }, cwd: mainRepo }).status).toBe(2);
    expect(bash("ls monica", "D:\\")).toBe(2);
    expect(bash('cd "/d/lgu_portal - GIS" && ls Hazard')).toBe(0);
    expect(bash("ls monica")).toBe(0);
  });

  it("blocks forbidden paths even when the input is not valid JSON", () => {
    expect(run('{"tool_name":"Read","tool_input":{"file_path":"D:\\\\monica\\\\x"').status).toBe(2);
    expect(run("not json at all").status).toBe(0);
  });

  it("does not scan file contents being written", () => {
    const r = run({
      tool_name: "Write",
      tool_input: { file_path: path.join(mainRepo, "NOTES.md"), content: "Never read D:\\monica." },
      cwd: mainRepo,
    });
    expect(r.status).toBe(0);
  });
});

describe("credential files (any branch)", () => {
  it("blocks .env and .env.*", () => {
    expect(run({ tool_name: "Read", tool_input: { file_path: path.join(mainRepo, ".env") }, cwd: mainRepo }).status).toBe(2);
    expect(run({ tool_name: "Edit", tool_input: { file_path: path.join(mainRepo, "apps", ".env.local") }, cwd: mainRepo }).status).toBe(2);
    expect(run({ tool_name: "Bash", tool_input: { command: "cat .env" }, cwd: mainRepo }).status).toBe(2);
    // A commit message only mentions the name.
    expect(run({ tool_name: "Bash", tool_input: { command: 'git commit -m "chore: ignore .env files"' }, cwd: mainRepo }).status).toBe(0);
    expect(run({ tool_name: "Bash", tool_input: { command: 'git commit -m "x" && cat .env' }, cwd: mainRepo }).status).toBe(2);
  });

  it("allows .env.example", () => {
    const r = run({ tool_name: "Read", tool_input: { file_path: path.join(mainRepo, ".env.example") }, cwd: mainRepo });
    expect(r.status).toBe(0);
  });

  it("blocks keys and service accounts", () => {
    for (const name of ["gemini_api_key.txt", "my-service-account-123.json", "server.pem"]) {
      expect(run({ tool_name: "Read", tool_input: { file_path: path.join(mainRepo, name) }, cwd: mainRepo }).status).toBe(2);
    }
  });

  it("does not treat a content search for import.meta.env as a credential read", () => {
    const r = run({ tool_name: "Grep", tool_input: { pattern: "import\\.meta\\.env", path: "apps" }, cwd: mainRepo });
    expect(r.status).toBe(0);
  });
});

describe("project branch rules (proj/01-ligtas)", () => {
  it("blocks a Write outside the write scope with an actionable message", () => {
    const r = run({
      tool_name: "Write",
      tool_input: { file_path: path.join(projRepo, "apps", "_template", "rcene", "ui", "components", "Button.tsx"), content: "x" },
      cwd: projRepo,
    });
    expect(r.status).toBe(2);
    expect(r.stderr).toContain("apps/01-ligtas/**");
    expect(r.stderr).toContain("apps/01-ligtas/NOTES.md");
  });

  it("allows a Write inside the write scope", () => {
    const r = run({
      tool_name: "Write",
      tool_input: { file_path: path.join(projRepo, "apps", "01-ligtas", "src", "App.tsx"), content: "x" },
      cwd: projRepo,
    });
    expect(r.status).toBe(0);
  });

  it("resolves relative and backslash paths against cwd", () => {
    const inside = run({ tool_name: "Edit", tool_input: { file_path: "src\\pages\\Home.tsx" }, cwd: path.join(projRepo, "apps", "01-ligtas") });
    expect(inside.status).toBe(0);
    const outside = run({ tool_name: "MultiEdit", tool_input: { file_path: "../../pnpm-lock.yaml" }, cwd: path.join(projRepo, "apps", "01-ligtas") });
    expect(outside.status).toBe(2);
  });

  it("blocks writes outside the worktree", () => {
    const target = path.join(path.parse(projRepo).root, "rcene-outside", "x.txt");
    expect(run({ tool_name: "Write", tool_input: { file_path: target }, cwd: projRepo }).status).toBe(2);
  });

  it("blocks git push", () => {
    const r = run({ tool_name: "Bash", tool_input: { command: "git add -A && git push origin HEAD" }, cwd: projRepo });
    expect(r.status).toBe(2);
    expect(r.stderr).toContain("git push");
  });

  it("blocks history and branch surgery", () => {
    for (const command of [
      "git merge main",
      "git rebase main",
      "git reset --hard HEAD~1",
      "git worktree list",
      "git checkout main",
      "git switch main",
      "git switch -c other",
      "git branch -D proj/02-tubig",
      "git cherry-pick abc123",
      "git -C . push",
      // Bypasses found in review: a detached HEAD would switch the project rules off.
      "git checkout HEAD~0",
      "git checkout 1a2b3c4",
      "git switch --detach",
      "git branch -d -f proj/02-tubig",
      "git branch --delete --force proj/02-tubig",
      "git branch -m renamed",
      "git checkout main --",
      "git checkout -b feat --",
      "git checkout --detach --",
      "git pull origin main",
      "git am fix.patch",
    ]) {
      expect(run({ tool_name: "Bash", tool_input: { command }, cwd: projRepo }).status, command).toBe(2);
    }
  });

  it("allows everyday git", () => {
    for (const command of [
      "git status",
      "git diff --stat",
      'git commit -m "feat: hazard chips"',
      "git log --oneline main..HEAD",
      "git merge-base main HEAD",
      "git restore src/App.tsx",
      "git checkout -- src/App.tsx",
      "git checkout main -- src/App.tsx",
    ]) {
      expect(run({ tool_name: "Bash", tool_input: { command }, cwd: projRepo }).status, command).toBe(0);
    }
  });

  it("allows dependency changes only for the session's own app", () => {
    const ok = [
      "pnpm --filter @rcene/01-ligtas add fuse.js",
      "pnpm -F ./apps/01-ligtas remove fuse.js",
      "cd apps/01-ligtas && pnpm add fuse.js",
      "pnpm install --frozen-lockfile",
      "pnpm --filter @rcene/01-ligtas build",
    ];
    for (const command of ok) {
      expect(run({ tool_name: "Bash", tool_input: { command }, cwd: projRepo }).status, command).toBe(0);
    }
    const blocked = [
      "pnpm add -w lodash",
      "pnpm add lodash",
      "pnpm --filter @rcene/template add lodash",
      "npm install lodash",
      // Bypasses found in review: options after the subcommand, and npm option values.
      "cd apps/01-ligtas && pnpm add lodash --filter=@rcene/template",
      "cd apps/01-ligtas && pnpm add lodash -C ../_template",
      "cd apps/01-ligtas && pnpm add lodash --dir=../_template",
      "npm --prefix apps/_template install lodash",
    ];
    for (const command of blocked) {
      expect(run({ tool_name: "Bash", tool_input: { command }, cwd: projRepo }).status, command).toBe(2);
    }
  });

  it("does not restrict reads", () => {
    const r = run({ tool_name: "Read", tool_input: { file_path: path.join(projRepo, "apps", "_template", "rcene", "ui", "index.ts") }, cwd: projRepo });
    expect(r.status).toBe(0);
  });
});

describe("main branch is unrestricted apart from the always-rules", () => {
  it("allows git push on main", () => {
    expect(run({ tool_name: "Bash", tool_input: { command: "git push origin main" }, cwd: mainRepo }).status).toBe(0);
  });

  it("allows edits anywhere on main", () => {
    const r = run({ tool_name: "Write", tool_input: { file_path: path.join(mainRepo, "apps", "_template", "rcene", "ui", "x.ts") }, cwd: mainRepo });
    expect(r.status).toBe(0);
  });
});

describe("data session (proj/00-data in a worktree)", () => {
  it("allows the root data/ and scripts/data, blocks apps, the template and other tooling", () => {
    const write = (rel) =>
      run({ tool_name: "Write", tool_input: { file_path: path.join(dataWorktree, ...rel.split("/")) }, cwd: dataWorktree }).status;
    expect(write("data/files/barangays.geojson")).toBe(0);
    expect(write("data/files/derived/barangay-hazard.json")).toBe(0);
    expect(write("data/README.md")).toBe(0);
    expect(write("scripts/data/convert.mjs")).toBe(0);
    expect(write("apps/01-ligtas/src/App.tsx")).toBe(2);
    expect(write("apps/01-ligtas/data/files/barangays.geojson")).toBe(2);
    expect(write("apps/_template/rcene/data/types.ts")).toBe(2);
    expect(write("scripts/sync-data.mjs")).toBe(2);
  });

  it("names data/README.md as the place for requests", () => {
    const r = run({ tool_name: "Write", tool_input: { file_path: path.join(dataWorktree, "apps", "_template", "x.ts") }, cwd: dataWorktree });
    expect(r.status).toBe(2);
    expect(r.stderr).toContain("data/README.md");
  });

  it("blocks all dependency changes (no app of its own)", () => {
    const r = run({ tool_name: "Bash", tool_input: { command: "pnpm add -w shpjs" }, cwd: dataWorktree });
    expect(r.status).toBe(2);
    expect(r.stderr).toContain("data/README.md");
  });
});
