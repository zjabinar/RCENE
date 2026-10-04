# @rcene/kit/poster

The two deliverables besides the app itself: the **project poster** (problem, AI tools, development process, impact) and the **live demonstration** before the judges. A print-exact A3/A2 sheet, the six-panel layout from PRD §14, figures that print, the "How AI built it" panel, a QR code to the app, and a presenter bar with a notes window for the demo. Everything works offline.

```tsx
import {
  AiBuiltPanel, PosterFigure, PosterPage, PresenterMode, PresenterNotes, PrintButton, QrToApp, SixPanelPoster,
} from "@rcene/kit/poster";
```

## Poster workflow (recommended)

1. Add a `/poster` route that renders `<PosterPage title="<App> poster"><SixPanelPoster …/></PosterPage>` on **A3 portrait** (the default). Put real content in the six panels: one sentence per problem point, a screenshot or an SVG figure for "the app in one picture", three bullets for what's different, `AiBuiltPanel` with the app's own disclosure line (`docs/DISCLOSURE.md`, "Poster version"), the data sources, impact and next steps.
2. Look at the preview: it is the sheet at its real size, scaled to fit. A yellow notice under the toolbar means something runs past the edge and would be cut off: shorten the text or use a smaller picture (text panels never clip; the picture panel gives way first).
3. **Print to PDF from Chrome or Edge**: press **Print**, choose "Save as PDF", set **Margins: None** and turn **Background graphics on**. The paper size comes from the page (`@page`), the PDF is named after `title`, and only the sheet prints (no header, nav, footer, toasts or presenter bar). Check the PDF is one page, then take it to the print shop.
4. Need a bigger print? Switch to **A2** in the toolbar: the same layout, 1.41× larger (the content is designed on A3 and zoomed), so nothing reflows.
5. **WebGL maps (MapLibre, deck.gl, three.js) do not print reliably.** For the poster use SVG figures (`PosterFigure` around an SVG chart or an SVG map), or a PNG screenshot of the map in `<img>`. `PosterFigure downloadSvg` also saves a figure as a standalone `.svg` for another layout tool.

