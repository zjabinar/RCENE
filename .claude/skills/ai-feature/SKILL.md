---
name: ai-feature
description: How to add or change an AI feature in this app - a defineAiTask in @rcene/ai (zod output schema, prompt, deterministic demo() fallback), run through the provider relay (demo, OpenAI, Claude, Gemini, local), shown with AiInsightCard, confirmed by a person. Use whenever adding, re-skinning or debugging AI triage, classification, briefing, extraction, drafting, grounded Q&A, prompts, AI fallback, provider settings on /admin/ai, or the AI lab on /admin/lab.
---

# AI features in this app

AI is 20% of the score. It must do a task on the golden path (classify → prioritise → recommend → a person acts), never a chatbot with a paragraph.

Background: `docs/04-AI-ARCHITECTURE.md` (architecture), `docs/AI-PROVIDERS.md` (keys and providers), `rcene/ai/README.md` (the exact API). This skill is the working recipe.

## What already exists

| Generic task | Use it for | Where the template shows it |
|---|---|---|
| classify (triage) | free text → category, priority, summary, suggested actions | `/admin/lab` intake wizard |
| brief | records or KPIs → executive briefing with risks and actions | `/console` dashboard |
| extract | text → structured fields for a form | `/admin/lab` |
| draft | a notice, reply or SMS for a record | `/console/:id` record detail |
| answer | grounded Q&A over the documents you pass in | `/admin/lab` |
| ping | connection test | `/admin/ai` |

**Re-skin a generic task before writing a new one.** Usually the topic only needs new categories, priority rules and `demo()` rules.

## The contract

Every task is one `defineAiTask(...)` with:

- an **id**
- the **input** it takes (typed)
- a **zod output schema** (the relay asks the provider for JSON that matches it; the answer is validated before use)
- a **prompt** (system + user text) built from the input
- a deterministic **`demo()`** that returns the same schema with no network

The sketch below shows the shape only. Field and option names may differ: copy an existing task in `rcene/ai` and follow `rcene/ai/README.md`.

```ts
import { z } from "zod";
import { defineAiTask } from "@rcene/ai";
import { CATEGORIES, PRIORITIES } from "../domain/records.ts";

export const triageReport = defineAiTask({
  id: "triage-report",
  output: z.object({
    category: z.enum(CATEGORIES),
    priority: z.enum(PRIORITIES),
    summary: z.string().max(240),
    actions: z.array(z.string().max(120)).min(1).max(4),
    reasons: z.array(z.string().max(120)).max(3), // short evidence, not hidden reasoning
  }),
  prompt: (input: { text: string }) => ({
    system: "You triage reports for <office>. Categories: … Priority is urgent when … Use only the report text. Reply in English.",
    prompt: input.text,
  }),
  demo: (input) => keywordTriage(input.text), // pure, deterministic, same schema
});
```

Topic-specific tasks live in `src/` next to the feature that uses them. Change `rcene/ai` only for something generic, and list it in `NOTES.md` under "Shared-code changes".

## Rules

1. **Prompt:** name the allowed categories with one-line definitions, the priority rules, the output language, "use only the given text". Ask for 1–3 short reasons quoted from the input. Never ask for chain-of-thought.
2. **`demo()`:** pure and deterministic; keyword rules in English, Waray and Filipino over the topic's categories; never empty (fall back to a sensible default with a "low confidence" reason); has a `*.test.ts`. Update it whenever the prompt's categories change.
3. **Display:** render the result with `AiInsightCard`. It shows the fields, provider, model, latency, a "fallback" label when the live call failed, and "AI suggestion — a person confirms".
4. **A person confirms:** accept, edit or reject before anything is saved. Store both the suggestion and the final choice on the record, so the timeline can show "AI suggested X, officer chose Y".
5. **Fallback:** no key, offline, timeout (`AI_TIMEOUT_MS`) or invalid JSON → the demo answer, labelled. Never a raw error, never an endless spinner.
6. **Keys:** only in `.env.local` (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, `LOCAL_AI_BASE_URL`), never `VITE_`-prefixed, never in `src/`. The relay at `/api/ai/*` inside the Vite dev/preview server adds them. The browser never sees a key.
7. **Run it the way existing screens do** (see the triage on `/admin/lab` and the AI lab page); do not call a provider SDK or `fetch` a provider from `src/`.

## Verify

1. `npm run test` (the `demo()` tests).
2. `/admin/lab`: run the task with the demo provider, then with the live one.
3. `/admin/ai`: the connection test passes; the activity log shows the call, provider, model and latency.
4. Choose a provider that is not configured (or go offline): the card answers from `demo()` and says "fallback".
5. Record the AI work in `AI-LOG.md` at the next `/checkpoint`.
