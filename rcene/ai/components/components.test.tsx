import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAiLog } from "../log.ts";
import type { AiStatus } from "../protocol.ts";
import { useAiSettings } from "../settings.ts";
import { useAiStatusStore } from "../status.ts";
import { aiStrings } from "../strings.ts";
import { AiActivityLog } from "./ai-activity-log.tsx";
import { AiInsightCard } from "./ai-insight-card.tsx";
import { AiProviderChip, AiRunButton } from "./ai-run.tsx";
import { AiSettingsPanel } from "./ai-settings-panel.tsx";
import { AiSourceBadge } from "./ai-source-badge.tsx";
import { ConfidenceMeter, confidenceBand } from "./confidence-meter.tsx";

const STATUS: AiStatus = {
  defaultProvider: "openai",
  timeoutMs: 30000,
  providers: [
    { id: "openai", configured: true, model: "gpt-test" },
    { id: "anthropic", configured: false, model: "claude-test" },
    { id: "gemini", configured: false, model: "gemini-test" },
    { id: "local", configured: false, model: "llama", baseUrl: "http://localhost:11434/v1" },
  ],
};

async function expectNoViolations(container: Element = document.body) {
  const result = await axe.run(container, { rules: { "color-contrast": { enabled: false } } });
  expect(result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.html).join(" | ")}`)).toEqual([]);
}

beforeEach(() => {
  localStorage.clear();
  useAiStatusStore.setState({ state: "ready", status: STATUS });
  useAiSettings.setState({ provider: "auto", models: {}, fallback: true });
  useAiLog.setState({ entries: [] });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("ai strings", () => {
  const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
  it("translate every ai.* key with the same placeholders", () => {
    const keys = Object.keys(aiStrings.en).filter((k) => k.startsWith("ai."));
    for (const lang of ["war", "fil"] as const) {
      const table = aiStrings[lang] as Record<string, string>;
      for (const key of keys) {
        expect(table[key], `${lang} ${key}`).toBeTruthy();
        expect(placeholders(table[key]!), `${lang} ${key}`).toEqual(placeholders((aiStrings.en as Record<string, string>)[key]!));
      }
    }
  });
});

describe("AiInsightCard", () => {
  it("shows the verdict, confidence, lists, reasons and who answered, accessibly", async () => {
    render(
      <AiInsightCard
        label={<span>Water supply</span>}
        confidence={0.82}
        summary="No water in Purok 3 since Monday."
        findings={["About 40 households affected"]}
        risks={["Children and elderly in the area"]}
        actions={["Send the water truck", "Check the main valve"]}
        rationale={["Mentions “tubig”"]}
        meta={{ mode: "live", provider: "openai", model: "gpt-test", latencyMs: 1400 }}
        footer={<button type="button">Use this suggestion</button>}
      />,
    );
    expect(screen.getByRole("heading", { level: 2, name: /AI analysis/ })).toBeTruthy();
    expect(screen.getByText("Water supply")).toBeTruthy();
    expect(screen.getByText(/82%/)).toBeTruthy();
    expect(screen.getByRole("heading", { level: 3, name: "Recommended actions" })).toBeTruthy();
    expect(screen.getByText(/OpenAI \(ChatGPT\) · gpt-test · 1\.4 s/)).toBeTruthy();
    expect(screen.getByText(/a person reviews and confirms/)).toBeTruthy();
    await expectNoViolations();
  });

  it("explains a fallback", () => {
    render(<AiInsightCard summary="x" meta={{ mode: "fallback", provider: "demo", requested: "openai", latencyMs: 5, note: "OpenAI is not set up" }} />);
    expect(screen.getByText("Fallback: demo rules")).toBeTruthy();
    expect(screen.getAllByText(/OpenAI \(ChatGPT\) could not answer: OpenAI is not set up/).length).toBeGreaterThan(0);
  });
});

describe("small parts", () => {
  it("confidence bands", () => {
    expect([0.2, 0.6, 0.9].map(confidenceBand)).toEqual(["low", "medium", "high"]);
    render(<ConfidenceMeter value={0.6} />);
    expect(screen.getByRole("progressbar").getAttribute("aria-valuetext")).toMatch(/60% · Medium/);
  });

  it("source badge for the demo rules", () => {
    render(<AiSourceBadge meta={{ mode: "demo", provider: "demo", latencyMs: 0 }} />);
    expect(screen.getByText("Demo rules · offline")).toBeTruthy();
  });

  it("run button shows busy while running", () => {
    render(<AiRunButton running />);
    expect(screen.getByRole("button").getAttribute("aria-busy")).toBe("true");
  });

  it("provider chip follows the settings and the relay status", () => {
    render(
      <MemoryRouter>
        <AiProviderChip to="/admin/ai" />
      </MemoryRouter>,
    );
    expect(screen.getByRole("link").textContent).toContain("OpenAI (ChatGPT) · gpt-test");
  });
});

describe("AiSettingsPanel", () => {
  it("lists every provider with its readiness and switches provider", async () => {
    const user = userEvent.setup();
    render(
      <main>
        <AiSettingsPanel />
      </main>,
    );
    expect(screen.getByRole("radio", { name: /Automatic/ })).toBeTruthy();
    expect(screen.getByRole("radio", { name: /Claude/ })).toBeTruthy();
    expect(screen.getAllByText("Not set up").length).toBeGreaterThan(0);
    await user.click(screen.getByRole("radio", { name: /Demo rules/ }));
    expect(useAiSettings.getState().provider).toBe("demo");
    await expectNoViolations();
  });

  it("tests the connection through the relay", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true, text: '{"ok":true,"reply":"Hello from the test"}', provider: "openai", model: "gpt-test", latencyMs: 900 })));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<AiSettingsPanel />);
    await user.click(screen.getByRole("button", { name: "Test connection" }));
    await waitFor(() => expect(screen.getByText(/answered in 0\.9 s: “Hello from the test”/)).toBeTruthy());
    expect(useAiLog.getState().entries[0]).toMatchObject({ task: "ping", mode: "live" });
  });

  it("says when there is no relay", () => {
    useAiStatusStore.setState({ state: "unavailable", status: null });
    render(<AiSettingsPanel />);
    expect(screen.getByText(/AI relay is not running/)).toBeTruthy();
  });
});

describe("AiActivityLog", () => {
  it("shows an empty state, then the runs", () => {
    const { rerender } = render(<AiActivityLog />);
    expect(screen.getByText(/No AI runs yet/)).toBeTruthy();
    useAiLog.getState().add({ task: "triage", mode: "live", provider: "openai", model: "gpt-test", latencyMs: 1200, at: "2026-10-07T09:00:00+08:00" });
    rerender(<AiActivityLog />);
    expect(screen.getByText("triage")).toBeTruthy();
  });
});
