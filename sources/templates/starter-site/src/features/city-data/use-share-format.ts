import { useFormat } from "@rcene/i18n";
import { sharePercent } from "@/domain/city-stats.ts";

/** Formats a 0..1 share for reading: "4.4%" under 10 %, "24%" above, in the active language. */
export function useShareFormat(): (share: number) => string {
  const fmt = useFormat();
  return (share) => {
    const percent = sharePercent(share);
    return `${fmt.number(percent, Number.isInteger(percent) ? 0 : 1)}%`;
  };
}
