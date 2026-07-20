WORK ORDER 01 — Show difficulty on the encounter tile
GOAL: each encounter tile shows its Easy/Medium/Hard label.
DEPENDS ON: none

KNOWN STATE (already true — do NOT redo or re-derive):
- This is an illustrative example order, not real queued work. It shows the shape a real order takes.
- In a real order this section holds verified facts: e.g. "the API already returns `difficulty` on
  each encounter", "the tile currently renders name + monster count only", "the suite is green at
  231 tests" — the actual values, so the executor never re-discovers them.

START IN:
- frontend/src/components/EncounterTile.tsx
- frontend/src/components/EncounterTile.test.tsx

DO:
- Render the existing `difficulty` value next to the tile title, using theme tokens.
- Add one test that the label renders.

STOP WHEN: `npm test EncounterTile` passes with the new test. Then stop — change nothing else.

STATUS: <-- executor writes DONE, or FAILED - reason
