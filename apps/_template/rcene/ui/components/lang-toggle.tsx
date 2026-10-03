import { LanguagesIcon } from "lucide-react";
import { LANG_LABELS, LANGS, useAppStrings, useLang, useT, type Lang } from "@rcene/i18n";

import { cn } from "../lib/utils.ts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select.tsx";

const isLang = (value: string): value is Lang => (LANGS as readonly string[]).includes(value);

export interface LangToggleProps {
  className?: string;
}

/** Compact language picker (English / Winaray / Filipino). Persists and syncs across windows. */
export function LangToggle({ className }: LangToggleProps) {
  const t = useT(useAppStrings());
  const [lang, setLang] = useLang();
  return (
    <Select value={lang} onValueChange={(value) => isLang(value) && setLang(value)}>
      <SelectTrigger size="sm" aria-label={t("app.language")} data-slot="lang-toggle" className={cn("gap-1.5", className)}>
        <LanguagesIcon aria-hidden="true" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        {LANGS.map((code) => (
          <SelectItem key={code} value={code} lang={code}>
            {LANG_LABELS[code]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
