// @vitest-environment node
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createRateLimiter } from "./handler.ts";
import { createAiServer, readStandaloneSettings } from "./standalone.ts";
import type { FetchLike } from "./relay.ts";

const KEYS = { AI_PROVIDER: "openai", OPENAI_API_KEY: "sk-test-standalone" };
const servers: ReturnType<typeof createAiServer>[] = [];

async function start(env: Record<string, string>, fetchImpl?: FetchLike) {
  const server = createAiServer({ env, fetch: fetchImpl });
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  return `http://127.0.0.1:${port}`;
}

afterEach(async () => {
  await Promise.all(servers.splice(0).map((s) => new Promise((resolve) => s.close(resolve))));
});

const answer: FetchLike = vi.fn(async () => ({ ok: true, status: 200, text: async () => JSON.stringify({ choices: [{ message: { content: '{"ok":true}' } }] }) }));

function post(base: string, headers: Record<string, string> = {}) {
  return fetch(`${base}/api/ai/complete`, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify({ provider: "openai", system: "s", prompt: "p" }),
  });
}

describe("readStandaloneSettings", () => {
  it("defaults to loopback:8010, 30 completions a minute and a required Origin", () => {
    expect(readStandaloneSettings({})).toEqual({ port: 8010, host: "127.0.0.1", perMinute: 30, requireOrigin: true });
    expect(readStandaloneSettings({ PORT: "9000", HOST: "0.0.0.0", AI_RATE_LIMIT_PER_MIN: "0", AI_REQUIRE_ORIGIN: "0" })).toEqual({
      port: 9000,
      host: "0.0.0.0",
      perMinute: 0,
      requireOrigin: false,
    });
  });
});

describe("createRateLimiter", () => {
  it("allows n per sliding minute", () => {
    let t = 0;
    const allow = createRateLimiter(2, () => t);
    expect([allow(), allow(), allow()]).toEqual([true, true, false]);
    t = 60_001;
    expect(allow()).toBe(true);
    expect(createRateLimiter(0)()).toBe(true);
  });
});

describe("the standalone relay", () => {
  it("answers health and status without exposing keys", async () => {
    const base = await start(KEYS);
    const health = await fetch(`${base}/healthz`).then((r) => r.json());
    expect(health).toEqual({ ok: true, provider: "openai" });
    const status = await fetch(`${base}/api/ai/status`).then((r) => r.text());
    expect(status).toContain('"configured":true');
    expect(status).not.toContain("sk-test-standalone");
    expect((await fetch(`${base}/anything`)).status).toBe(404);
  });

  it("relays a completion from the app's own origin", async () => {
    const base = await start(KEYS, answer);
    const host = new URL(base).host;
    const res = await post(base, { origin: `http://${host}` });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, text: '{"ok":true}' });
  });

  it("refuses POSTs without an Origin, and other origins", async () => {
    const base = await start(KEYS, answer);
    expect((await post(base)).status).toBe(403);
    expect((await post(base, { origin: "https://evil.example" })).status).toBe(403);
  });

  it("limits completions per minute", async () => {
    const base = await start({ ...KEYS, AI_RATE_LIMIT_PER_MIN: "1" }, answer);
    const origin = `http://${new URL(base).host}`;
    expect((await post(base, { origin })).status).toBe(200);
    const limited = await post(base, { origin });
    expect(limited.status).toBe(429);
    expect(await limited.json()).toMatchObject({ ok: false, code: "rate_limited" });
  });
});
