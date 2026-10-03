# Proposal 3. Likas — evacuation center finder & live capacity board

_The original one-paragraph pitch for this app (proposal 3 of 20). The approved spec is `docs/brief.md`; where they differ, the brief wins._

- **Problem:** No geocoded evacuation list and no routing; residents can't tell which center still has room.
- **What it does:** Finds the nearest open center, with a capacity bar and a what-to-bring list. A staff console updates headcounts, and a public board shows every center filling.
- **MVP:** Center map and nearest search · capacity update form · status board synced across windows with BroadcastChannel
- **Wow:** Motion layout reorder as centers fill; GSAP count-ups
- **Stack:** core + MapLibre, Turf, Motion, GSAP
- **Data:** Schools from critical facilities (common PH evacuation sites) with seeded capacities
