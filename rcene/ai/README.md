# @rcene/ai

AI that does a job inside the workflow (classify → prioritise → recommend → act), on any provider, with an answer that is always validated and a demo fallback that always works.

```text
screen ──useAiTask(task)──▶ runAiTask ──demo────────────────▶ task.demo(input)            (browser, offline)
                                     └─live──▶ POST /api/ai/complete ──▶ relay (Vite server, keys from .env.local)
                                                                          ├─ OpenAI   chat/completions, JSON object
                                                                          ├─ Claude   messages + forced tool (JSON Schema)
                                                                          ├─ Gemini   generateContent, application/json
                                                                          └─ local    Ollama / LM Studio (OpenAI-compatible)
                         ◀── JSON → parseJsonObject → task.normalize → zod (task.output) ──┘
                         any failure (no key, offline, timeout, bad JSON, wrong shape) → task.demo(input), mode "fallback"
```

- **Keys never reach the browser.** They live in `.env.local` (git-ignored, no `VITE_` prefix). The relay (`rcene/ai/server`, a Vite plugin added by `rceneApp()`) reads them on the Node side for `npm run dev` and `npm run preview`. A static build has no relay: every run falls back to the demo rules, and the UI says so.
- **Every answer says who answered**: `mode` (`live`, `demo`, `fallback`), `provider`, `model`, `latencyMs`, and `note` (the reason for a fallback). `AiInsightCard` and `AiSourceBadge` show it. Runs are logged in `useAiLog` (shown on `/admin/ai`).
- **A person confirms.** AI output is a suggestion: it never fills a field or saves a record without a click.

## Configure (`.env.local`, then restart `npm run dev`)

| Variable | Meaning |
|---|---|
| `AI_PROVIDER` | Default provider when the settings say "Automatic": `demo`, `openai`, `anthropic`, `gemini`, `local` |
| `OPENAI_API_KEY`, `OPENAI_MODEL` | ChatGPT (default model `gpt-5.4-mini`). Optional `OPENAI_BASE_URL`, `OPENAI_REASONING_EFFORT` (e.g. `low`, only for models that accept it) |
| `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` | Claude (default `claude-haiku-4-5-20251001`) |
| `GEMINI_API_KEY` (or `GOOGLE_API_KEY`), `GEMINI_MODEL` | Gemini (default `gemini-2.5-flash`) |
| `LOCAL_AI_BASE_URL`, `LOCAL_AI_MODEL` | An OpenAI-compatible local server, e.g. `http://localhost:11434/v1` + `llama3.2` (Ollama). `LOCAL_AI_JSON_MODE=json_schema` for LM Studio, `none` if the server rejects JSON mode. `LOCAL_AI_API_KEY` if it needs one |
| `AI_TIMEOUT_MS` | Relay timeout per call (default 30000, max 120000) |

The settings page (`AiSettingsPanel`, on `/admin/ai`) switches the provider at run time, overrides the model per provider, turns the fallback on or off and tests the connection. Those settings are stored in the browser (`rcene:ai:settings`, kept by "Reset demo"); the keys are not.

## Tasks

A task = an id, a system prompt, a prompt builder, a zod output schema, and a deterministic `demo()` with the same shape.

```ts
import { z } from "zod";
import { confidenceSchema, defineAiTask, textListSchema } from "@rcene/ai";

export const permitCheck = defineAiTask<{ business: string }, { permits: string[]; confidence: number }>({
  id: "permit-check",
  system: "You list the permits a small business in a Philippine city usually needs.",
  prompt: (input) => `Business: ${input.business}`,
  output: () => z.object({ permits: textListSchema, confidence: confidenceSchema }),
  demo: () => ({ permits: ["Barangay business clearance", "Mayor's permit"], confidence: 0.5 }),
});
```

`buildTaskRequest()` adds the shared rules to the system prompt: one JSON object matching the JSON Schema (generated from the zod schema), text in the UI language (English, Waray, Filipino), no invented facts, short reasons instead of private reasoning. `confidenceSchema` accepts 0–1 or a percentage; `textListSchema` accepts a string or a list. `normalize(raw, input)` repairs common slips before validation (a label instead of an id).

Generic tasks, ready to point at any topic:

| Task | Input → output | Typical screen |
|---|---|---|
| `classifyTask` (id `triage`) | free text + your categories/priorities (ids, labels, keywords, default actions) → category, priority, confidence, summary, findings, actions, rationale | intake form ("Suggest with AI") |
| `briefTask` (`briefing`) | title, computed facts, one line per record (+ tags) → headline, summary, findings, risks, actions | dashboard ("AI briefing") |
| `extractTask` (`extract`) | free text + field list (text, number, date, boolean, choice) → values, missing required fields | paste a letter or chat → fill a form |
| `draftTask` (`draft`) | kind (sms, notice, reply, email), audience, purpose, facts → subject, body, 160-character SMS | record page ("Draft an update") |
| `answerTask` (`answer`) | question + documents → answer, cited document ids, confidence | help desk / FAQ over the office's own documents |
| `pingTask` | → ok, reply | "Test connection" |

The demo rules are honest heuristics (keywords in English, Filipino and Waray, numbers, dates, the facts the app computed). They are the offline fallback, not a pretend model; their answers are labelled "Demo rules".

## React

```tsx
import { AiInsightCard, AiRunButton, AiThinking, classifyTask, useAiTask } from "@rcene/ai";

const triage = useAiTask(classifyTask);
<AiRunButton running={triage.running} onClick={() => void triage.run({ text, categories })} />
{triage.running && <AiThinking />}
{triage.result && (
  <AiInsightCard
    label={<CategoryLabel category={triage.result.data.category} />}
    confidence={triage.result.data.confidence}
    summary={triage.result.data.summary}
    findings={triage.result.data.key_findings}
    actions={triage.result.data.recommended_actions}
    rationale={triage.result.data.rationale}
    meta={triage.result}
    footer={<Button onClick={apply}>Use this suggestion</Button>}
  />
)}
```

| Export | What |
|---|---|
| `useAiTask(task, { fallback? })` | `{ run(input), running, result, error, reset, provider, model }`; logs every run |
| `useActiveProvider()` | `{ provider, model, ready, auto }` for the next run |
| `useAiSettings`, `useAiStatus`, `useAiLog` | settings store, relay status, activity log |
| `runAiTask(task, input, options)` | the non-React runner (tests, scripts) |
| `AiInsightCard`, `AiSourceBadge`, `ConfidenceMeter`, `AiRunButton`, `AiThinking`, `AiProviderChip` | display |
| `AiSettingsPanel`, `AiActivityLog` | the admin page |

Strings are `ai.*` in `strings.ts` (English, Waray and Filipino drafts); an app rewords any of them in `src/i18n/strings.ts`.

## Tests

`npx vitest run rcene/ai`: provider request shapes and answer parsing, the relay (keys never in the status, timeouts, errors, origin check), the client's validation and fallback, every task's demo rules against its own schema in three languages, the components (axe).
