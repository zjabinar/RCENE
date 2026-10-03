# Proposal P2. Bayanihan Response — report-to-relief lifecycle

_The original pitch for this platform (P2 of P1–P10). The approved spec is `docs/brief.md`; where they differ, the brief wins._

- **Groups:** #6 Damage Snap, #19 Ayuda Tracker, plus geocoded incident reporting and relief transparency
- **Workflow:**
  1. A resident or field officer files a geotagged report, which works offline.
  2. The CDRRMO triage board verifies and assigns it.
  3. Relief is distributed by QR, with a duplicate guard.
  4. A public dashboard shows what reached which barangay.
- **Core:** report form with offline queue · triage board · QR distribution
- **Stretch:** public transparency view
- **Spine:** incidents, synthetic household QR codes, and distributions, all keyed by barangay
- **Data:** 🟢 boundaries; synthetic households and reports
- **Why it scores:** after a typhoon, damage reports and relief lists are kept on paper and in chat threads, so nobody can show what reached which barangay; the LGU portal flags offline field work as a gap