Inside the sheet, `printTone="light"` (default) paints the light variant of the current palette even when the app is in dark mode (gabi's light mode is its print variant). Tailwind `dark:` classes stop at a light region (the custom `dark` variant in `globals.css` excludes anything inside `[data-mode="light"]` below `<body>`), so the sheet stays light.

## Demo workflow (recommended)

1. Turn `DEMO.md` (the golden path, two minutes or less) into data: `PresenterStep[]`, one step per beat, each with a short `caption` for the audience, the `route` it starts on, speaker `notes` and a time budget in `seconds`. Captions and notes go through `src/i18n/strings.ts`.
2. Mount `<PresenterMode steps={steps} />` once, in the app layout, only when presenting (e.g. when the app was opened with `?present`). Inside the router it navigates by itself; pass `onNavigate` to do it your way.
3. Add a `/presenter` route with `<PresenterNotes steps={steps} />` and open it in a second window (on the laptop screen while the projector shows the app). Both windows share the step and the timer through the synced store `rcene:presenter`.
4. Present: **→ / Space / PageDown** next (a presentation clicker works), **← / PageUp** back, **T** starts or pauses the timer, **Esc** hides the bar, **P** brings it back. While the bar is hidden only P works, so the app gets its arrow keys back when a judge wants to try something. Keys typed in inputs, sliders, tabs, maps, dialogs and anything inside `data-presenter-keys="off"` are left alone.
5. Rehearse with the timer; reset it with the reset button in the notes window, or reset everything with **Reset demo** (`resetDemo`, which also clears the presenter store).

With several app windows (a platform's roles side by side), the window you press keys in navigates; a change made in the notes window navigates the window that last drove the demo (or every app window before any of them did).

## Blocks

**`PosterPage`** `{ size?: "A3" | "A2"; orientation?: "portrait" | "landscape"; printTone?: "light" | "screen"; title?: string; toolbar?: boolean; onChange?: ({ size, orientation }) => void; className?; children }`. A sheet at its exact physical size (A3 297 × 420 mm, A2 420 × 594 mm), on a 12-column grid with a 12 mm margin and a 6 mm gap (CSS variables `--poster-margin`, `--poster-gap`). While mounted it injects `@page { size: …; margin: 0 }` and a print stylesheet that shows only the sheet; `print-color-adjust: exact` keeps the colours. On screen: a fit-to-width preview (`ResizeObserver` + `transform: scale`), a toolbar (size A3/A2, orientation, "Preview at n%", **Print**) that never prints, the print-dialog hint and the overflow notice. `title` names the sheet (`<article aria-label>`) and the PDF. `usePosterSheet()` gives children `{ size, orientation, widthMm, heightMm, zoom, inSheet }`; `posterDimensions(size, orientation)` and `posterPrintCss(w, h)` are exported too.

```tsx
<PosterPage title="Andam poster">
  <SixPanelPoster … />
</PosterPage>
```

**`SixPanelPoster`** `{ title: ReactNode; subtitle?: ReactNode; panels: Record<"problem" | "picture" | "different" | "ai" | "data" | "impact", ReactNode>; footer?: ReactNode; qr?: ReactNode; className? }`. The PRD §14 poster: a title band in the display face (on `primary`, with the QR code at the right) over a `weave-band`, then six numbered panels, each a `<section>` labelled by its `<h2>` ("The problem", "The app in one picture", "What's different", "How AI built it", "Data", "Impact"), in reading order, and the footer. Portrait: problem and what's different beside a tall picture, then AI | data, then impact. Landscape: thirds (problem / different | picture | AI), then data | impact, with a compact title band. Text panels grow to fit their content; the picture panel shrinks and centres images. Rename a heading by adding its `kit.poster.panel.*` key to the app's strings.

```tsx
<SixPanelPoster
  title="Andam"
  subtitle={t("poster.subtitle")}
  qr={<QrToApp url="http://192.168.1.20:5101/" />}
  footer={<><span>RSCENE 2026 · Catbalogan City</span><span>{t("poster.team")}</span></>}
  panels={{
    problem: <p>{t("poster.problem")}</p>,
    picture: <img src="/poster/three-windows.png" alt={t("poster.pictureAlt")} />,
    different: <ul className="list-disc ps-6">…</ul>,
    ai: <AiBuiltPanel tools={TOOLS} steps={STEPS} disclosure={t("poster.disclosure")} />,
    data: <p>{t("poster.data")}</p>,
    impact: <ul className="list-disc ps-6">…</ul>,
  }}
/>
```

**`PosterFigure`** `{ title: ReactNode; caption?: ReactNode; source?: string; downloadSvg?: string; className?; children }`. A `<figure>` named by its title, with the caption under the title and "Source: …" below. With `downloadSvg` (a file name), a **Download SVG** button appears once the figure holds an `<svg>` (also when a chart renders it later) and saves it through `downloadText` from `@rcene/ui`, with the computed colours and fonts inlined so theme tokens survive outside the page (`serializeSvg(svg)` does that part). The button never prints. Sizes in `em`, so it fits a poster panel and an app page.

```tsx
<PosterFigure title={t("fig.households")} caption={t("fig.householdsCaption")} source="CDRRMO 2024" downloadSvg="households">
  <HouseholdsChart />   {/* an SVG; Recharts is fine */}
</PosterFigure>
```

**`AiBuiltPanel`** `{ tools: { name: string; role: string }[]; steps?: string[]; disclosure?: string; headingLevel?: 2 | 3 | 4; className? }`. "How AI built this": the AI tools as chips with what each did, the process as a numbered list (side by side when there is room, a container query) and the disclosure line with a shield icon. The default disclosure (`kit.aiBuilt.disclosure`) is neutral; pass the app's own line from `docs/DISCLOSURE.md`. Headings are `h3` (under a poster panel's `h2`).

```tsx
<AiBuiltPanel
  tools={[{ name: "Claude Code", role: t("poster.ai.claude") }, { name: "Playwright", role: t("poster.ai.playwright") }]}
  steps={[t("poster.step.brief"), t("poster.step.tests"), t("poster.step.build"), t("poster.step.review")]}
  disclosure={t("poster.disclosure")}
/>
```

**`QrToApp`** `{ url: string; label?: string; size?: number | string; className? }`. A QR code (the `qrcode` package, SVG, black on white, one-module quiet zone, error correction M) as one image named "QR code that opens {url}", with the label ("Scan to open the app") and the address below it without `http(s)://`. `size` is CSS px (default 160, about 42 mm on paper) or any length (`"40mm"`). On the day, use the laptop's LAN address (`npm run preview -- --host`) so phones on the same Wi-Fi can open it. `qrSvg(url)` returns the SVG string.

```tsx
<QrToApp url="http://192.168.1.20:5101/" label={t("poster.scan")} size="38mm" />
```

**`PresenterMode`** `{ steps: PresenterStep[]; open?: boolean; onOpenChange?: (open: boolean) => void; onNavigate?: (route: string) => void; className? }` with `PresenterStep = { id: string; caption: string; route?: string; notes?: string; seconds?: number }`. A floating bar at the bottom (`fixed`, `print:hidden`): "Step n of N", the caption in large display type, a step progress strip, the timer (elapsed / total budget, "0:12 left" or a warning "0:05 over" for the step; `role="timer"`), back, play/pause, next and hide. Keys as in the demo workflow. Step changes are announced politely; the bar and the caption slide in only without reduced motion. `open` controls the bar (uncontrolled it starts shown); navigation uses `onNavigate`, else react-router when inside a router, else nothing. The step and timer live in `usePresenterStore` (`createSyncedStore("presenter")`); `presenterKeyAction(event)`, `formatClock(ms)` and `presenterElapsed(state, now)` are exported for custom UIs.

```tsx
// src/AppLayout.tsx
const present = useMemo(() => new URLSearchParams(window.location.search).has("present"), []);
const steps = useDemoSteps();   // PresenterStep[] from DEMO.md, captions through t()
…
{present && <PresenterMode steps={steps} />}
```

**`PresenterNotes`** `{ steps: PresenterStep[]; className? }`. The presenter's window: "Step n of N" (`h1`), the timer with start/pause and reset, the step's caption and route, the speaker notes in large type, "Up next" (or "End of the demo"), and **Previous step** / **Next step** buttons. → ← Space PageUp PageDown and T work here too and drive the app window.

```tsx
{ path: "/presenter", element: <PresenterNotes steps={steps} /> }
// open it from a button: window.open("/presenter", "presenter-notes", "popup,width=960,height=720")
```

**`PrintButton`** `{ label?: string; variant?; size?; className? }`. A `Button` with a printer icon that calls `window.print()`; `print:hidden`. The PosterPage toolbar uses it; use it on any printable page (a handout, a QR sheet).

## Strings (`strings.ts`)

`kit.poster.*` (sheet, toolbar, size, orientation, portrait, landscape, scale, printHint, overflow, `panel.problem|picture|different|ai|data|impact`), `kit.printButton.label`, `kit.posterFigure.download|source`, `kit.aiBuilt.tools|steps|disclosureLabel|disclosure`, `kit.qrToApp.label|alt`, `kit.presenter.*` (region, step, announce, next, back, hide, timerStart, timerPause, timerReset, elapsed, left, over, keys, notesKeys, notesTitle, notes, noNotes, upNext, end). English is the source; Waray and Filipino are AI drafts.

## Tests

`npx vitest run rcene/kit/poster`: the `@page` rule for A3/A2 and both orientations (and its removal on unmount), the light print tone, the preview scale, the PDF title and the overflow notice; six labelled panels in reading order and their placement; figure download through `downloadText`; the QR SVG and address; the AI panel; the presenter keys (next, back, ignored in inputs, timer, Esc/P), store sync across windows, react-router navigation and the notes window; axe on every block (`a11y.test.tsx`).
