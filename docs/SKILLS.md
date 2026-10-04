# Skills, plugins and Claude Code features for the RCENE build

**Purpose:** build 20 apps fast, with about 5 Claude Code sessions running in parallel (more if your usage plan allows), and score well on AI use, GIS, frontend design and UI/UX.

**How this was chosen:**
- Reviewed this repo: the PRD, the 30 proposals and the codebase spec.
- Searched the Claude plugin catalog on 2026-10-03.
- Matched both against the rubric: AI use 20%, innovation 20%, functionality 20%, UX/UI 15%, relevance 15%, poster 10%.

**Rule of thumb:** every enabled skill and plugin adds its description to every session's context. Twenty sessions pay that cost twenty times. So enable few things, and put specialised ones only where they're needed.

**Where things live now.** Every app folder is self-contained, and its sessions start inside it. So the app skills, the Playwright MCP server, the hooks and the plugin settings ship **inside each app** (copied from `apps/_template/` by `pnpm new-app` and kept current by `pnpm sync-shared`). The repo root keeps only what root sessions need. Claude Code also loads ancestor `CLAUDE.md` files and the root `.claude/skills/` in an app session, which is why the root skills folder holds only `geo-data-prep`, so nothing is listed twice.

## TL;DR

| Scope | What | Why | Setup |
|---|---|---|---|
| In every app (`.claude/skills/`) | **App skills** `rcene-design`, `maplibre-gis`, `offline-ai`, `gsap-motion`, `r3f-scenes` | The design kit and themes, GIS, in-browser AI, motion, 3D, all written for this stack, its pinned versions and the app folder layout (`rcene/`, `data/`, `models/`, `npm run …`) | nothing |
| Repo root (`.claude/skills/`) | **Root skill** `geo-data-prep` | Data conversion for the 00-data session, which runs at the root | nothing |
| In every app (`.mcp.json`) | **Playwright MCP** (`@playwright/mcp` from the app's own devDependencies, `--isolated`) | Each session drives its app in a real browser and screenshots it; isolated profiles let 5 sessions run at once; works in a copied folder too | approve the project MCP server when asked |
| Enabled by every app's `.claude/settings.json` | **Superpowers** (obra, partner) | TDD, systematic debugging, verification-before-completion. The app's `CLAUDE.md` tells unattended sessions to skip brainstorming, worktrees and branch-finishing | one-time install, below |
| Enabled by every app | **frontend-design** (Anthropic) | A distinctive UI direction instead of the generic "AI look"; works inside the shared `@rcene/ui` tokens | one-time install, below |
| Enabled by every app | **Design** (Anthropic): `design-critique`, `accessibility-review`, `ux-copy`, `design-system` | UX/UI is 15%. Critique and accessibility passes in the polish phase; plain, non-alarming hazard wording (`ux-copy`) | one-time install, below; review its connectors |
| Optional, local scope in the AI apps (06, 10, 20, P2, P5) | **huggingface-skills** (Hugging Face, partner): its `transformers-js` skill | General Transformers.js API help; `offline-ai` still wins on paths, offline setup and UX rules | inside that app folder: `/plugin marketplace add huggingface/skills`, then `/plugin install` with *local* scope |
| Keep | **ECC** (everything-claude-code), if installed | The spec lists `ecc:react-build`, `ecc:react-review`, `ecc:frontend-patterns`, `ecc:react-patterns`, `ecc:make-interfaces-feel-better` | each app's settings set `ECC_GATEGUARD=off`: its fact-forcing gate would stall unattended sessions |

### One-time plugin install (each machine, while online)

The app settings declare the marketplaces (`extraKnownMarketplaces`) and enable the plugins (`enabledPlugins`), but **enabling doesn't download anything**. Install them once per machine:

```powershell
claude plugin install frontend-design@claude-plugins-official
claude plugin marketplace add anthropics/knowledge-work-plugins
claude plugin install design@knowledge-work-plugins
claude plugin marketplace add obra/superpowers-marketplace
claude plugin install superpowers@superpowers-marketplace
```

- The Superpowers marketplace name is **unverified**. If the install fails, open `/plugin` → Discover, search "superpowers", use the name it shows, and update `apps/_template/.claude/settings.json` to match (then `pnpm sync-shared --all --only claude`).
- The **Design** plugin lists remote connectors (Asana, Figma, Slack, Gmail, …). Run `claude plugin details design@knowledge-work-plugins` and disable the connectors you don't need, so unattended sessions never try them.
- A plugin that isn't installed is simply missing from a session; nothing fails. Marketplace names change: after any install, run `/reload-plugins` or restart the session.

## The stack in every app

Every app's `package.json` carries the full stack at exact versions (from `stack.json`), so no session needs to install anything:

- **Core:** React 19.3, react-router 7.18, zustand, zod 4, react-hook-form (+ resolvers), Tailwind 4 (+ tw-animate-css), radix-ui, class-variance-authority, clsx, tailwind-merge, lucide-react 0.577, Inter (fontsource), sonner, cmdk, fuse.js.
- **Maps and GIS:** maplibre-gl 6.11 + react-map-gl 8.1, @turf/turf 7, deck.gl 9.4 as `@deck.gl/core`, `@deck.gl/layers`, `@deck.gl/aggregation-layers` and `@deck.gl/maplibre` (`MapLibreOverlay`). Not the `deck.gl` meta-package, which drags in `@arcgis/core` (~250 MB).
- **Motion:** motion 12, gsap + `@gsap/react`, lenis.
- **Charts and tables:** recharts 3, @tanstack/react-table 8.
- **3D:** three, @react-three/fiber 9, @react-three/drei.
- **AI, PWA, QR:** @huggingface/transformers 4 (models in the app's `models/`), vite-plugin-pwa, qrcode, html5-qrcode.
- **Dev:** vite 8, typescript 6, vitest 4, @testing-library/{react,dom,user-event}, jsdom, playwright, axe-core, @playwright/mcp, oxlint.

## By goal

### 1. Speed and many sessions at once

| Tool | Use it for |
|---|---|
| **git worktrees + `scripts/launch-worktrees.ps1`** | One worktree, branch and Claude session per app, in batches, each session started in `<worktree>\apps\<slug>`. Details in `docs/PARALLEL.md`. Claude Code's built-in `--worktree` isn't used, because the launcher also installs dependencies and passes each brief |
| **SessionStart hook** (each app's `scripts/hooks/session-context.mjs`) | Tells each session its project, mode, brief, ports, data and model status and current `STATUS.md`, so a resumed session continues where it left off |
| **PreToolUse guard** (each app's `scripts/hooks/guard.mjs`) | Keeps a session inside its app folder, protects `data/` and `docs/brief.md` on project branches, blocks `git push`/`merge`/`rebase`/branch switching there, and always blocks `D:\monica`, `C:\lgu_portal` and credential files |
| **Committed permission allowlist** (each app's `.claude/settings.json`) | Fewer prompts. On Windows, "don't ask again" approvals stay in the folder where you gave them, so this shared file matters |
| `--permission-mode acceptEdits` (launcher default) | File edits go through without prompting; the allowlist covers routine commands |
| `/fewer-permission-prompts` (built-in) | After batch 1, run it in one finished app folder, review the rules, add them to `apps/_template/.claude/settings.json` and push them out with `pnpm sync-shared` before batch 2 |
| `claude --continue` (`launch-worktrees.ps1 -Resume`) | Resume a session after a usage limit or a reboot |
| `/usage` | Check before adding sessions. Start with 3, then grow to 5 |
| `-Model` on the launcher | Run later or easier batches on a cheaper model |
| Subagents (built-in) | Fine inside one session for research or review. Avoid heavy subagent-driven development in all 5 sessions at once, because it multiplies token use |
| `/loop` (built-in) | Optional: in the main checkout, `/loop 30m` to check `launch-worktrees.ps1 -Status` and summarise progress |

### 2. GIS and maps

No GIS or MapLibre skill exists in the plugin catalog, so this repo ships its own:
- **`maplibre-gis`** (app skill): react-map-gl/maplibre with maplibre-gl **6** (its breaking changes are spelled out), the offline basemap (no glyphs, so labels are HTML markers), hazard styling, three-state lookups, nearest facility, choropleths, popups, animated routes, and deck.gl overlays through `MapLibreOverlay`.
- **`geo-data-prep`** (root skill): tested mapshaper recipes for UTM 51N → WGS84, clip, dissolve by level, simplify, KML/KMZ → GeoJSON, `sources.json`, validation. Used by the local data session (B0) at the repo root; its output goes to root `data/files/`, then `pnpm sync-data`.
- **`@rcene/geo` and `@rcene/map`** (each app's `rcene/geo/` and `rcene/map/`): the tested code those skills describe. Sessions reuse it instead of re-deriving point-in-polygon logic 20 times.

### 3. AI: the 20% criterion

The apps call **no runtime AI API** (your decision). AI is scored on how you built them, plus in-browser AI in three apps.

| Tool | Use it for |
|---|---|
| **Per-app `AI-LOG.md`** + commit discipline | The evidence base: one row per commit (asked, produced, kept or rejected, why) |
| **The parallel build itself** | Poster material: 20 briefs as specs, 5 concurrent agents, hook guardrails, Playwright screenshots as verification |
| **`offline-ai`** (app skill) + **`transformers-js`** (Hugging Face skill, optional, local scope) | ★AI apps: 06 photo-severity suggestion, 10 complaint categorisation, 20 semantic service search. Runs in a Web Worker with no network and no key. Models are fetched once into the app's own `models/` (gitignored) with `npm run fetch-models -- --model e5\|clip`, or from the root with `node scripts/fetch-models.mjs --app <slug>` (shared download cache) |
| **Waray review loop** (`rcene/i18n/REVIEW.md` in each app) | AI drafts Waray, a human corrects it, and the before/after becomes a poster panel |
| `claude-api` (built-in) | Only after the competition, if you add a Claude-powered feature to a real deployment |

### 4. Frontend design and UI/UX (15%)

| Tool | When |
|---|---|
| **`rcene-design`** (app skill) + the kit gallery (`apps/kit-gallery`, port 5300) | First, for every screen: the theme (5 palettes x light/dark), the showcase surface, and the ready-made blocks in `@rcene/kit` (consoles, tables, forms, wizards, boards, hero, scrollytelling, poster, presenter mode, brand). `apps/starter-app` and `apps/starter-site` are complete pages to copy from |
| **frontend-design** (Anthropic) | When a screen needs something the kit doesn't cover: picks a direction within the shared tokens |
| **Design → `design-critique`** | Polish phase: critique the screenshots in the app's `docs/screenshots/` |
| **Design → `accessibility-review`** + `npm run smoke` (axe-core) | Every app must pass axe with no serious or critical issues, at 390 px and 1280 px |
| **Design → `ux-copy`** | Hazard answers, warnings, empty and error states. Calm and precise, never "safe" |
| **`dataviz`** (built-in) | Every chart: dashboards 04, 11, 13, 19, stat tiles, capacity bars |
| **`gsap-motion`** (app skill) | Signature motion moments: count-ups, staggered chips, self-drawing trails, scroll stories |
| **`r3f-scenes`** (app skill) | Only 02 Tubig and 17 Banig |
| `run` (built-in) | Launch an app and look at it |

### 5. Quality before merging a branch

Run these in the main checkout, with the branch checked out or as the review target:
1. `/code-review` (built-in). Use high effort for changes to the app's `rcene/` copy.
2. `/simplify` (built-in). Cleanup only.
3. `/security-review` (built-in). Mainly for apps with forms or file inputs (06, 08, 10, 19).
4. `node scripts/smoke.mjs --app <slug>`. The same gate the session used (`npm run smoke` in the app).

## Considered and not recommended

| Option | Why not |
|---|---|
| Playwright **plugin** | Use each app's `.mcp.json` with `--isolated` instead. The plugin's shared profile breaks with concurrent sessions |
| **Axe Accessibility** (Deque) plugin | Its MCP server may need a Deque account. The smoke test already runs free axe-core. Add the plugin only if the license works for you |
| "Skills For Real React/React Native Engineers" (community) | Its GSAP and motion guidance overlaps with and contradicts the `gsap-motion` skill, and its React Native half is irrelevant |
| design-superpowers, ux-superpowers, sdd-superpowers, beads-superpowers (community) | Process-heavy and question-asking. They fight unattended sessions and duplicate Superpowers and Design |
| Fairmind Design | Figma-centric. There are no Figma files here |
| Snagly (community QA) | Good, but the smoke test plus Playwright MCP cover what you need. Revisit after Oct 7 |
| `session-start-hook` (built-in) | Only if you move sessions to Claude Code on the web; each app's hook already installs dependencies when `CLAUDE_CODE_REMOTE=true` (`pnpm install` in the monorepo, `npm ci` standalone) |

## Per-batch checklist

1. **Before B0:** install the three plugins once (commands above) and review the Design connectors. Trust the main checkout once.
2. **After B1:** run `/fewer-permission-prompts` in one finished app folder, review the rules, and add them to `apps/_template/.claude/settings.json` on main. Then `pnpm sync-shared --all --only claude` before B2.
3. **Before B2:** inside `apps/20-sumat` of its worktree only, optionally add `huggingface-skills` with local scope, and fill its `models/` once while online (`node scripts/fetch-models.mjs --app 20-sumat`). Do the same before B3 for 10-reklamo, and before B4 for 06-snap.
4. **Each merge:** review with `/code-review` and the smoke test, then merge into main.
