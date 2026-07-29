WORK ORDER 02 — Inline trigger touch exception
GOAL: The accessibility floor explicitly records inline glossary term triggers as a deliberate exception to the 48px touch target.
DEPENDS ON: 01
REQUIRED STRENGTH: Light
CREATES: none
REMOVES: none
CHANGES SIGNATURE: none

KNOWN STATE (already true — do NOT redo or re-derive):
- The current docs/DESIGN_SYSTEM.md Accessibility floor lists three exception families: Map Lab canvas
  SVG glyphs, compact Button controls, and compact Map Lab property controls.
- UX decision: inline glossary term triggers cannot meet the 48px control-height floor without
  breaking reading layout; they remain native inline text buttons with the light dotted underline
  and visible global focus ring.

START IN:
- docs/DESIGN_SYSTEM.md — lines 458-474 @"## Accessibility floor"

DO:
- Edit docs/DESIGN_SYSTEM.md at the `Touch targets` exception list to add inline glossary term triggers and the running-prose rationale, without changing the existing exceptions.

STOP WHEN: `.venv\Scripts\python.exe scripts/check_docs.py --check` passes. Then stop - change nothing else.

STATUS: DONE — implemented directly by dispatcher because executor startup exceeded the one-line edit.

DEVIATIONS:
- opened beyond START IN: none
- KNOWN STATE re-verified or wrong: none
