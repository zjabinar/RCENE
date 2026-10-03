// @vitest-environment node
/**
 * Tests for the app-local SessionStart hook: spawned with hook JSON on stdin from a
 * copy inside throwaway fixtures (standalone with and without git, a fake monorepo
 * on main and on proj/01-x), it must print valid hook JSON and always exit 0.
 */
import { spawnSync } from "node:child_process";
import { chmodSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const here = path.dirname(fileURLToPath(import.meta.url));
const templateRoot = path.resolve(here, "..", "..");
const STATUS = "# Status - 01 Test app\n\nPhase: features\nDone: R1.1, R1.2\nNext: R1.3 evacuation link\n";

const baseEnv = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith("GIT_")));

function git(cwd, ...args) {
  const result = spawnSync(
    "git",
    ["-c", "user.name=test", "-c", "user.email=test@example.com", "-c", "commit.gpgsign=false", ...args],
    { cwd, encoding: "utf8", env: baseEnv },
  );
  if (result.status !== 0) throw new Error(`git ${args.join(" ")} failed: ${result.stderr}`);
  return result.stdout.trim();
}

function writeApp(appDir, project) {
  mkdirSync(path.join(appDir, "scripts", "hooks"), { recursive: true });
  cpSync(path.join(here, "session-context.mjs"), path.join(appDir, "scripts", "hooks", "session-context.mjs"));
  writeFileSync(path.join(appDir, "project.json"), JSON.stringify(project, null, 2));
  writeFileSync(path.join(appDir, "package.json"), JSON.stringify({ name: `@rcene/${project.slug}`, private: true }));
  mkdirSync(path.join(appDir, "docs"), { recursive: true });
  writeFileSync(path.join(appDir, "docs", "brief.md"), "# Brief\n");
  mkdirSync(path.join(appDir, "data", "files"), { recursive: true });
  mkdirSync(path.join(appDir, "data", "fixtures", "derived"), { recursive: true });
  writeFileSync(path.join(appDir, "data", "files", ".gitkeep"), "");
  writeFileSync(path.join(appDir, "data", "files", "boundary.geojson"), "{}");
  for (const f of ["boundary.geojson", "barangays.geojson", "derived/barangay-hazard.json"]) {
    writeFileSync(path.join(appDir, "data", "fixtures", ...f.split("/")), "{}");
  }
  mkdirSync(path.join(appDir, "models"), { recursive: true });
  writeFileSync(path.join(appDir, "models", ".gitkeep"), "");
  writeFileSync(path.join(appDir, "STATUS.md"), STATUS);
}

const tempDir = (prefix) => realpathSync.native(mkdtempSync(path.join(os.tmpdir(), prefix)));

function makeStandalone({ withGit }) {
  const root = tempDir("rcene-ctx-app-");
  const app = path.join(root, "app");
  writeApp(app, JSON.parse(readFileSync(path.join(templateRoot, "project.json"), "utf8")));
  if (withGit) {
    git(app, "init", "-q", "-b", "main");
    git(app, "add", "-A");
    git(app, "commit", "-q", "-m", "chore: initial app copy");
  }
  return { root, app };
}

function makeMonorepo(branch) {
  const root = tempDir("rcene-ctx-mono-");
  writeFileSync(path.join(root, "pnpm-workspace.yaml"), "packages:\n  - apps/*\n");
  const app = path.join(root, "apps", "01-x");
  writeApp(app, { id: "01", slug: "01-x", title: "Test app", tagline: "A test", port: 5101, ai: false, brief: "docs/brief.md", branch: "proj/01-x", smokeRoutes: ["/", "/map"] });
  git(root, "init", "-q", "-b", "main");
  git(root, "add", "-A");
  git(root, "commit", "-q", "-m", "init");
  if (branch !== "main") {
    git(root, "checkout", "-q", "-b", branch);
    git(root, "commit", "-q", "--allow-empty", "-m", "feat(01): R1.1 first slice");
  }
  return { root, app };
}

