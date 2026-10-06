---
name: poster
description: The A3 competition poster as the /poster route, built on @rcene/kit/poster (PosterPage + SixPanelPoster, PosterFigure, AiBuiltPanel, QrToApp) and printed to PDF from Chrome. Use when writing poster copy, filling docs/POSTER-CONTENT.md, choosing poster screenshots or figures, adding the QR code, the AI disclosure line, or when the poster overflows or prints wrong.
---

# The poster

Poster and presentation are 10% of the score. The poster is a page in the app, `/poster`, so it uses the same theme, fonts and strings and prints to one A3 sheet.

Full block reference: `rcene/kit/poster/README.md` and skill `rcene-design`.

## Content first: `docs/POSTER-CONTENT.md`

`SixPanelPoster` has a title band and six panels. Write each in a few lines:

| Panel key | Heading | Content |
|---|---|---|
| title / subtitle | title band | app name; one-line pitch |
| `problem` | The problem | 2–3 short points, one local fact |
| `picture` | The app in one picture | one screenshot from `docs/screenshots/` (1280 px, light) or an SVG figure |
| `different` | What's different | 3 bullets: the AI step, offline fallback, local languages, or the topic's own angle |
| `ai` | How AI built it | `AiBuiltPanel`: tools and roles, the process steps, the disclosure line |
| `data` | Data | sources (as on `/sources`), "synthetic, coded, no personal data" |
| `impact` | Impact | 2–3 bullets; estimates labelled as estimates |
| `qr` | QR | `QrToApp` with the laptop's LAN address |
| `footer` | footer | RSCENE 2026 · Catbalogan City · builder |

The AI panel shows two things: AI inside the app (the task, the provider, a person confirms) and AI used to build it (Claude Code). The disclosure line comes from `docs/DISCLOSURE.md`, section "Poster version".

## Build

- `/poster` renders `<PosterPage title="…">` (A3 portrait by default) around `<SixPanelPoster title subtitle panels qr footer />`.
- All text through `src/i18n/strings.ts`.
- Figures: `PosterFigure` around an SVG (a Recharts chart is SVG). WebGL maps do not print; use a screenshot `<img>` instead.
- QR: run `npm run preview -- --host` and use the printed LAN address (preview port 6400) so phones on the same Wi-Fi can open it.
- A yellow notice under the toolbar means overflow: shorten text or use a smaller picture.

## Print

Chrome or Edge → **Print** button → Save as PDF → Margins: **None** → **Background graphics on**. Check that the PDF is one page. If the organisers need a printed copy, ask at the start of the event when and where, and export the PDF by T+3:50.

## Rules

Short bullets, not paragraphs. Large type. Colour + icon + text. One showcase surface (the title band). No claim the demo cannot show.
