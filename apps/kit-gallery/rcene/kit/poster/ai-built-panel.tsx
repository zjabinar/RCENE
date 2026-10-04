import { ShieldCheck } from "lucide-react";
import { useT } from "@rcene/i18n";
import { cn } from "@rcene/ui/lib/utils";

import { useKitStrings } from "../i18n.ts";

export interface AiTool {
  /** e.g. "Claude Code". */
  name: string;
  /** What it did, e.g. "wrote and tested the app from the brief". */
  role: string;
}

export interface AiBuiltPanelProps {
  tools: AiTool[];
  /** The development process, in order (brief → plan → tests → build → review…). */
  steps?: string[];
  /** The disclosure line; default kit.aiBuilt.disclosure. Pass the app's own (docs/DISCLOSURE.md "Poster version"). */
  disclosure?: string;
  /** Level of the "AI tools" / "How we worked" headings (default 3, under a poster panel's h2). */
  headingLevel?: 2 | 3 | 4;
  className?: string;
}

/**
 * "How AI built this": the AI tools and what each did, the process steps and
 * the disclosure line. Lays tools and steps side by side when it has room
 * (container query), so it fits a poster panel and a phone screen alike.
 */
export function AiBuiltPanel({ tools, steps, disclosure, headingLevel = 3, className }: AiBuiltPanelProps) {
  const t = useT(useKitStrings());
  const Heading = `h${headingLevel}` as "h2" | "h3" | "h4";
  const headingClass = "text-[0.8em] font-semibold tracking-wider text-muted-foreground uppercase";

  return (
    <div data-slot="ai-built-panel" className={cn("@container flex flex-col gap-[1.25em]", className)}>
      <div className={cn("grid gap-[1.25em]", steps?.length && "@lg:grid-cols-2")}>
        <div className="flex flex-col gap-[0.6em]">
          <Heading className={headingClass}>
            {t("kit.aiBuilt.tools")}
          </Heading>
          <ul className="flex flex-col gap-[0.6em]">
            {tools.map((tool) => (
              <li key={tool.name} className="flex flex-col gap-[0.15em]">
                <span className="w-fit rounded-md bg-highlight px-[0.5em] py-[0.1em] font-semibold text-highlight-foreground">
                  {tool.name}
                </span>
                <span className="leading-snug">{tool.role}</span>
              </li>
            ))}
          </ul>
        </div>

        {steps && steps.length > 0 && (
          <div className="flex flex-col gap-[0.6em]">
            <Heading className={headingClass}>
              {t("kit.aiBuilt.steps")}
            </Heading>
            <ol className="flex flex-col gap-[0.5em]">
              {steps.map((step, i) => (
                <li key={`${i}-${step}`} className="flex items-start gap-[0.6em]">
                  <span
                    aria-hidden="true"
                    className="mt-[0.1em] grid size-[1.6em] shrink-0 place-items-center rounded-full border border-primary text-[0.8em] font-semibold text-primary tabular-nums"
                  >
                    {i + 1}
                  </span>
                  <span className="leading-snug">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>

      <p className="flex gap-[0.6em] rounded-lg border border-dashed bg-muted p-[0.8em] text-[0.9em] leading-snug text-muted-foreground">
        <ShieldCheck aria-hidden="true" className="mt-[0.1em] size-[1.2em] shrink-0 text-primary" />
        <span>
          <strong className="font-semibold text-foreground">{t("kit.aiBuilt.disclosureLabel")}: </strong>
          {disclosure ?? t("kit.aiBuilt.disclosure")}
        </span>
      </p>
    </div>
  );
}
