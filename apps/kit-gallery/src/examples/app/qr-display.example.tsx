import { useT } from "@rcene/i18n";
import { QrDisplay } from "@rcene/kit/app";
import type { ExampleMeta } from "../../gallery/registry.ts";

export const meta: ExampleMeta = {
  title: "QrDisplay",
  summary: {
    en: "A QR code made offline, with its label, and PNG / SVG downloads for printing. Always black on white so phones can scan it.",
    war: "QR code nga ginhimo offline, upod an label, ngan PNG / SVG nga download para ha pag-imprinta. Permi itom ha puti basi ma-scan han telepono.",
    fil: "QR code na ginawa offline, kasama ang label, at PNG / SVG na download para sa pag-print. Laging itim sa puti para ma-scan ng telepono.",
  },
  blocks: ["QrDisplay"],
  order: 90,
  frameHeight: 820,
};

const strings = {
  en: {
    ticket: "Ticket REC-0001",
    ticketHint: "Show this at the BRGY-05 desk",
    track: "Track this request",
    trackHint: "Opens the status page, works offline",
  },
  war: {
    ticket: "Tiket REC-0001",
    ticketHint: "Ipakita ini ha desk han BRGY-05",
    track: "Sundon ini nga hangyo",
    trackHint: "Nag-aabri han pahina han kahimtang, nagana bisan offline",
  },
  fil: {
    ticket: "Tiket REC-0001",
    ticketHint: "Ipakita ito sa desk ng BRGY-05",
    track: "Subaybayan ang kahilingan",
    trackHint: "Binubuksan ang pahina ng katayuan, gumagana offline",
  },
};

export function Example() {
  const t = useT(strings);
  return (
    <div className="flex flex-wrap items-start justify-center gap-6">
      <QrDisplay value="REC-0001" label={t("ticket")} hint={t("ticketHint")} download="ticket-REC-0001" />
      <QrDisplay value="/track/REC-0001" label={t("track")} hint={t("trackHint")} size={144} />
    </div>
  );
}
