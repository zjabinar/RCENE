# Skills, plugins and Claude Code features for the RCENE build

**Purpose:** build 20 apps fast, with about 5 Claude Code sessions running in parallel (more if your usage plan allows), and score well on AI use, GIS, frontend design and UI/UX.

**How this was chosen:**
- Reviewed this repo: the PRD, the 30 proposals and the codebase spec.
- Searched the Claude plugin catalog on 2026-10-03.
- Matched both against the rubric: AI use 20%, innovation 20%, functionality 20%, UX/UI 15%, relevance 15%, poster 10%.

**Rule of thumb:** every enabled skill and plugin adds its description to every session's context. Twenty sessions pay that cost twenty times. So install few things at user scope, and put specialised ones only where they're needed.

## TL;DR — install these

| Scope | What | Why | Install (in Claude Code) |
|---|---|---|---|
| Already in repo | **Project skills** `maplibre-gis`, `geo-data-prep`, `offline-ai`, `gsap-motion`, `r3f-scenes` | GIS, data prep, in-browser AI, motion, 3D, all written for this stack and its pinned versions | nothing (in `.claude/skills/`) |
| Already in repo | **Playwright MCP** (`.mcp.json`, `--isolated`) | Each session drives its app in a real browser and screenshots it; isolated profiles let 5 sessions run at once | nothing (trust the project MCP server when asked) |
| User | **Superpowers** (obra, partner) | TDD, systematic debugging, verification-before-completion. You already use it (`docs/superpowers/`). `CLAUDE.md` tells unattended sessions to skip brainstorming and branch-finishing | `/plugin` → Discover → "superpowers", or `/plugin marketplace add obra/superpowers-marketplace` then `/plugin install superpowers@superpowers-marketplace` |
| User | **frontend-design** (Anthropic) | A distinctive UI direction instead of generic "AI look"; works inside the `@rcene/ui` tokens | `/plugin install frontend-design@claude-plugins-official` |
| User | **Design** (Anthropic): `design-critique`, `accessibility-review`, `ux-copy`, `design-system` | UX/UI is 15%. Critique and accessibility passes in the polish phase; plain, non-alarming hazard wording (`ux-copy`) | `/plugin marketplace add anthropics/knowledge-work-plugins` then `/plugin install design@knowledge-work-plugins` |
| Local, only in the 06 / 10 / 20 worktrees | **huggingface-skills** (Hugging Face, partner): its `transformers-js` skill | In-browser AI for the three ★AI apps; complements the project `offline-ai` skill | inside that worktree: `/plugin marketplace add huggingface/skills` then `/plugin install` it with *local* scope |
| Keep | **ECC** (everything-claude-code), already installed | Your spec lists `ecc:react-build`, `ecc:react-review`, `ecc:frontend-patterns`, `ecc:react-patterns`, `ecc:make-interfaces-feel-better` | already set: `ECC_GATEGUARD=off` in `.claude/settings.json`. Its fact-forcing gate would stall unattended sessions |

Marketplace names change. If an install command fails, open `/plugin`, choose Discover, and search by name. Then run `/reload-plugins` or restart the session.

## By goal

### 1. Speed and many sessions at once

| Tool | Use it for |
|---|---|
| **git worktrees + `scripts/launch-worktrees.ps1`** | One worktree, branch and Claude session per app, in batches. Details in `docs/PARALLEL.md`. Claude Code's built-in `--worktree` isn't used, because the launcher also installs dependencies and passes each brief |
| **SessionStart hook** (`scripts/hooks/session-context.mjs`) | Tells each session its project, brief, port, data status and current `STATUS.md`, so a resumed session continues where it left off |
| **PreToolUse guard** (`scripts/hooks/guard.mjs`) | Keeps a session inside `apps/<its-slug>/`, blocks `git push`/`merge`/`rebase`, and always blocks `D:\monica`, `C:\lgu_portal` and credential files |
| **Committed permission allowlist** (`.claude/settings.json`) | Fewer prompts. On Windows, "don't ask again" approvals stay in the worktree where you gave them, so this shared file matters |
| `--permission-mode acceptEdits` (launcher default) | File edits go through without prompting; the allowlist covers routine commands |
| `/fewer-permission-prompts` (built-in) | After batch 1, scans the transcripts and proposes more allowlist rules. Commit the result before batch 2 |
| `claude --continue` (`launch-worktrees.ps1 -Resume`) | Resume a session after a usage limit or a reboot |
| `/usage` | Check before adding sessions. Start with 3, then grow to 5 |
| `-Model` on the launcher | Run later or easier batches on a cheaper model |
| Subagents (built-in) | Fine inside one session for research or review. Avoid heavy subagent-driven development in all 5 sessions at once, because it multiplies token use |
| `/loop` (built-in) | Optional: in the main checkout, `/loop 30m` to check `launch-worktrees.ps1 -Status` and summarise progress |

