/**
 * @rcene/ui — shared app chrome, UI states and hazard answer components.
 * shadcn primitives are NOT re-exported here; import them from
 * "@rcene/ui/components/<name>" (Toaster and sonner's `toast` are the exceptions).
 * Motion lives in "@rcene/ui/motion".
 */
export { cn } from "./lib/utils.ts";
export { downloadBlob, downloadCsv, downloadText } from "./lib/download.ts";

export { AppShell, type AppShellProps, type AppShellWidth, type NavItem } from "./components/app-shell.tsx";
export { LangToggle, type LangToggleProps } from "./components/lang-toggle.tsx";
export { SampleDataBadge, type SampleDataBadgeProps } from "./components/sample-data-badge.tsx";
export { DisclaimerFooter, type DisclaimerFooterProps } from "./components/disclaimer-footer.tsx";
export {
  LoadingState,
  EmptyState,
  ErrorState,
  DataMissing,
  LoadGate,
  type LoadingStateProps,
  type EmptyStateProps,
  type ErrorStateProps,
  type DataMissingProps,
  type LoadGateProps,
} from "./components/states.tsx";
export {
  HazardStatusBadge,
  HazardStatusList,
  LevelBadge,
  LEVEL_ICONS,
  STATUS_ICONS,
  type HazardStatusBadgeProps,
  type HazardStatusListProps,
  type LevelBadgeProps,
} from "./components/hazard-status.tsx";
export { StatTile, type StatTileProps } from "./components/stat-tile.tsx";
export {
  SourcesPage,
  SourceCard,
  type SourcesPageProps,
  type SourceCardProps,
} from "./components/sources-page.tsx";
export {
  RoleLauncher,
  openRoleWindow,
  ROLE_WINDOW_SIZE,
  type RoleCard,
  type RoleLauncherProps,
} from "./components/role-launcher.tsx";
export { RouteError } from "./components/route-error.tsx";
export { ErrorBoundary, type ErrorBoundaryProps } from "./components/error-boundary.tsx";
export { Toaster, type ToasterProps } from "./components/ui/sonner.tsx";
export { toast } from "sonner";
