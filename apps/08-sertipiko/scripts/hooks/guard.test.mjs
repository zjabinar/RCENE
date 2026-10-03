// @vitest-environment node
/**
 * Tests for the app-local PreToolUse guard. The guard is spawned exactly as Claude
 * Code runs it (hook JSON on stdin, exit 2 + stderr to block, exit 0 to allow), from
 * a copy placed inside throwaway fixtures, because it finds its app root from its
 * own location:
 *   - standalone: a copy of this app (template project.json + hooks), git on main
 *   - standalone without git
 *   - monorepo: pnpm-workspace.yaml + apps/01-x, on main, on proj/01-x, and on
 *     another project's branch
 */
import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const here = path.dirname(fileURLToPath(import.meta.url));
const templateRoot = path.resolve(here, "..", "..");
const HOOKS = ["guard.mjs", "session-context.mjs"];
const OUTSIDE = path.join(path.parse(os.tmpdir()).root, "rcene-guard-test-outside", "x.txt");

/** The test process may run inside a git hook or worktree; never leak that into the fixtures. */
const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith("GIT_")));

function git(cwd, ...args) {
  const result = spawnSync(
    "git",
    ["-c", "user.name=test", "-c", "user.email=test@example.com", "-c", "commit.gpgsign=false", "-c", "core.autocrlf=false", ...args],
    { cwd, encoding: "utf8", env },
  );
  if (result.status !== 0) throw new Error(`git ${args.join(" ")} failed: ${result.stderr}`);
  return result.stdout.trim();
}

/** Writes an app folder: project.json, package.json, the hook copies and a few files. */
function writeApp(appDir, project) {
  mkdirSync(path.join(appDir, "scripts", "hooks"), { recursive: true });
  for (const f of HOOKS) cpSync(path.join(here, f), path.join(appDir, "scripts", "hooks", f));
  writeFileSync(path.join(appDir, "project.json"), JSON.stringify(project, null, 2));
  writeFileSync(path.join(appDir, "package.json"), JSON.stringify({ name: `@rcene/${project.slug}`, private: true }));
  mkdirSync(path.join(appDir, "src"), { recursive: true });
  writeFileSync(path.join(appDir, "src", "App.tsx"), "export {};\n");
  mkdirSync(path.join(appDir, "docs"), { recursive: true });
  writeFileSync(path.join(appDir, "docs", "brief.md"), "# Brief\n");
  mkdirSync(path.join(appDir, "data", "files"), { recursive: true });
  mkdirSync(path.join(appDir, "data", "fixtures"), { recursive: true });
  writeFileSync(path.join(appDir, "data", "fixtures", "boundary.geojson"), "{}");
  writeFileSync(path.join(appDir, "STATUS.md"), "Not started\n");
}

function tempDir(prefix) {
  return realpathSync.native(mkdtempSync(path.join(os.tmpdir(), prefix)));
}

function makeStandalone({ withGit }) {
  const root = tempDir("rcene-guard-app-");
  const app = path.join(root, "app");
  writeApp(app, JSON.parse(readFileSync(path.join(templateRoot, "project.json"), "utf8")));
  if (withGit) {
    git(app, "init", "-q", "-b", "main");
    git(app, "add", "-A");
    git(app, "commit", "-q", "-m", "init");
  }
  return { root, app, guard: path.join(app, "scripts", "hooks", "guard.mjs") };
}

function makeMonorepo(branch) {
  const root = tempDir("rcene-guard-mono-");
  writeFileSync(path.join(root, "pnpm-workspace.yaml"), "packages:\n  - apps/*\n");
  writeFileSync(path.join(root, "package.json"), JSON.stringify({ name: "rcene", private: true }));
  mkdirSync(path.join(root, "packages", "ui", "src"), { recursive: true });
  writeFileSync(path.join(root, "packages", "ui", "src", "index.ts"), "export {};\n");
  const app = path.join(root, "apps", "01-x");
  writeApp(app, { id: "01", slug: "01-x", title: "Test app", port: 5101, ai: false, brief: "docs/brief.md", branch: "proj/01-x", smokeRoutes: ["/"] });
  git(root, "init", "-q", "-b", "main");
  git(root, "add", "-A");
  git(root, "commit", "-q", "-m", "init");
  if (branch !== "main") git(root, "checkout", "-q", "-b", branch);
  return { root, app, guard: path.join(app, "scripts", "hooks", "guard.mjs") };
}

