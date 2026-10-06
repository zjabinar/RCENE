/** Connection test: the smallest task, used by "Test connection" on the AI settings page. */
import { z } from "zod";
import { defineAiTask } from "../task.ts";

export interface PingOutput {
  ok: boolean;
  reply: string;
}

export const pingTask = defineAiTask<Record<string, never>, PingOutput>({
  id: "ping",
  system: "You are a connection test for a web application.",
  prompt: () => 'Answer {"ok": true, "reply": "<one short friendly sentence saying the AI connection works>"}.',
  output: () => z.object({ ok: z.boolean(), reply: z.string().min(1) }),
  maxTokens: 200,
  demo: () => ({ ok: true, reply: "Demo rules are ready: no network needed." }),
});
