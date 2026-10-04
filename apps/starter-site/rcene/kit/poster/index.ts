/**
 * @rcene/kit/poster: the competition poster (A3/A2, print to PDF) and the
 * live-demo presenter mode. See rcene/kit/poster/README.md.
 */
export {
  PosterPage,
  usePosterSheet,
  posterDimensions,
  posterPrintCss,
  POSTER_SIZES_MM,
  type PosterPageProps,
  type PosterSheetInfo,
  type PosterSize,
  type PosterOrientation,
  type PosterPrintTone,
} from "./poster-page.tsx";
export { SixPanelPoster, POSTER_PANELS, type SixPanelPosterProps, type PosterPanelKey } from "./six-panel-poster.tsx";
export { PosterFigure, serializeSvg, type PosterFigureProps } from "./poster-figure.tsx";
export { AiBuiltPanel, type AiBuiltPanelProps, type AiTool } from "./ai-built-panel.tsx";
export { QrToApp, qrSvg, type QrToAppProps } from "./qr-to-app.tsx";
export {
  PresenterMode,
  PresenterNotes,
  presenterKeyAction,
  type PresenterModeProps,
  type PresenterNotesProps,
  type PresenterStep,
  type PresenterAction,
} from "./presenter.tsx";
export {
  usePresenterStore,
  presenterElapsed,
  formatClock,
  type PresenterState,
} from "./presenter-store.ts";
export { PrintButton, type PrintButtonProps } from "./print-button.tsx";