function run(fx, { input = { cwd: fx.app, source: "startup", hook_event_name: "SessionStart" }, env = {} } = {}) {
  const result = spawnSync(process.execPath, [path.join(fx.app, "scripts", "hooks", "session-context.mjs")], {
    input: typeof input === "string" ? input : JSON.stringify(input),
    cwd: fx.app,
    encoding: "utf8",
    timeout: 20000,
    env: { ...baseEnv, CLAUDE_CODE_REMOTE: "", CLAUDE_PROJECT_DIR: fx.app, ...env },
  });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

function contextOf(r) {
  expect(r.status).toBe(0);
  const parsed = JSON.parse(r.stdout);
  expect(parsed.hookSpecificOutput.hookEventName).toBe("SessionStart");
  const ctx = parsed.hookSpecificOutput.additionalContext;
  expect(typeof ctx).toBe("string");
  expect(ctx.length).toBeLessThan(10000);
  return ctx;
}

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

describe("session-context", () => {
  it.each(["standalone", "nogit", "monoMain", "project"])("prints valid JSON with brief, ports, data and STATUS.md (%s)", (key) => {
    const ctx = contextOf(run(fx[key]));
    expect(ctx).toContain("Brief (the approved spec, read it first): docs/brief.md");
    expect(ctx).not.toContain("NOT FOUND");
    expect(ctx).toMatch(/Ports: dev 51\d\d \(npm run dev\), preview 61\d\d/);
    expect(ctx).toContain("Next: R1.3 evacuation link");
    expect(ctx).toMatch(/Real \(data\/files\): boundary\.geojson/);
    expect(ctx).toMatch(/Fixture only[^\n]*barangays\.geojson, derived\/barangay-hazard\.json/);
    expect(ctx).toContain("npm run dev | npm test | npm run typecheck | npm run build | npm run smoke | npm run fetch-models");
    expect(ctx).toContain(`CLAUDE_PROJECT_DIR=${fx[key].app}`);
    expect(ctx).toContain("do not brainstorm or ask clarifying questions");
  });

  it("describes a standalone copy on main as free mode with npm rules", () => {
    const ctx = contextOf(run(fx.standalone));
    expect(ctx).toContain("RCENE app session: 00 - RCENE template (_template)");
    expect(ctx).toContain("Mode: free (standalone app folder; branch main)");
    expect(ctx).toContain("dev 5100");
    expect(ctx).toContain("preview 6100");
    expect(ctx).toContain("npm ci installs from package-lock.json");
    expect(ctx).toContain("chore: initial app copy");
    expect(ctx).not.toContain("pnpm equivalents");
  });

  it("works without git", () => {
    const ctx = contextOf(run(fx.nogit));
    expect(ctx).toContain("Mode: free (standalone app folder, no git)");
    expect(ctx).toContain("Commits: no git repository here.");
  });

  it("describes monorepo mode on main with the pnpm rule", () => {
    const ctx = contextOf(run(fx.monoMain));
    expect(ctx).toContain("Mode: monorepo (app at apps/01-x in a pnpm workspace; branch main)");
    expect(ctx).toContain("pnpm equivalents: pnpm dev");
    expect(ctx).toContain("never npm/yarn install or npm ci");
    expect(ctx).not.toContain("Project session rules");
  });

  it("describes a project branch: rules, commits since main, smoke routes", () => {
    const ctx = contextOf(run(fx.project, { input: { cwd: fx.project.app, source: "resume" } }));
    expect(ctx).toContain("RCENE app session: 01 - Test app (01-x)");
    expect(ctx).toContain("Tagline: A test");
    expect(ctx).toContain("Mode: project (app at apps/01-x in a pnpm workspace; branch proj/01-x)");
    expect(ctx).toContain("dev 5101");
    expect(ctx).toContain("preview 6101");
    expect(ctx).toContain("checks / /map offline");
    expect(ctx).toContain("Commits on proj/01-x since main:\n");
    expect(ctx).toContain("feat(01): R1.1 first slice");
    expect(ctx).toContain("stay on proj/01-x");
    expect(ctx).toContain("data/** and docs/brief.md are synced");
    expect(ctx).toContain("pnpm add <pkg> inside this folder");
    expect(ctx).not.toContain("WARNING");
  });

  it("warns when the checkout is on another project's branch", () => {
    const ctx = contextOf(run(fx.wrongBranch));
    expect(ctx).toContain("WARNING: this app belongs to proj/01-x");
  });

  it("reports the model folder for AI apps", () => {
    const project = path.join(fx.nogit.app, "project.json");
    const original = readFileSync(project, "utf8");
    try {
      writeFileSync(project, JSON.stringify({ ...JSON.parse(original), ai: true }));
      expect(contextOf(run(fx.nogit))).toContain("models/ is empty");
      mkdirSync(path.join(fx.nogit.app, "models", "Xenova", "multilingual-e5-small", "onnx"), { recursive: true });
      writeFileSync(path.join(fx.nogit.app, "models", "Xenova", "multilingual-e5-small", "config.json"), "{}");
      mkdirSync(path.join(fx.nogit.app, "models", "ort"), { recursive: true });
      writeFileSync(path.join(fx.nogit.app, "models", "ort", "ort-wasm-simd-threaded.asyncify.wasm"), "");
      expect(contextOf(run(fx.nogit))).toContain("models/ holds Xenova/multilingual-e5-small, ort");
    } finally {
      writeFileSync(project, original);
      rmSync(path.join(fx.nogit.app, "models", "Xenova"), { recursive: true, force: true });
      rmSync(path.join(fx.nogit.app, "models", "ort"), { recursive: true, force: true });
    }
    expect(contextOf(run(fx.nogit))).toContain("In-browser AI: off");
  });

  it("keeps the context under the 10,000 character cap", () => {
    const status = path.join(fx.project.app, "STATUS.md");
    writeFileSync(status, `${STATUS}\n${"- long line of notes\n".repeat(1500)}`);
    try {
      const ctx = contextOf(run(fx.project));
      expect(ctx).toContain("truncated: read STATUS.md");
      expect(ctx).toContain("do not brainstorm");
    } finally {
      writeFileSync(status, STATUS);
    }
  });

  it("tolerates empty or broken stdin and a missing project.json", () => {
    expect(contextOf(run(fx.standalone, { input: "" }))).toContain("RCENE app session");
    expect(contextOf(run(fx.standalone, { input: "{not json" }))).toContain("RCENE app session");
    const project = path.join(fx.nogit.app, "project.json");
    const original = readFileSync(project, "utf8");
    try {
      rmSync(project);
      expect(contextOf(run(fx.nogit))).toContain("project.json is missing");
    } finally {
      writeFileSync(project, original);
    }
  });

  // Fake npm/pnpm on PATH record how they were called. POSIX shell scripts only.
  it.skipIf(process.platform === "win32")("installs in cloud sessions when node_modules is missing", () => {
    const bin = tempDir("rcene-ctx-bin-");
    const log = path.join(bin, "calls.log");
    try {
      for (const name of ["npm", "pnpm"]) {
        writeFileSync(path.join(bin, name), `#!/bin/sh\necho "${name} $* @ $(pwd)" >> "${log}"\necho "${name} output" \n`);
        chmodSync(path.join(bin, name), 0o755);
      }
      const env = { CLAUDE_CODE_REMOTE: "true", PATH: `${bin}${path.delimiter}${process.env.PATH}` };
      const standalone = run(fx.standalone, { env });
      contextOf(standalone);
      expect(standalone.stdout).not.toContain("npm output"); // installer output goes to stderr
      const mono = run(fx.project, { env });
      contextOf(mono);
      const calls = readFileSync(log, "utf8");
      expect(calls).toContain(`npm ci @ ${fx.standalone.app}`);
      expect(calls).toContain(`pnpm install --frozen-lockfile @ ${fx.project.root}`);

      mkdirSync(path.join(fx.standalone.app, "node_modules"));
      rmSync(log);
      contextOf(run(fx.standalone, { env }));
      expect(existsSync(log)).toBe(false); // already installed: nothing runs
    } finally {
      rmSync(bin, { recursive: true, force: true });
      rmSync(path.join(fx.standalone.app, "node_modules"), { recursive: true, force: true });
    }
  });
});