### 2. GIS and maps

No GIS or MapLibre skill exists in the plugin catalog, so this repo ships its own:
- **`maplibre-gis`** (project skill): react-map-gl/maplibre with maplibre-gl **6** (its breaking changes are spelled out), the offline basemap (no glyphs, so labels are HTML markers), hazard styling, three-state lookups, nearest facility, choropleths, popups, animated routes, and deck.gl overlays.
- **`geo-data-prep`** (project skill): tested mapshaper recipes for UTM 51N → WGS84, clip, dissolve by level, simplify, KML/KMZ → GeoJSON, `sources.json`, validation. Used by the local data session (B0).
- **`@rcene/geo` and `@rcene/map` packages:** the tested code those skills describe. Sessions reuse it instead of re-deriving point-in-polygon logic 20 times.

### 3. AI: the 20% criterion

The apps call **no runtime AI API** (your decision). AI is scored on how you built them, plus in-browser AI in three apps.

| Tool | Use it for |
|---|---|
| **Per-app `AI-LOG.md`** + commit discipline | The evidence base: one row per commit (asked, produced, kept or rejected, why) |
| **The parallel build itself** | Poster material: 20 briefs as specs, 5 concurrent agents, hook guardrails, Playwright screenshots as verification |
| **`offline-ai`** (project skill) + **`transformers-js`** (Hugging Face skill, local scope) | ★AI apps: 06 photo-severity suggestion, 10 complaint categorisation, 20 semantic service search. Runs in a Web Worker with no network and no key. Models are fetched once with `node scripts/fetch-models.mjs` |
| **Waray review loop** (`packages/i18n/REVIEW.md`) | AI drafts Waray, a human corrects it, and the before/after becomes a poster panel |
| `claude-api` (built-in) | Only after the competition, if you add a Claude-powered feature to a real deployment |

### 4. Frontend design and UI/UX (15%)

| Tool | When |
|---|---|
| **frontend-design** (Anthropic) | When a session starts a screen: picks a direction within the shared tokens |
| **Design → `design-critique`** | Polish phase: critique screenshots from `docs/screenshots/` |
| **Design → `accessibility-review`** + `scripts/smoke.mjs` (axe-core) | Every app must pass axe with no serious or critical issues, at 390 px and 1280 px |
| **Design → `ux-copy`** | Hazard answers, warnings, empty and error states. Calm and precise, never "safe" |
| **`dataviz`** (built-in) | Every chart: dashboards 04, 11, 13, 19, stat tiles, capacity bars |
| **`gsap-motion`** (project) | Signature motion moments: count-ups, staggered chips, self-drawing trails, scroll stories |
| **`r3f-scenes`** (project) | Only 02 Tubig and 17 Banig |
| `run` (built-in) | Launch an app and look at it |

### 5. Quality before merging a branch

Run these in the main checkout, with the branch checked out or as the review target:
1. `/code-review` (built-in). Use high effort for shared-code changes.
2. `/simplify` (built-in). Cleanup only.
3. `/security-review` (built-in). Mainly for apps with forms or file inputs (06, 08, 10, 19).
4. `node scripts/smoke.mjs --app <slug>`. The same gate the session used.

## Considered and not recommended

| Option | Why not |
|---|---|
| Playwright **plugin** | Use the project `.mcp.json` with `--isolated` instead. The plugin's shared profile breaks with concurrent sessions |
| **Axe Accessibility** (Deque) plugin | Its MCP server may need a Deque account. The smoke script already runs free axe-core. Add the plugin only if the license works for you |
| "Skills For Real React/React Native Engineers" (community) | Its GSAP and motion guidance overlaps with and contradicts the project `gsap-motion` skill, and its React Native half is irrelevant |
| design-superpowers, ux-superpowers, sdd-superpowers, beads-superpowers (community) | Process-heavy and question-asking. They fight unattended sessions and duplicate Superpowers and Design |
| Fairmind Design | Figma-centric. There are no Figma files here |
| Snagly (community QA) | Good, but `smoke.mjs` plus Playwright MCP cover what you need. Revisit after Oct 7 |
| `session-start-hook` (built-in) | Only if you move sessions to Claude Code on the web; the existing hook already installs dependencies when `CLAUDE_CODE_REMOTE=true` |

## Per-batch checklist

1. **Before B0:** install Superpowers, frontend-design and Design at user scope. Trust the project `.mcp.json` once.
2. **After B1:** run `/fewer-permission-prompts` in one finished worktree, review the rules, and commit them to `.claude/settings.json` on main before B2.
3. **Before B2:** in the 20-sumat worktree only, add `huggingface-skills` with local scope, and run `node scripts/fetch-models.mjs --app 20` once while online. Do the same before B3 for 10-reklamo, and before B4 for 06-snap.
4. **Each merge:** review with `/code-review` and the smoke test, then merge into main.