function run(fx, input) {
  const result = spawnSync(process.execPath, [fx.guard], {
    input: typeof input === "string" ? input : JSON.stringify(input),
    cwd: fx.app,
    encoding: "utf8",
    timeout: 20000,
    env,
  });
  return { status: result.status, stderr: result.stderr };
}

/** Runs one tool call with cwd = the app folder (how Claude Code is started). */
const call = (fx, tool_name, tool_input, extra = {}) => run(fx, { tool_name, tool_input, cwd: fx.app, ...extra });
const bash = (fx, command, cwd = fx.app) => run(fx, { tool_name: "Bash", tool_input: { command }, cwd });
const write = (fx, file, extra) => call(fx, "Write", { file_path: file, content: "x" }, extra);

const fx = {};

beforeAll(() => {
  fx.standalone = makeStandalone({ withGit: true });
  fx.nogit = makeStandalone({ withGit: false });
  fx.monoMain = makeMonorepo("main");
  fx.project = makeMonorepo("proj/01-x");
  fx.wrongBranch = makeMonorepo("proj/02-y");
}, 60000);

afterAll(() => {
  for (const f of Object.values(fx)) if (f?.root) rmSync(f.root, { recursive: true, force: true });
});

const MODES = [
  ["standalone (git, main)", "standalone"],
  ["standalone (no git)", "nogit"],
  ["monorepo on main", "monoMain"],
  ["project branch proj/01-x", "project"],
];

