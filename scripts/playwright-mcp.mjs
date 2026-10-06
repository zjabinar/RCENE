#!/usr/bin/env node
/**
 * Starts the Playwright MCP server (wired in .mcp.json) from this app's own node_modules,
 * with a browser that exists on this machine: Microsoft Edge on Windows (always installed),
 * Playwright's Chromium elsewhere (PLAYWRIGHT_BROWSERS_PATH, or `npx playwright install
 * chromium` once). Set RCENE_MCP_BROWSER (msedge, chrome, chromium, firefox) to override.
 * Other arguments pass through to @playwright/mcp.
 */
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const APP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cli = path.join(APP_ROOT, "node_modules", "@playwright", "mcp", "cli.js");
const browser = process.env.RCENE_MCP_BROWSER || (process.platform === "win32" ? "msedge" : "chromium");

const child = spawn(process.execPath, [cli, "--browser", browser, ...process.argv.slice(2)], {
  cwd: APP_ROOT,
  stdio: "inherit",
  windowsHide: true,
});
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
child.on("error", (err) => {
  process.stderr.write(`playwright-mcp: ${err.message} (run npm ci in this folder first)\n`);
  process.exit(1);
});
child.on("exit", (code, signal) => process.exit(code ?? (signal ? 1 : 0)));
