WORK ORDER 01 — Normalise the second table-test record
GOAL: `docs/table-tests/2026-07-27-kid-map-viewer-stage-9.md` carries a settled status word, the fixed standing-question block, and no leftover work-order footer.
DEPENDS ON: none
REQUIRED STRENGTH: Light
CREATES: none
REMOVES: none
CHANGES SIGNATURE: none

KNOWN STATE (already true — do NOT redo or re-derive):
- Settled 2026-07-29: the table-test lifecycle has exactly three statuses and no fourth — `planned` → `run` → `folded in`. This record was written ahead of its session and has not been run, so its correct status is `planned`. Its current `pending` is the same state under a word the format does not use.
- Settled 2026-07-29: the standing questions are a FIXED block, byte-identical in every record, so the answers form a trend rather than an anecdote. This record replaced all six with seven of its own. Session-specific questions belong in `## Watching for`, which this record already has.
- The `## Standing questions` table is a three-column `| # | Question | Answer |`. Replace all of its rows with exactly these six, Answer cell left as `*(pending)*` to match the rest of the file:
  - `| 1 | Did anyone pick the device up unprompted? | *(pending)* |`
  - `| 2 | Did it pull attention **off** the table? | *(pending)* |`
  - `| 3 | Could the older child use it without help? The younger? | *(pending)* |`
  - `| 4 | Did anyone ask you to refresh it, or say it was wrong? | *(pending)* |`
  - `| 5 | Did anyone know something the fiction never told them? | *(pending)* |`
  - `| 6 | *(answered in the **next** record)* Did they remember something because of the app? | *(pending)* |`
- Of the seven questions being displaced, four already duplicate this record's own `## Watching for` rows — colour-family naming duplicates row 1, the stripy room duplicates row 3, stair tapping duplicates row 4, and the four-year-old-without-reading question duplicates row 7 — so those four are simply dropped, not relocated. The remaining three are genuinely new and are appended verbatim to the `## Watching for` table, which is a four-column `| # | Question | What the answer would change | What happened |` currently ending at row 7:
  - `| 8 | Did anyone try to tap a room expecting something to happen? (No inspector is built.) | A count here is the mandate — or the refusal — for a kid-side room detail view. | *(pending)* |`
  - `| 9 | Did anyone ask for something that was on the map but not findable? | Names a gap between what is drawn and what is legible; sends the fog plan back to label density or disc prominence. | *(pending)* |`
  - `| 10 | Did anyone ask to see a different floor without using the slab picker or a stair disc? | Shows the floor model is understood but its controls are not; the fog plan would need a more visible floor selector or a party-following auto-reveal. | *(pending)* |`
- The last five lines of the file are a work-order footer left behind by the order that generated the record: a `---` rule, then `## STATUS:`, then `## DEVIATIONS:` and its `- KNOWN STATE re-verified or wrong:` bullet. A table-test record is not a work order and must not carry them.
- The file is 129 lines, so reading it whole is the scope. Change only the three things named in DO. The `## Setup`, `## Observed`, `## Asked afterwards`, `## Verdict` and `## Actions` sections are correct as they stand and are not yours to touch.

START IN:
- docs/table-tests/2026-07-27-kid-map-viewer-stage-9.md — the Status line, the Watching for table, the Standing questions table, and the footer after the Actions table

DO:
- In `docs/table-tests/2026-07-27-kid-map-viewer-stage-9.md`, change the line matching `> **Status:** pending` to `> **Status:** planned`
- In that same file, replace every row of the `## Standing questions` table with the six verbatim rows in KNOWN STATE, and append the three verbatim rows 8-10 to the `## Watching for` table after its row 7
- In that same file, delete the trailing footer — the `---` rule, `## STATUS:`, `## DEVIATIONS:` and its bullet — so the file ends with the last row of the `## Actions` table

STOP WHEN: `grep -q '^> \*\*Status:\*\* planned' docs/table-tests/2026-07-27-kid-map-viewer-stage-9.md && ! grep -qE '^## (STATUS|DEVIATIONS):' docs/table-tests/2026-07-27-kid-map-viewer-stage-9.md && .venv\Scripts\python.exe scripts/check_docs.py --check`

STATUS: DONE

DEVIATIONS:
- KNOWN STATE re-verified or wrong: none
