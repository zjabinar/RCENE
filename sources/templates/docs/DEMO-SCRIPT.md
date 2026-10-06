# Demo Script

Target 3:00. Start at `/demo` (reset + scenario). Present with `/?present`; notes on `/presenter`.

| # | Beat | Sec | Route | Click / paste | Judge sees | Presenter step id |
|---|---|---|---|---|---|---|
| 1 | Problem | 25 | `/` | | | `problem` |
| 2 | User and input | 25 | `/console/new` | | | `input` |
| 3 | AI | 45 | `/console/new` | | | `ai` |
| 4 | Decision and action | 45 | `/console/:id` | | | `action` |
| 5 | Reach | 15 | `/resident?code=` · `/board` | | | `reach` |
| 6 | Impact | 25 | `/console` | | | `impact` |

## Scripted input (paste, do not type)

```text
```

## Record the demo opens

## Impact sentence

## Backup

| If | Then |
|---|---|
| live AI slow or failing | `/admin/ai` → provider `demo`; card says "fallback" |
| app fails | last good build with `npm run preview`; else `docs/screenshots/` |
| a step breaks | press → and continue the story |
