# S2 · Website starter

| | |
|---|---|
| **App** | `apps/starter-site` · dev port 5302 · preview 6302 |
| **Kind** | Reference project on `main` (not launched; `src/` maintained by hand) |
| **Built from** | `@rcene/kit/site`, `@rcene/kit/poster`, `@rcene/kit/brand`, `@rcene/map` |

> A public website to copy from: a showcase landing page, a scrollytelling data story, an "about / how AI built this" page, the A3 poster and the presenter mode for the live demo.

## Routes

| Route | Shows |
|---|---|
| `/` | Showcase hero, StatBand from the data layers, FeatureGrid, call to action |
| `/story` | ScrollyChapter with the offline map and legend, BeforeAfter, StoryTimeline, ChartCard |
| `/about` | AiBuiltPanel, QR to the app, credits |
| `/poster` | SixPanelPoster on A3 portrait; print to PDF with margins "None" and "Background graphics" on |
| `/sources` | Sources page |

`PresenterMode` is mounted on every route: press P to show it.

## How sessions use it

Copy the landing, story, about and poster pages from `../starter-site/src` by reading only, and replace the sample content with your app's own. Keep one showcase surface per page.
