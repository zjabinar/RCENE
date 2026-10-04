/**
 * Ready-made react-hook-form fields on @rcene/ui/components/form: label with
 * "(required)" text, a description under the label, the control, and the
 * error message (announced). Every field takes `control`, `name`, `label`,
 * `description?`, `required?`, `disabled?` and `className?`.
 */
import { useId, useState, type ComponentProps, type ReactNode } from "react";
import type { Control, FieldPath, FieldValues } from "react-hook-form";
import { CheckIcon, ChevronsUpDownIcon, MapPinIcon } from "lucide-react";
import { useFormat, useT } from "@rcene/i18n";
import { Button } from "@rcene/ui/components/button";
import { Checkbox } from "@rcene/ui/components/checkbox";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@rcene/ui/components/command";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useFormField,
} from "@rcene/ui/components/form";
import { Input } from "@rcene/ui/components/input";
import { Popover, PopoverContent, PopoverTrigger } from "@rcene/ui/components/popover";
import { RadioGroup, RadioGroupItem } from "@rcene/ui/components/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@rcene/ui/components/select";
import { Textarea } from "@rcene/ui/components/textarea";
import { cn } from "@rcene/ui/lib/utils";

import { useKitStrings } from "../i18n.ts";

export interface FieldOption {
  value: string;
  label: string;
  /** A second line under the option (radio fields). */
  hint?: string;
}

