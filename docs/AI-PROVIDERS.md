# AI providers: set up, test, troubleshoot

The app's AI features (triage, briefing, drafts, extraction, grounded answers) run on any of five providers. Choose on **`/admin/ai`**; architecture in `docs/04-AI-ARCHITECTURE.md` and `rcene/ai/README.md`.

| Provider | Needs | Default model | Notes |
|---|---|---|---|
| **Demo rules** | nothing | — | offline, instant, deterministic. Always the fallback |
| **OpenAI (ChatGPT)** | `OPENAI_API_KEY` | `gpt-5.4-mini` | the primary live provider. JSON mode; no custom temperature (reasoning models reject it) |
| **Claude (Anthropic)** | `ANTHROPIC_API_KEY` | `claude-haiku-4-5-20251001` | structured output through a forced tool with the JSON Schema |
| **Gemini (Google)** | `GEMINI_API_KEY` | `gemini-2.5-flash` | `responseMimeType: application/json` |
| **Local model** | a running Ollama or LM Studio + `LOCAL_AI_BASE_URL`, `LOCAL_AI_MODEL` | `llama3.2` | offline if the model is pulled beforehand; small models are slower and less accurate |

## Set up (once, today, online)

1. Copy `.env.example` to **`.env.local`** (same folder). It is git-ignored; never commit it, never paste a key into chat, code or docs.
2. Paste the key after `OPENAI_API_KEY=` (and any others you have). Leave `AI_PROVIDER=openai`.
3. `npm run dev` (restart it after every edit of `.env.local`).
4. Open `http://localhost:5201/admin/ai` → the OpenAI card says **Ready** → **Test connection** → "OpenAI answered in … s".
5. `/admin/lab` → run each tab once. Check the answers make sense and the time per answer (aim for under 5 s).
6. Model too slow or not found? Type another model id in **Model for OpenAI** on `/admin/ai` (stored in the browser, no restart), or set `OPENAI_MODEL` in `.env.local`. For reasoning models, `OPENAI_REASONING_EFFORT=low` may speed them up (only if the model accepts it).

Optional: a local model for a fully offline live AI: install Ollama, `ollama pull llama3.2`, then `LOCAL_AI_BASE_URL=http://localhost:11434/v1` and `LOCAL_AI_MODEL=llama3.2`. LM Studio: its server URL (usually `http://localhost:1234/v1`) and `LOCAL_AI_JSON_MODE=json_schema`.

## At the venue

- Run the connection test on the venue Wi-Fi first thing. If it fails, choose **Demo rules** (or keep OpenAI with the fallback switch on: every answer then says "Fallback: demo rules" and why).
- Keep **Fall back to the demo rules** on for the live demo. The app always answers; it never hangs on the network.
- The activity log on `/admin/ai` shows every run in every window: a good thing to show judges ("this answer came from OpenAI gpt-5.4-mini in 1.8 s").

## Troubleshooting

| You see | Means | Do |
|---|---|---|
| "Not set up" on a provider | no key in `.env.local` for it, or the dev server was not restarted | add the key, restart `npm run dev`, **Check again** |
| "The AI relay is not running here" | a static build (`dist/`) or the page opened from a file | use `npm run dev` or `npm run preview` |
| `HTTP 401` | wrong or revoked key | fix the key; restart |
| `HTTP 429` | rate limit or no credit | wait, use another provider, or the demo rules |
| `HTTP 404` / "model not found" | the model id doesn't exist for this account | change the model on `/admin/ai` |
| "did not answer within 30 s" | slow model or network | a faster model; raise `AI_TIMEOUT_MS`; or the demo rules |
| "did not match the expected format" | the model's JSON was off | run again; try another model; the fallback answered meanwhile |

## Security

- Keys are read by the relay inside the Vite dev/preview server (Node). The browser only sees which providers are ready, never a key. The relay accepts only same-origin JSON requests and caps their size.
- The guard hook blocks Claude Code from reading `.env*` files (except `.env.example`).
- A report typed into the app is sent to the provider chosen, and only then. Use synthetic or consented data in the demo; no personal names.
