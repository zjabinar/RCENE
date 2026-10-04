/**
 * Translated validation messages for zod 4 (with react-hook-form):
 *
 *   const errors = useKitZodErrors();
 *   const form = useForm({ resolver: zodResolver(schema, { error: errors.map }) });
 *
 * or per schema: `z.string({ error: errors.map }).min(1)`, or one message:
 * `z.string().min(1, errors.required())`. A message written in the schema
 * always wins over the map.
 */
import type { core } from "zod";
import { useFormat, useT, type Vars } from "@rcene/i18n";

import { useKitStrings } from "../i18n.ts";
import type { AppStringKey } from "./strings.ts";

/** A translator for the app family's keys, e.g. `useT(useKitStrings())`. */
export type KitTranslate = (key: AppStringKey, vars?: Vars) => string;

export interface KitZodErrors {
  /** A zod 4 error map: pass as `error` to zodResolver's schema options, a schema, or `z.config({ customError })`. */
  map: core.$ZodErrorMap;
  required: () => string;
  tooShort: (min: number) => string;
  tooLong: (max: number) => string;
  invalidNumber: () => string;
  min: (min: number) => string;
  max: (max: number) => string;
  choose: () => string;
}

const NUMERIC = new Set(["number", "int", "bigint"]);
const COLLECTION = new Set(["array", "set"]);

function isBlank(input: unknown): boolean {
  return input === undefined || input === null || (typeof input === "string" && input.trim() === "");
}

/**
 * Message helpers and a zod error map from the kit strings. `format` prints
 * numbers in messages (default String; useKitZodErrors uses the active
 * language's number format).
 */
export function kitZodErrors(t: KitTranslate, format: (n: number) => string = String): KitZodErrors {
  const num = (n: number | bigint) => format(Number(n));
  const required = () => t("kit.form.error.required");
  const tooShort = (min: number) => t("kit.form.error.tooShort", { min: num(min) });
  const tooLong = (max: number) => t("kit.form.error.tooLong", { max: num(max) });
  const invalidNumber = () => t("kit.form.error.number");
  const min = (n: number) => t("kit.form.error.min", { min: num(n) });
  const max = (n: number) => t("kit.form.error.max", { max: num(n) });
  const choose = () => t("kit.form.error.choose");

  const map: core.$ZodErrorMap = (issue) => {
    switch (issue.code) {
      case "invalid_type": {
        if (isBlank(issue.input)) return required();
        if (NUMERIC.has(issue.expected)) {
          if (issue.expected === "int" && typeof issue.input === "number" && Number.isFinite(issue.input)) {
            return t("kit.form.error.wholeNumber");
          }
          return invalidNumber();
        }
        return t("kit.form.error.invalid");
      }
      case "too_small": {
        const m = Number(issue.minimum);
        if (issue.origin === "string") return m <= 1 ? required() : tooShort(m);
        if (NUMERIC.has(issue.origin)) {
          return issue.inclusive === false ? t("kit.form.error.above", { min: num(m) }) : min(m);
        }
        if (COLLECTION.has(issue.origin)) return t("kit.form.error.chooseAtLeast", { min: num(m) });
        return t("kit.form.error.invalid");
      }
      case "too_big": {
        const m = Number(issue.maximum);
        if (issue.origin === "string") return tooLong(m);
        if (NUMERIC.has(issue.origin)) {
          return issue.inclusive === false ? t("kit.form.error.below", { max: num(m) }) : max(m);
        }
        if (COLLECTION.has(issue.origin)) return t("kit.form.error.chooseAtMost", { max: num(m) });
        return t("kit.form.error.invalid");
      }
      case "invalid_format":
        return issue.format === "email" ? t("kit.form.error.email") : t("kit.form.error.format");
      case "invalid_value":
        return isBlank(issue.input) ? required() : choose();
      case "not_multiple_of":
        return t("kit.form.error.multipleOf", { step: num(Number(issue.divisor)) });
      default:
        return undefined;
    }
  };

  return { map, required, tooShort, tooLong, invalidNumber, min, max, choose };
}

/** `kitZodErrors` in the active language (re-created when the language changes). */
export function useKitZodErrors(): KitZodErrors {
  const t = useT(useKitStrings());
  const fmt = useFormat();
  return kitZodErrors(t, (n) => fmt.number(n, Number.isInteger(n) ? 0 : 2));
}
