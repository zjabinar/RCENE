import { MonitorIcon, MoonIcon, PaletteIcon, SunIcon } from "lucide-react";
import { useT } from "@rcene/i18n";

import { Button } from "../components/ui/button.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu.tsx";
import { useUiStrings } from "../i18n.ts";
import { cn } from "../lib/utils.ts";
import { isModeSetting, isPalette, MODE_SETTINGS, PALETTE_SWATCHES, PALETTES, type Mode, type Palette } from "./palettes.ts";
import { useTheme } from "./sync.ts";

const MODE_ICONS = { light: SunIcon, dark: MoonIcon, system: MonitorIcon } as const;

/** Three dots: the palette's background, primary and brand colours. Decorative. */
export function PaletteSwatch({ palette, mode, className }: { palette: Palette; mode: Mode; className?: string }) {
  return (
    <span aria-hidden="true" className={cn("inline-flex shrink-0 -space-x-1", className)}>
      {PALETTE_SWATCHES[palette][mode].map((color, i) => (
        <span key={i} className="size-3.5 rounded-full border border-black/15" style={{ backgroundColor: color }} />
      ))}
    </span>
  );
}

export interface ThemeMenuProps {
  className?: string;
}

/**
 * Header button with the light/dark choice and the five palettes. The choice is
 * persisted and follows in every window of the app. While the current view
 * forces its own colours (a board, a showcase page) the menu says so.
 */
export function ThemeMenu({ className }: ThemeMenuProps) {
  const t = useT(useUiStrings());
  const { choice, defaults, effective, overridden, setPalette, setMode } = useTheme();
  const mode = choice.mode ?? defaults.mode;
  const palette = choice.palette ?? defaults.palette;
  const TriggerIcon = effective.mode === "dark" ? MoonIcon : SunIcon;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" aria-label={t("ui.theme")} data-slot="theme-menu" className={cn("gap-1.5", className)}>
          <TriggerIcon aria-hidden="true" />
          <PaletteIcon aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>{t("ui.theme.mode")}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={mode} onValueChange={(value) => isModeSetting(value) && setMode(value)}>
          {MODE_SETTINGS.map((m) => {
            const Icon = MODE_ICONS[m];
            return (
              <DropdownMenuRadioItem key={m} value={m} className="gap-2">
                <Icon aria-hidden="true" className="size-4" />
                {t(`ui.mode.${m}`)}
              </DropdownMenuRadioItem>
            );
          })}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>{t("ui.theme.palette")}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={palette} onValueChange={(value) => isPalette(value) && setPalette(value)}>
          {PALETTES.map((p) => (
            <DropdownMenuRadioItem key={p} value={p} className="items-start gap-2">
              <PaletteSwatch palette={p} mode={effective.mode} className="mt-0.5" />
              <span className="min-w-0">
                <span className="block font-medium">{t(`ui.palette.${p}`)}</span>
                <span className="block text-xs text-muted-foreground">{t(`ui.palette.${p}.note`)}</span>
              </span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        {overridden && <p className="px-2 py-1.5 text-xs text-muted-foreground">{t("ui.theme.locked")}</p>}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
