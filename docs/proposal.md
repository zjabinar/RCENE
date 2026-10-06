# Proposal P1. Andam Catbalogan — community preparedness platform

_The original pitch for this platform (P1 of P1–P10). The approved spec is `docs/brief.md`; where they differ, the brief wins._

- **Groups:** #1 Ligtas Ba Ako?, #3 Likas, #4 Bantay Barangay, #5 Sakuna Sim
- **Workflow:**
  1. CDRRMO raises a scenario ("Signal No. 3, storm surge SSA2").
  2. Affected barangays and evacuation centers light up.
  3. A resident checks their location and gets their nearest open center.
  4. Center staff update headcounts, and the public board fills live.
- **Core:** hazard lookup (resident) · scenario switch (CDRRMO) · evacuation finder + capacity board
- **Stretch:** plain-language barangay risk explainer ("why is my barangay at risk?")
- **Spine:** barangay × hazard matrix, facilities, active scenario state, shared across windows with BroadcastChannel
- **Data:** 🟢 HDX boundaries, UP NOAH hazards, OSM schools and health facilities · 🟡 CDRRMO evacuation-center list if permitted
- **Signature:** three synced windows — the CDRRMO console, a resident's phone view, the public board
- **Why it scores:** it answers documented gaps in the LGU portal (the "Am I Safe?" failure, no evacuation routing) and adds what a warning needs in practice: plain-language hazard answers and live evacuation-center capacity, on open data
- **Independence (2026-10-03):** built from the LGU portal's documented gaps and open data only; nothing from GPDSS or Project HABAGAT.