describe.each(MODES)("always-rules: %s", (_label, key) => {
  it("blocks D:\\monica in every spelling", () => {
    const f = fx[key];
    const r = call(f, "Read", { file_path: "D:\\monica\\thesis.docx" });
    expect(r.status).toBe(2);
    expect(r.stderr).toContain("D:\\monica");
    for (const p of ["d:/Monica/data", "/d/monica", "/mnt/d/monica/x.csv", "D:\\MONICA", "/cygdrive/d/monica", "\\\\localhost\\d$\\monica\\x", "//PC/D$/monica"]) {
      expect(call(f, "Glob", { pattern: "**/*", path: p }).status, p).toBe(2);
    }
    expect(bash(f, "ls -la /d/monica && echo done").status).toBe(2);
  });

  it("blocks C:\\lgu_portal but allows D:\\lgu_portal - GIS", () => {
    const f = fx[key];
    const r = call(f, "PowerShell", { command: "Get-ChildItem C:\\lgu_portal" });
    expect(r.status).toBe(2);
    expect(r.stderr).toContain("C:\\lgu_portal");
    expect(call(f, "Read", { file_path: "D:\\lgu_portal - GIS\\Hazard\\flood.kml" }).status).toBe(0);
    expect(bash(f, 'ls "/d/lgu_portal - GIS" && mapshaper "D:\\lgu_portal - GIS\\x.shp" -o out.geojson').status).toBe(0);
  });

  it("blocks forbidden folders reached through ./, ../, the cwd or an earlier cd", () => {
    const f = fx[key];
    expect(call(f, "Read", { file_path: "D:/./monica/x" }).status).toBe(2);
    expect(bash(f, 'cat "D:/lgu_portal - GIS/../monica/notes.txt"').status).toBe(2);
    expect(bash(f, "cd /d/ && ls monica").status).toBe(2);
    expect(call(f, "PowerShell", { command: "Set-Location D:\\; Get-ChildItem monica" }).status).toBe(2);
    expect(bash(f, "ls monica", "D:\\").status).toBe(2);
    expect(call(f, "Glob", { pattern: "monica/**", path: "D:\\" }).status).toBe(2);
    expect(bash(f, 'cd "/d/lgu_portal - GIS" && ls Hazard').status).toBe(0);
    expect(bash(f, "ls monica").status).toBe(0);
  });

  it("blocks forbidden paths even when the input is not valid JSON", () => {
    const f = fx[key];
    expect(run(f, '{"tool_name":"Read","tool_input":{"file_path":"D:\\\\monica\\\\x"').status).toBe(2);
    expect(run(f, "not json at all").status).toBe(0);
  });

  it("does not scan the contents being written", () => {
    const f = fx[key];
    expect(call(f, "Write", { file_path: path.join(f.app, "NOTES.md"), content: "Never read D:\\monica." }).status).toBe(0);
  });

  it("blocks credential files but allows .env.example", () => {
    const f = fx[key];
    expect(call(f, "Read", { file_path: path.join(f.app, ".env") }).status).toBe(2);
    expect(call(f, "Edit", { file_path: path.join(f.app, ".env.local") }).status).toBe(2);
    expect(bash(f, "cat .env").status).toBe(2);
    for (const name of ["gemini_api_key.txt", "my-service-account-123.json", "server.pem"]) {
      expect(call(f, "Read", { file_path: path.join(f.app, name) }).status, name).toBe(2);
    }
    expect(call(f, "Read", { file_path: path.join(f.app, ".env.example") }).status).toBe(0);
    expect(write(f, path.join(f.app, ".env.example")).status).toBe(0);
    expect(call(f, "Grep", { pattern: "import\\.meta\\.env", path: "src" }).status).toBe(0);
    // A commit message only mentions the name.
    expect(bash(f, 'git commit -m "chore: ignore .env files"').status).toBe(0);
    expect(bash(f, "git commit -am 'docs: .env.local is never committed'").status).toBe(0);
    expect(bash(f, 'git commit -m "x" && cat .env').status).toBe(2);
  });

  it("allows edits inside the app, relative or absolute", () => {
    const f = fx[key];
    expect(write(f, path.join(f.app, "src", "App.tsx")).status).toBe(0);
    expect(call(f, "Edit", { file_path: "src\\pages\\Home.tsx" }).status).toBe(0);
    expect(call(f, "NotebookEdit", { notebook_path: path.join(f.app, "docs", "x.ipynb") }).status).toBe(0);
  });

  it("blocks edits outside the app with an actionable message", () => {
    const f = fx[key];
    const r = write(f, OUTSIDE);
    expect(r.status).toBe(2);
    expect(r.stderr).toContain("NOTES.md");
  });

  it("allows ~/.claude, the scratchpad and the OS temp folder", () => {
    const f = fx[key];
    expect(write(f, path.join(os.homedir(), ".claude", "plans", "plan.md")).status).toBe(0);
    const scratch = path.join(path.parse(os.tmpdir()).root, "rcene-guard-test-scratch");
    expect(write(f, path.join(scratch, "notes.txt"), { scratchpad_dir: scratch }).status).toBe(0);
    expect(write(f, path.join(os.tmpdir(), "rcene-guard-test-elsewhere", "x.txt")).status).toBe(0);
  });

  it("blocks edits under node_modules/ and dist/", () => {
    const f = fx[key];
    const nm = write(f, path.join(f.app, "node_modules", "vite", "index.js"));
    expect(nm.status).toBe(2);
    expect(nm.stderr).toContain("node_modules");
    expect(write(f, path.join(f.app, "dist", "index.html")).status).toBe(2);
  });

  it("does not restrict reads", () => {
    const f = fx[key];
    expect(call(f, "Read", { file_path: OUTSIDE }).status).toBe(0);
    expect(call(f, "Read", { file_path: path.join(f.app, "node_modules", "vite", "package.json") }).status).toBe(0);
  });
});

