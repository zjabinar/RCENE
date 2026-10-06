# Add a New AI Task

Use only when none of the generic tasks (classify, brief, extract, draft, answer) fits. Before FEATURE FREEZE only. Fill the `<…>` parts.

```text
Add one AI task and wire it to one screen. Follow skill ai-feature,
docs/04-AI-ARCHITECTURE.md and rcene/ai/README.md. Copy the structure of an
existing task in rcene/ai; do not invent a new pattern.

Task: <id, e.g. "check-requirements">
Screen: <route and the button that triggers it>
Input: <fields and types>
Output fields: <name: type (allowed values)>, plus reasons: up to 3 short
quoted phrases from the input
Demo rule: <deterministic rule, e.g. keywords per category in en/war/fil;
default when nothing matches>
Who confirms: <role> accepts, edits or rejects
Stored as: <record field / timeline entry>

Steps:
1. defineAiTask in src/ next to the feature (not in rcene/ai unless generic):
   id, typed input, zod output schema, prompt (system + user; categories,
   rules, language, "use only the given input"; no chain-of-thought), demo().
2. A *.test.ts for demo(): every category reachable, the default case, Waray
   and Filipino inputs.
3. Run it the same way the existing screens do; show the result with
   AiInsightCard (provider, model, latency, "fallback" label, "AI suggestion —
   a person confirms"); accept / edit / reject before saving.
4. Make it runnable on /admin/lab if the lab lists tasks.
5. Add its row to docs/project/AI-WORKFLOW.md.
No new providers, no keys in src/, nothing VITE_-prefixed, no new dependencies.

Verify: npm run typecheck, npm run test, the screen with the demo provider,
with OpenAI, and with a not-configured provider (must say "fallback").
Report what changed. Do not commit.
```
