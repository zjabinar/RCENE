import { Trash2Icon } from "lucide-react";
import { useFormat, useT } from "@rcene/i18n";
import { Button } from "@rcene/ui/components/button";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@rcene/ui/components/table";
import { cn } from "@rcene/ui/lib/utils";
import { useAiLog } from "../log.ts";
import { useAiStrings } from "../strings.ts";
import { AiSourceBadge } from "./ai-source-badge.tsx";

/** The latest AI runs (every window of the app): time, task, who answered, mode, time taken. */
export function AiActivityLog({ className, limit = 15 }: { className?: string; limit?: number }) {
  const t = useT(useAiStrings());
  const fmt = useFormat();
  const entries = useAiLog((s) => s.entries);
  const clear = useAiLog((s) => s.clear);
  const shown = entries.slice(0, limit);

  if (shown.length === 0) return <p className={cn("text-sm text-muted-foreground", className)}>{t("ai.log.empty")}</p>;

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableCaption className="sr-only">{t("ai.log.title")}</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>{t("ai.log.time")}</TableHead>
              <TableHead>{t("ai.log.task")}</TableHead>
              <TableHead>{t("ai.log.answeredBy")}</TableHead>
              <TableHead>{t("ai.log.note")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shown.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell className="whitespace-nowrap tabular-nums">{fmt.time(new Date(entry.at))}</TableCell>
                <TableCell className="font-medium">{entry.task}</TableCell>
                <TableCell>
                  <AiSourceBadge meta={entry} />
                </TableCell>
                <TableCell className="max-w-[28ch] truncate text-muted-foreground" title={entry.note}>
                  {entry.note ?? "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Button variant="ghost" size="sm" className="self-start" onClick={clear}>
        <Trash2Icon aria-hidden="true" />
        {t("ai.log.clear")}
      </Button>
    </div>
  );
}