describe("standalone (free mode)", () => {
  it.each(["standalone", "nogit"])("allows npm and yarn installs and git push (%s)", (key) => {
    const f = fx[key];
    for (const command of ["npm install lodash", "npm ci", "npm i -D vitest", "yarn add lodash", "pnpm add -w x", "git push origin main", "git checkout HEAD~0"]) {
      expect(bash(f, command).status, command).toBe(0);
    }
  });

  it.each(["standalone", "nogit"])("allows edits to data/ and the brief (%s)", (key) => {
    const f = fx[key];
    expect(write(f, path.join(f.app, "data", "files", "boundary.geojson")).status).toBe(0);
    expect(write(f, path.join(f.app, "docs", "brief.md")).status).toBe(0);
    expect(write(f, path.join(f.app, "scripts", "hooks", "guard.mjs")).status).toBe(0);
    expect(write(f, path.join(os.homedir(), ".claude", "settings.json")).status).toBe(0);
  });
});

describe("monorepo on main", () => {
  it("blocks edits elsewhere in the repository, pointing to NOTES.md", () => {
    const r = write(fx.monoMain, path.join(fx.monoMain.root, "packages", "ui", "src", "index.ts"));
    expect(r.status).toBe(2);
    expect(r.stderr).toContain("packages/ui/src/index.ts");
    expect(r.stderr).toContain("NOTES.md");
  });

  it("allows git push and data edits (not a project branch)", () => {
    expect(bash(fx.monoMain, "git push origin main").status).toBe(0);
    expect(write(fx.monoMain, path.join(fx.monoMain.app, "data", "files", "x.geojson")).status).toBe(0);
  });

  it("applies the dependency rule", () => {
    const r = bash(fx.monoMain, "npm install lodash");
    expect(r.status).toBe(2);
    expect(r.stderr).toContain("pnpm add");
    expect(bash(fx.monoMain, "pnpm add -w lodash").status).toBe(2);
    expect(bash(fx.monoMain, "pnpm add fuse.js").status).toBe(0);
  });
});

