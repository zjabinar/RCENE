# Proposal 4. Bantay Barangay — explainable barangay risk dashboard

_The original one-paragraph pitch for this app (proposal 4 of 20). The approved spec is `docs/brief.md`; where they differ, the brief wins._

- **Problem:** Risk scores are a hand-tuned average, so decision-makers can't see *why* a barangay ranks high.
- **What it does:** A choropleth of all 57 barangays. Clicking one shows exactly which hazards apply and how many schools and health stations are exposed, and weight sliders re-rank the barangays live.
- **MVP:** Choropleth · breakdown panel · live weight sliders · export ranked list
- **Wow:** Animated breakdown bars; Motion re-rank list
- **Stack:** core + MapLibre, Turf (offline precompute), Recharts or ECharts, Motion
- **Data:** Barangay × hazard × facility exposure, **precomputed before the event** into one JSON file
