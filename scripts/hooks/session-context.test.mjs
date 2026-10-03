/**
 * Tests for the root SessionStart hook: spawned with hook JSON on stdin, it must
 * print valid hook JSON (or nothing) and always exit 0.
 */
import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..");
const hook = path.join(here, "session-context.mjs");

function run(input, env = {}) {
  const result = spawnSync(process.execPath, [hook], {
    input: JSON.stringify(input),
    encoding: "utf8",
    timeout: 20000,
    env: { ...process.env, CLAUDE_CODE_REMOTE: "", ...env },
  });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

function contextOf(stdout) {
  const parsed = JSON.parse(stdout);
  expect(parsed.hookSpecificOutput.hookEventName).toBe("SessionStart");
  expect(typeof parsed.hookSpecificOutput.additionalContext).toBe("string");
  return parsed.hookSpecificOutput.additionalContext;
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

const STATUS = "# Status - 01 Ligtas Ba Ako?\n\nPhase: features\nDone: R1.1, R1.2\nNext: R1.3 evacuation link\n";

let repo;
let plain;

beforeAll(() => {
  repo = realpathSync.native(mkdtempSync(path.join(os.tmpdir(), "rcene-ctx-")));
  mkdirSync(path.join(repo, "docs", "projects"), { recursive: true });
  cpSync(path.join(repoRoot, "docs", "projects", "projects.json"), path.join(repo, "docs", "projects", "projects.json"));
  writeFileSync(path.join(repo, "docs", "projects", "00-data.md"), "# Data brief\n");
  writeFileSync(path.join(repo, "docs", "projects", "01-ligtas.md"), "# Brief\n");
  mkdirSync(path.join(repo, "apps", "01-ligtas", "docs"), { recursive: true });
  writeFileSync(path.join(repo, "apps", "01-ligtas", "package.json"), JSON.stringify({ name: "@rcene/01-ligtas" }));
  writeFileSync(path.join(repo, "apps", "01-ligtas", "docs", "brief.md"), "# Brief\n");
  writeFileSync(path.join(repo, "apps", "01-ligtas", "STATUS.md"), STATUS);
  mkdirSync(path.join(repo, "data", "files"), { recursive: true });
  mkdirSync(path.join(repo, "data", "fixtures", "derived"), { recursive: true });
  writeFileSync(path.join(repo, "data", "files", ".gitkeep"), "");
  writeFileSync(path.join(repo, "data", "files", "boundary.geojson"), "{}");
  for (const f of ["boundary.geojson", "barangays.geojson", "derived/barangay-hazard.json"]) {
    writeFileSync(path.join(repo, "data", "fixtures", ...f.split("/")), "{}");
  }
  git(repo, "init", "-q", "-b", "main");
  git(repo, "add", "-A");
  git(repo, "commit", "-q", "-m", "init");
  plain = realpathSync.native(mkdtempSync(path.join(os.tmpdir(), "rcene-ctx-plain-")));
}, 30000);

afterAll(() => {
  for (const dir of [repo, plain]) if (dir) rmSync(dir, { recursive: true, force: true });
});

describe("session-context", () => {
  it("prints orchestrator mode on main, with the app tooling", () => {
    git(repo, "checkout", "-q", "main");
    const r = run({ cwd: repo, source: "startup", hook_event_name: "SessionStart" });
    expect(r.status).toBe(0);
    const ctx = contextOf(r.stdout);
    expect(ctx).toContain("orchestrator mode");
    expect(ctx).toContain("launch-worktrees.ps1 -Batch 1");
    expect(ctx).toContain("-Status");
    expect(ctx).toMatch(/Batch 1: 01-ligtas/);
    for (const tool of ["new-app", "sync-shared", "sync-data", "lockfiles", "check-standalone", "stack:check"]) expect(ctx).toContain(tool);
    expect(ctx).toContain("App sessions start INSIDE <worktree>/apps/<slug>");
    expect(ctx).toContain("D:\\monica");
    expect(ctx).not.toContain("packages/");
    expect(ctx.length).toBeLessThan(10000);
  });

  it("describes the data session: brief, write scope, data status, commits", () => {
    git(repo, "checkout", "-q", "-B", "proj/00-data", "main");
    git(repo, "commit", "-q", "--allow-empty", "-m", "feat(00): boundary layer");
    const ctx = contextOf(run({ cwd: repo, source: "resume" }).stdout);
    expect(ctx).toContain("RCENE data session");
    expect(ctx).toContain("docs/projects/00-data.md");
    expect(ctx).toContain("data/**");
    expect(ctx).toContain("scripts/data/**");
    expect(ctx).toContain("pnpm sync-data");
    expect(ctx).toContain("D:\\lgu_portal - GIS");
    expect(ctx).toMatch(/Real \(data\/files\): boundary\.geojson/);
    expect(ctx).toMatch(/Fixture only[^\n]*barangays\.geojson, derived\/barangay-hazard\.json/);
    expect(ctx).toContain("feat(00): boundary layer");
    expect(ctx).toContain("do not brainstorm or ask clarifying questions");
    expect(ctx).not.toContain("packages/");
  });

  it("sends an app branch opened at the root to the app folder, with its STATUS.md", () => {
    git(repo, "checkout", "-q", "-B", "proj/01-ligtas", "main");
    git(repo, "commit", "-q", "--allow-empty", "-m", "feat: first slice");
    const ctx = contextOf(run({ cwd: repo }).stdout);
    expect(ctx).toContain("worktree ROOT");
    expect(ctx).toContain("cd apps/01-ligtas");
    expect(ctx).toContain("apps/01-ligtas/docs/brief.md");
    expect(ctx).toContain("dev 5101");
    expect(ctx).toContain("preview 6101");
    expect(ctx).toContain("Next: R1.3 evacuation link");
    expect(ctx).toContain("feat: first slice");
  });

  it("keeps the context under the 10,000 character cap", () => {
    git(repo, "checkout", "-q", "-B", "proj/01-ligtas", "main");
    writeFileSync(path.join(repo, "apps", "01-ligtas", "STATUS.md"), `${STATUS}\n${"- long line of notes\n".repeat(1500)}`);
    try {
      const ctx = contextOf(run({ cwd: repo }).stdout);
      expect(ctx.length).toBeLessThan(10000);
      expect(ctx).toContain("truncated");
    } finally {
      writeFileSync(path.join(repo, "apps", "01-ligtas", "STATUS.md"), STATUS);
    }
  });

  it("never fails: outside a repo it prints nothing and exits 0", () => {
    const r = run({ cwd: plain });
    expect(r.status).toBe(0);
    expect(r.stdout.trim()).toBe("");
  });

  it("tolerates empty stdin", () => {
    const result = spawnSync(process.execPath, [hook], { input: "", encoding: "utf8", cwd: plain, timeout: 20000 });
    expect(result.status).toBe(0);
  });
});