describe("project branch (proj/01-x in a monorepo)", () => {
  const p = () => fx.project;

  it("blocks edits elsewhere in the repository", () => {
    const r = write(p(), path.join(p().root, "packages", "ui", "src", "Button.tsx"));
    expect(r.status).toBe(2);
    expect(r.stderr).toContain("NOTES.md");
    expect(call(p(), "Edit", { file_path: "../../pnpm-workspace.yaml" }).status).toBe(2);
  });

  it("blocks edits to data/** and docs/brief.md, pointing to NOTES.md", () => {
    for (const rel of ["data/files/boundary.geojson", "data/fixtures/boundary.geojson", "data/README.md", "docs/brief.md"]) {
      const r = write(p(), path.join(p().app, ...rel.split("/")));
      expect(r.status, rel).toBe(2);
      expect(r.stderr, rel).toContain("NOTES.md");
    }
    expect(write(p(), path.join(p().app, "docs", "plan.md")).status).toBe(0);
    expect(write(p(), path.join(p().app, "NOTES.md")).status).toBe(0);
  });

  it("protects its own guard and settings", () => {
    expect(write(p(), path.join(p().app, "scripts", "hooks", "guard.mjs")).status).toBe(2);
    expect(write(p(), path.join(p().app, ".claude", "settings.json")).status).toBe(2);
    expect(write(p(), path.join(p().app, ".claude", "settings.local.json")).status).toBe(2);
    expect(write(p(), path.join(os.homedir(), ".claude", "settings.json")).status).toBe(2);
    expect(write(p(), path.join(os.homedir(), ".claude", "settings.local.json")).status).toBe(2);
    expect(write(p(), path.join(p().app, "scripts", "seed.mjs")).status).toBe(0);
  });

  it("blocks git push", () => {
    const r = bash(p(), "git add -A && git push origin HEAD");
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
      "git branch -D proj/02-y",
      "git cherry-pick abc123",
      "git -C . push",
      // Bypasses found in review: a detached HEAD would switch the project rules off.
      "git checkout HEAD~0",
      "git checkout 1a2b3c4",
      "git switch --detach",
      "git branch -d -f proj/02-y",
      "git branch --delete --force proj/02-y",
      "git branch -m renamed",
      // A trailing -- with no path still switches branches.
      "git checkout main --",
      "git checkout -b feat --",
      "git checkout --detach --",
      "git checkout -b feat -- src/App.tsx",
      "git pull origin main",
      "git pull --rebase",
      "git am fix.patch",
    ]) {
      expect(bash(p(), command).status, command).toBe(2);
    }
  });

  it("allows everyday git", () => {
    for (const command of [
      "git status",
      "git diff --stat",
      'git commit -m "feat(01): R1.2 nearest eligible center"',
      "git log --oneline main..HEAD",
      "git merge-base main HEAD",
      "git restore src/App.tsx",
      "git checkout -- src/App.tsx",
      "git checkout HEAD -- src/App.tsx",
      "git checkout main -- src/App.tsx",
      "git switch proj/01-x",
    ]) {
      expect(bash(p(), command).status, command).toBe(0);
    }
  });

  it("allows dependency changes only for this app", () => {
    const ok = [
      ["pnpm add fuse.js", p().app],
      ["pnpm remove fuse.js", p().app],
      ["pnpm add -D @types/qrcode", path.join(p().app, "src")],
      ["pnpm --filter @rcene/01-x add fuse.js", p().root],
      ["pnpm -F ./apps/01-x remove fuse.js", p().root],
      ["pnpm install --frozen-lockfile", p().app],
      ["pnpm --filter @rcene/01-x build", p().root],
      ["npm install --package-lock-only", p().app],
      ["npm install --package-lock-only fuse.js", p().app],
      ["npm run build", p().app],
      ["npm test", p().app],
      ["npm run test -- install", p().app],
      ["npm ls react", p().app],
      ["yarn dev", p().app],
    ];
    for (const [command, cwd] of ok) {
      expect(bash(p(), command, cwd).status, command).toBe(0);
    }
    const blocked = [
      ["pnpm add -w lodash", p().app],
      ["pnpm add -r lodash", p().app],
      ["pnpm --filter @rcene/ui add lodash", p().root],
      ["pnpm add lodash", p().root],
      ["cd ../.. && pnpm add lodash", p().app],
      ["(cd ../.. && pnpm add lodash)", p().app],
      ["{ cd ../..; pnpm add lodash; }", p().app],
      ["cd ~ && pnpm add lodash", p().app],
      ["pnpm add lodash --filter=@rcene/ui", p().app],
      ["pnpm add lodash -C ../../packages/ui", p().app],
      ["pnpm add lodash --dir=../../packages/ui", p().app],
      ["pnpm update", p().app],
      ["npm install lodash", p().app],
      ["npm ci", p().app],
      ["npm i", p().app],
      ["npm --prefix ../../packages/ui install lodash", p().app],
      ["npm install --package-lock-only lodash", p().root],
      ["npm audit fix", p().app],
      ["yarn add lodash", p().app],
      ["yarn", p().app],
      ["bun install", p().app],
    ];
    for (const [command, cwd] of blocked) {
      expect(bash(p(), command, cwd).status, command).toBe(2);
    }
  });

  it("names this package in the dependency message", () => {
    const r = bash(p(), "pnpm add -w lodash");
    expect(r.stderr).toContain("pnpm --filter @rcene/01-x add");
    expect(r.stderr).toContain("NOTES.md");
  });
});

describe("another project's branch", () => {
  it("blocks every edit in the app: the worktree belongs to project.json's branch", () => {
    const f = fx.wrongBranch;
    const r = write(f, path.join(f.app, "src", "App.tsx"));
    expect(r.status).toBe(2);
    expect(r.stderr).toContain("belongs to proj/01-x");
    expect(write(f, path.join(os.tmpdir(), "rcene-guard-test-elsewhere", "y.txt")).status).toBe(0);
  });

  it("lets the session switch back to its own branch", () => {
    expect(bash(fx.wrongBranch, "git switch proj/01-x").status).toBe(0);
    expect(bash(fx.wrongBranch, "git switch main").status).toBe(2);
  });
});
