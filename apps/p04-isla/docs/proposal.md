# Proposal P4. Isla Link — island-barangay connectivity & resilience

_The original pitch for this platform (P4 of P1–P10). The approved spec is `docs/brief.md`; where they differ, the brief wins._

- **Groups:** new; borrows from #3 and #19
- **Workflow:**
  1. Each island barangay posts its daily status and needs: water, rice, medicine, patients needing transport.
  2. The mainland CDRRMO or port office watches a needs board.
  3. A sea-travel advisory follows the tropical-cyclone signal.
  4. A boat or relief run is dispatched and logged.
- **Core:** island-cluster map with status board · needs requests · sea-travel advisory
- **Stretch:** boat dispatch log
- **Spine:** the island barangays, needs, advisories. Which barangays are islands is computed from the open HDX boundary and land layers (a barangay whose land does not touch the mainland), and they are grouped into clusters by distance. No list is copied from anywhere.
- **Data:** 🟢 HDX boundaries and the land outline; PAGASA public cyclone-signal definitions; synthetic needs and trips
- **Signature:** island clusters pulse by urgency, and a sea lane draws itself when a trip is dispatched
- **Why it scores:** Catbalogan's island barangays depend on boats for water, food, medicine and patient transfers, and a cyclone signal can cut them off for days. No other team is likely to think of it, and it is unmistakably Catbalogan.
- **Independence (2026-10-03):** restored on open data only. Nothing from GPDSS or Project HABAGAT is used: not its island list, findings or roadmap.
