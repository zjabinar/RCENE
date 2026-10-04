/**
 * The live-demo presenter's state, shared by every window of the app through
 * localStorage (createSyncedStore): the current step and the timer. The bar
 * (PresenterMode) and the notes window (PresenterNotes) both read and drive it.
 */
import { createSyncedStore } from "@rcene/store";

/** Origin of a step change made in a PresenterNotes window. */
export const NOTES_ORIGIN = "notes";

/** This window's id (one per page load), so only the window that changed the step navigates. */
export const WINDOW_ID: string =
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `w-${Math.random().toString(36).slice(2)}`;

export interface PresenterState {
  /** Current step (0-based; clamp it to the steps you render). */
  index: number;
  /** Bumped on every step change, so windows can react to a change and not to a reload. */
  nonce: number;
  /** Who made the last change: a window id or NOTES_ORIGIN. */
  origin: string | null;
  /** The last window that drove the demo from its bar; it follows changes made in the notes window. */
  stage: string | null;
  running: boolean;
  /** Date.now() when the timer last started (null while paused). */
  startedAt: number | null;
  /** Elapsed ms before startedAt. */
  banked: number;
  /** Elapsed ms when the current step began (for the per-step countdown). */
  stepMark: number;
  go: (index: number, origin: string) => void;
  toggleTimer: () => void;
  resetTimer: () => void;
}

/** Elapsed demo time in ms at `now`. */
export function presenterElapsed(state: Pick<PresenterState, "banked" | "running" | "startedAt">, now: number): number {
  return state.banked + (state.running && state.startedAt !== null ? Math.max(0, now - state.startedAt) : 0);
}

/** m:ss (or h:mm:ss) for a duration in ms. */
export function formatClock(ms: number): string {
  const total = Math.floor(Math.abs(ms) / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}

export const usePresenterStore = createSyncedStore<PresenterState>(
  "presenter",
  (set, get) => ({
    index: 0,
    nonce: 0,
    origin: null,
    stage: null,
    running: false,
    startedAt: null,
    banked: 0,
    stepMark: 0,
    go: (index, origin) => {
      const state = get();
      set({
        index: Math.max(0, index),
        nonce: state.nonce + 1,
        origin,
        stage: origin === NOTES_ORIGIN ? state.stage : origin,
        stepMark: presenterElapsed(state, Date.now()),
      });
    },
    toggleTimer: () => {
      const state = get();
      const now = Date.now();
      if (state.running) set({ running: false, startedAt: null, banked: presenterElapsed(state, now) });
      else set({ running: true, startedAt: now });
    },
    resetTimer: () => {
      const state = get();
      set({ banked: 0, stepMark: 0, startedAt: state.running ? Date.now() : null });
    },
  }),
  { version: 1 },
);

/** Per-tab flag (sessionStorage): this tab was the stage when its bar went away (a reload, a bfcache visit, an unmount). */
const STAGE_FLAG = "rcene:presenter-stage";

/**
 * Gives up the stage when this window's bar goes away (pagehide or unmount):
 * a closed window must not keep it, or changes made in the notes window would
 * navigate no window at all. Remembers it per tab so a reload can take it back.
 */
export function releaseStage(): void {
  if (usePresenterStore.getState().stage !== WINDOW_ID) return;
  usePresenterStore.setState({ stage: null });
  try {
    sessionStorage.setItem(STAGE_FLAG, "1");
  } catch {
    // Storage blocked: the stage stays free, so every app window follows the notes window.
  }
}

/**
 * Called when the bar mounts (and on a bfcache restore): a tab that was the
 * stage takes it back under its new window id, unless another window has
 * driven the demo since.
 */
export function reclaimStage(): void {
  let was = false;
  try {
    was = sessionStorage.getItem(STAGE_FLAG) === "1";
    sessionStorage.removeItem(STAGE_FLAG);
  } catch {
    return;
  }
  if (was && usePresenterStore.getState().stage === null) usePresenterStore.setState({ stage: WINDOW_ID });
}
