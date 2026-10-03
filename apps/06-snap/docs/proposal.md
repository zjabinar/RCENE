# Proposal 6. Damage Snap — offline-first rapid damage assessment ★AI

_The original one-paragraph pitch for this app (proposal 6 of 20). The approved spec is `docs/brief.md`; where they differ, the brief wins._

- **Problem:** Field assessment must work without signal, and paper forms get re-encoded later.
- **What it does:** An installable PWA that captures a geotagged photo, damage category, and households affected. Entries queue offline and sync later, and a dashboard aggregates them by barangay.
- **MVP:** GPS capture form · offline queue · aggregate map and tally
- **Wow:** Animated sync state; deck.gl heatmap
- **★AI:** In-browser photo classification suggests a damage severity
- **Stack:** core + vite-plugin-pwa, MapLibre, deck.gl
- **Risk:** PWA and offline behaviour are fiddly. Rehearse the offline toggle.