export interface FieldProps<T extends FieldValues, N extends FieldPath<T> = FieldPath<T>> {
  /** `form.control` from useForm. */
  // The form's context and transformed-values (zod output) types do not matter to a field.
  control: Control<T, any, any>;
  name: N;
  label: string;
  /** Help text under the label (format, example, why it is asked). */
  description?: ReactNode;
  /** Adds "(required)" after the label and aria-required. Validation itself is the schema's job. */
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

/** The label, with "(required)" in words (not just an asterisk). `group` renders a plain element for radio groups. */
function FieldLabel({ label, required, group }: { label: string; required?: boolean; group?: boolean }) {
  const t = useT(useKitStrings());
  const { formItemId, error } = useFormField();
  const text = (
    <>
      <span>{label}</span>
      {required && (
        <>
          {" "}
          <span className="text-xs font-normal text-muted-foreground">{t("kit.form.required")}</span>
        </>
      )}
    </>
  );
  if (group) {
    return (
      <div
        id={`${formItemId}-label`}
        data-error={!!error}
        className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm leading-none font-medium data-[error=true]:text-destructive"
      >
        {text}
      </div>
    );
  }
  return <FormLabel className="flex-wrap gap-x-2 gap-y-1">{text}</FormLabel>;
}

interface FieldControlProps extends ComponentProps<typeof FormControl> {
  hasDescription: boolean;
  /** Label the control by the group label (radio groups). */
  group?: boolean;
  /** More ids for aria-describedby (a unit, a counter). */
  describedBy?: string;
}

/** FormControl that only points aria-describedby at elements that exist. */
function FieldControl({ hasDescription, group, describedBy, ...props }: FieldControlProps) {
  const { error, formItemId, formDescriptionId, formMessageId } = useFormField();
  const ids = [hasDescription ? formDescriptionId : null, describedBy, error ? formMessageId : null].filter(Boolean).join(" ");
  return (
    <FormControl
      {...props}
      aria-describedby={ids || undefined}
      aria-labelledby={group ? `${formItemId}-label` : undefined}
    />
  );
}

function Description({ children }: { children?: ReactNode }) {
  return children ? <FormDescription className="-mt-1">{children}</FormDescription> : null;
}

// ---------------------------------------------------------------- TextField

export interface TextFieldProps<T extends FieldValues, N extends FieldPath<T> = FieldPath<T>> extends FieldProps<T, N> {
  type?: "text" | "email" | "tel" | "url" | "password" | "search";
  placeholder?: string;
  autoComplete?: string;
  inputMode?: ComponentProps<"input">["inputMode"];
  maxLength?: number;
}

export function TextField<T extends FieldValues, N extends FieldPath<T> = FieldPath<T>>({
  control,
  name,
  label,
  description,
  required,
  disabled,
  className,
  type = "text",
  ...input
}: TextFieldProps<T, N>) {
  return (
    <FormField<T, N>
      control={control}
      name={name}
      disabled={disabled}
      render={({ field }) => (
        <FormItem data-slot="text-field" className={className}>
          <FieldLabel label={label} required={required} />
          <Description>{description}</Description>
          <FieldControl hasDescription={!!description} aria-required={required || undefined}>
            <Input type={type} {...input} {...field} value={field.value ?? ""} />
          </FieldControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

// -------------------------------------------------------------- NumberField

export interface NumberFieldProps<T extends FieldValues, N extends FieldPath<T> = FieldPath<T>> extends FieldProps<T, N> {
  min?: number;
  max?: number;
  step?: number | "any";
  placeholder?: string;
  /** A unit shown inside the box, e.g. "kg", "₱", "people". */
  unit?: string;
}

/** A number input whose value is a number (or undefined when empty), so `z.number()` works without coercion. */
export function NumberField<T extends FieldValues, N extends FieldPath<T> = FieldPath<T>>({
  control,
  name,
  label,
  description,
  required,
  disabled,
  className,
  unit,
  ...input
}: NumberFieldProps<T, N>) {
  const unitId = useId();
  return (
    <FormField<T, N>
      control={control}
      name={name}
      disabled={disabled}
      render={({ field }) => (
        <FormItem data-slot="number-field" className={className}>
          <FieldLabel label={label} required={required} />
          <Description>{description}</Description>
          <div className="relative">
            <FieldControl
              hasDescription={!!description}
              describedBy={unit ? unitId : undefined}
              aria-required={required || undefined}
            >
              <Input
                type="number"
                inputMode="decimal"
                {...input}
                name={field.name}
                ref={field.ref}
                onBlur={field.onBlur}
                disabled={field.disabled}
                value={typeof field.value === "number" && !Number.isNaN(field.value) ? field.value : ""}
                onChange={(e) => field.onChange(e.target.value === "" ? undefined : e.target.valueAsNumber)}
                className={cn("tabular-nums", unit && "pr-16")}
              />
            </FieldControl>
            {unit && (
              <span
                id={unitId}
                className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground"
              >
                {unit}
              </span>
            )}
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

// -------------------------------------------------------------- SelectField

export interface SelectFieldProps<T extends FieldValues, N extends FieldPath<T> = FieldPath<T>> extends FieldProps<T, N> {
  options: FieldOption[];
  /** Shown before a choice is made (default "Choose…"). */
  placeholder?: string;
}

export function SelectField<T extends FieldValues, N extends FieldPath<T> = FieldPath<T>>({
  control,
  name,
  label,
  description,
  required,
  disabled,
  className,
  options,
  placeholder,
}: SelectFieldProps<T, N>) {
  const t = useT(useKitStrings());
  return (
    <FormField<T, N>
      control={control}
      name={name}
      disabled={disabled}
      render={({ field }) => (
        <FormItem data-slot="select-field" className={className}>
          <FieldLabel label={label} required={required} />
          <Description>{description}</Description>
          <Select value={field.value ?? ""} onValueChange={field.onChange} disabled={field.disabled} name={field.name}>
            <FieldControl hasDescription={!!description} aria-required={required || undefined}>
              <SelectTrigger ref={field.ref} onBlur={field.onBlur} className="w-full">
                <SelectValue placeholder={placeholder ?? t("kit.form.choose")} />
              </SelectTrigger>
            </FieldControl>
            <SelectContent>
              {options.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

// --------------------------------------------------------------- RadioField

export interface RadioFieldProps<T extends FieldValues, N extends FieldPath<T> = FieldPath<T>> extends FieldProps<T, N> {
  options: FieldOption[];
  /** "cards" (default): bordered rows, easy to tap; "inline": a compact row. */
  variant?: "cards" | "inline";
}

export function RadioField<T extends FieldValues, N extends FieldPath<T> = FieldPath<T>>({
  control,
  name,
  label,
  description,
  required,
  disabled,
  className,
  options,
  variant = "cards",
}: RadioFieldProps<T, N>) {
  const baseId = useId();
  return (
    <FormField<T, N>
      control={control}
      name={name}
      disabled={disabled}
      render={({ field }) => (
        <FormItem data-slot="radio-field" className={className}>
          <FieldLabel label={label} required={required} group />
          <Description>{description}</Description>
          <FieldControl hasDescription={!!description} group aria-required={required || undefined}>
            <RadioGroup
              ref={field.ref}
              name={field.name}
              value={field.value ?? ""}
              onValueChange={field.onChange}
              disabled={field.disabled}
              className={cn(variant === "inline" ? "flex flex-wrap gap-x-6 gap-y-3" : "grid gap-2")}
            >
              {options.map((o) => {
                const id = `${baseId}-${o.value}`;
                return (
                  <label
                    key={o.value}
                    htmlFor={id}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 text-sm",
                      variant === "cards" &&
                        "rounded-lg border bg-card p-3 transition-colors hover:bg-accent/50 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5",
                    )}
                  >
                    <RadioGroupItem id={id} value={o.value} className="mt-0.5" />
                    <span className="grid gap-0.5">
                      <span className="leading-tight font-medium">{o.label}</span>
                      {o.hint && <span className="text-xs text-muted-foreground">{o.hint}</span>}
                    </span>
                  </label>
                );
              })}
            </RadioGroup>
          </FieldControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

// ------------------------------------------------------------ CheckboxField

export type CheckboxFieldProps<T extends FieldValues, N extends FieldPath<T> = FieldPath<T>> = FieldProps<T, N>;

/** One yes/no checkbox (consent, "I confirm…") whose value is a boolean. */
export function CheckboxField<T extends FieldValues, N extends FieldPath<T> = FieldPath<T>>({
  control,
  name,
  label,
  description,
  required,
  disabled,
  className,
}: CheckboxFieldProps<T, N>) {
  return (
    <FormField<T, N>
      control={control}
      name={name}
      disabled={disabled}
      render={({ field }) => (
        <FormItem
          data-slot="checkbox-field"
          className={cn(
            "gap-2 rounded-lg border bg-card p-3 has-[[data-state=checked]]:border-primary/60 has-[[data-state=checked]]:bg-primary/5",
            className,
          )}
        >
          <div className="flex items-start gap-3">
            <FieldControl hasDescription={!!description} aria-required={required || undefined}>
              <Checkbox
                ref={field.ref}
                name={field.name}
                checked={field.value === true}
                onCheckedChange={(v) => field.onChange(v === true)}
                onBlur={field.onBlur}
                disabled={field.disabled}
                className="mt-0.5"
              />
            </FieldControl>
            <div className="grid gap-1.5">
              <FieldLabel label={label} required={required} />
              {description && <FormDescription>{description}</FormDescription>}
            </div>
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

// ------------------------------------------------------------ TextareaField

export interface TextareaFieldProps<T extends FieldValues, N extends FieldPath<T> = FieldPath<T>> extends FieldProps<T, N> {
  placeholder?: string;
  rows?: number;
  /** Also shows a "n of max characters" counter. */
  maxLength?: number;
}

export function TextareaField<T extends FieldValues, N extends FieldPath<T> = FieldPath<T>>({
  control,
  name,
  label,
  description,
  required,
  disabled,
  className,
  placeholder,
  rows = 4,
  maxLength,
}: TextareaFieldProps<T, N>) {
  const t = useT(useKitStrings());
  const fmt = useFormat();
  const counterId = useId();
  return (
    <FormField<T, N>
      control={control}
      name={name}
      disabled={disabled}
      render={({ field }) => {
        const length = typeof field.value === "string" ? field.value.length : 0;
        return (
          <FormItem data-slot="textarea-field" className={className}>
            <FieldLabel label={label} required={required} />
            <Description>{description}</Description>
            <FieldControl
              hasDescription={!!description}
              describedBy={maxLength ? counterId : undefined}
              aria-required={required || undefined}
            >
              <Textarea {...field} value={field.value ?? ""} placeholder={placeholder} rows={rows} maxLength={maxLength} />
            </FieldControl>
            <div className="flex items-start justify-between gap-3">
              <FormMessage />
              {maxLength && (
                <p id={counterId} className="ml-auto shrink-0 text-xs text-muted-foreground tabular-nums">
                  {t("kit.form.charCount", { count: fmt.number(length), max: fmt.number(maxLength) })}
                </p>
              )}
            </div>
          </FormItem>
        );
      }}
    />
  );
}

// ------------------------------------------------------------ BarangayField

export interface BarangayFieldProps<T extends FieldValues, N extends FieldPath<T> = FieldPath<T>> extends FieldProps<T, N> {
  /** Barangay names (e.g. from the barangays layer); the value stored is the name. */
  barangays: string[];
  /** Shown before a choice is made (default "Choose a barangay"). */
  placeholder?: string;
}

/** A searchable barangay picker (popover + command list): type a few letters, pick with the arrow keys and Enter. */
export function BarangayField<T extends FieldValues, N extends FieldPath<T> = FieldPath<T>>({
  control,
  name,
  label,
  description,
  required,
  disabled,
  className,
  barangays,
  placeholder,
}: BarangayFieldProps<T, N>) {
  const t = useT(useKitStrings());
  const [open, setOpen] = useState(false);
  return (
    <FormField<T, N>
      control={control}
      name={name}
      disabled={disabled}
      render={({ field }) => (
        <FormItem data-slot="barangay-field" className={className}>
          <FieldLabel label={label} required={required} />
          <Description>{description}</Description>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <FieldControl hasDescription={!!description} aria-required={required || undefined}>
                <Button
                  ref={field.ref}
                  type="button"
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  onBlur={field.onBlur}
                  disabled={field.disabled}
                  className="h-9 w-full justify-between border-input bg-transparent px-3 font-normal shadow-xs hover:bg-accent/40 dark:bg-input/30"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <MapPinIcon aria-hidden="true" className="text-muted-foreground" />
                    <span className={cn("truncate", !field.value && "text-muted-foreground")}>
                      {field.value || placeholder || t("kit.form.barangay")}
                    </span>
                  </span>
                  <ChevronsUpDownIcon aria-hidden="true" className="opacity-50" />
                </Button>
              </FieldControl>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              aria-label={label}
              className="w-(--radix-popover-trigger-width) min-w-56 p-0"
            >
              <Command label={t("kit.form.barangaySearch")}>
                <CommandInput placeholder={t("kit.form.barangaySearch")} />
                <CommandList>
                  <CommandEmpty>{t("kit.form.barangayNone")}</CommandEmpty>
                  <CommandGroup>
                    {barangays.map((b) => (
                      <CommandItem
                        key={b}
                        value={b}
                        onSelect={() => {
                          field.onChange(b);
                          setOpen(false);
                        }}
                      >
                        <CheckIcon
                          aria-hidden="true"
                          className={cn("text-primary", b === field.value ? "opacity-100" : "opacity-0")}
                        />
                        {b}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
