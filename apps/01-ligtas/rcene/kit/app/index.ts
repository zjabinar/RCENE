/**
 * @rcene/kit/app — the app system: page header, operator console, public
 * board, KPI row, data table, chart card, wizard, status timeline, capacity
 * meter, form fields (+ zod messages), QR display and illustrated states.
 * See rcene/kit/app/README.md.
 */
export { PageHeader, type PageHeaderProps, type Breadcrumb } from "./page-header.tsx";
export { ConsoleLayout, type ConsoleLayoutProps, type ConsoleNavItem } from "./console-layout.tsx";
export { BoardShell, BoardRotator, type BoardShellProps, type BoardRotatorProps } from "./board.tsx";
export { KpiRow, type KpiRowProps, type KpiItem } from "./kpi-row.tsx";
export { DataTable, type DataTableProps, type DataTableSearch, type DataTableExport } from "./data-table.tsx";
export { ChartCard, type ChartCardProps, type ChartTableData, type ChartView } from "./chart-card.tsx";
export { Wizard, useWizard, type WizardProps, type WizardStep, type WizardState } from "./wizard.tsx";
export {
  StatusTimeline,
  type StatusTimelineProps,
  type StatusTimelineItem,
  type TimelineState,
} from "./status-timeline.tsx";
export {
  CapacityMeter,
  capacityState,
  type CapacityMeterProps,
  type CapacityState,
  type CapacityThresholds,
} from "./capacity-meter.tsx";
export {
  TextField,
  NumberField,
  SelectField,
  RadioField,
  CheckboxField,
  TextareaField,
  BarangayField,
  type FieldProps,
  type FieldOption,
  type TextFieldProps,
  type NumberFieldProps,
  type SelectFieldProps,
  type RadioFieldProps,
  type CheckboxFieldProps,
  type TextareaFieldProps,
  type BarangayFieldProps,
} from "./form-fields.tsx";
export { kitZodErrors, useKitZodErrors, type KitZodErrors, type KitTranslate } from "./zod-errors.ts";
export { QrDisplay, type QrDisplayProps } from "./qr-display.tsx";
export { IllustratedState, type IllustratedStateProps, type IllustrationSpot } from "./illustrated-state.tsx";
export { appStrings, type AppStringKey } from "./strings.ts";
