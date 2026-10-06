# 04 — AI Architecture

AI is part of the work, not a chat box on the side:

```text
resident's words ──▶ AI triage ──▶ staff confirm ──▶ record ──▶ board / phone ──▶ AI briefing ──▶ AI-drafted update
                     classify       (human decision      (coded,       (live, no      (head of office)  (SMS the staff
                     prioritise      stored with the      seeded)       server)                          review and send)
                     recommend       AI's suggestion)
```

This is stronger than `user → chatbot → paragraph`: each AI answer changes a decision a person makes, and the record keeps both.

## The layers

| Layer | Where | What |
|---|---|---|
| Task | `rcene/ai/task.ts`, `rcene/ai/tasks/*` | `defineAiTask`: zod output schema + prompt + deterministic `demo()`. Generic tasks: `classifyTask` (triage), `briefTask`, `extractTask`, `draftTask`, `answerTask`, `pingTask` |
| App glue | `src/domain/triage.ts` | the topic's categories, keywords, actions, sample reports; builds each task's input from the records |
| Client | `rcene/ai/client.ts`, `hooks.ts` | `runAiTask` / `useAiTask`: demo or live, JSON parsing, zod validation, fallback with the reason, activity log |
| Relay | `rcene/ai/server/*` (Vite plugin) | `GET /api/ai/status`, `POST /api/ai/complete`; adds the key from `.env.local`; one adapter per provider |
| UI | `rcene/ai/components/*` | `AiInsightCard`, `AiSourceBadge`, `ConfidenceMeter`, `AiRunButton`, `AiThinking`, `AiProviderChip`, `AiSettingsPanel`, `AiActivityLog` |
| Settings | `/admin/ai` | provider (auto / demo / OpenAI / Claude / Gemini / local), model per provider, fallback switch, connection test |

## The answer contract

Every task's answer is a JSON object validated by its zod schema. The triage answer, for example:

```json
{
  "category": "water",
  "priority": "urgent",
  "confidence": 0.86,
  "summary": "No water in Purok 4 since Monday; about 35 families, children and elderly among them.",
  "key_findings": ["About 35 families affected", "Outage since Monday", "Children and elderly in the area"],
  "recommended_actions": ["Ask the water district for the outage schedule", "Send the water truck today"],
  "rationale": ["Mentions “waray tubig” (no water)", "Vulnerable residents raise the priority"]
}
```

`category` and `priority` must be one of the app's ids (`z.enum`); a label is mapped back to its id before validation. Confidence is 0–1 (a percentage is accepted). The shared rules sent with every task: one JSON object only, text in the UI language (English, Waray, Filipino), no invented facts, short reasons instead of private reasoning.

## Providers and fallback

```text
settings: auto → AI_PROVIDER in .env.local (openai)
          demo → task.demo(input), in the browser, ~0.7 s pause for the demo
          openai | anthropic | gemini | local → relay → provider
any failure (no key, offline, 4xx/5xx, timeout, not JSON, wrong shape)
          → task.demo(input), labelled "Fallback: demo rules" + the reason
```

Setup and troubleshooting: `docs/AI-PROVIDERS.md`.

## Rules (also in `CLAUDE.md`)

- AI suggests; a person confirms. Nothing is saved or sent by AI alone. Store the suggestion and the decision (`TriageInfo` on the record: category, priority, confidence, provider, model, mode, accepted/changed).
- Show who answered (provider, model, time) and the line "AI suggestion: a person reviews and confirms it".
- The app computes numbers; the AI reads them (briefing). It never invents figures.
- Re-skin the prompt **and** `demo()` together, so the offline answer fits the topic too.
- Never show private chain-of-thought: summary, evidence, short reasons, confidence, actions.

## Adding a task on the day

Skill `ai-feature` and `sources/docs/prompts/06-add-ai-task.md`: define it with `defineAiTask` (schema, prompt, `demo()`), test `demo()` against its own schema, run it with `useAiTask`, show it with `AiInsightCard`, add a tab to `/admin/lab` if useful. About 20 minutes.
