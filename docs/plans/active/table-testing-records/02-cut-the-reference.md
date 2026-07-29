WORK ORDER 02 — Cut the table-testing reference
GOAL: `docs/TABLE_TESTING.md` exists and defines the table-test format, and both routing tables point at it.
DEPENDS ON: 01
REQUIRED STRENGTH: Light
CREATES:
- docs/TABLE_TESTING.md
REMOVES: none
CHANGES SIGNATURE: none

KNOWN STATE (already true — do NOT redo or re-derive):
- What a table test is: one real session of the game, run with the real operators on the real device, recorded once. It exists because automated tests assert what is shown and never what a child does with it — the Loom drag-and-drop bug shipped with green unit tests and a drop target that was a sliver on real glass. `docs/TESTING.md` owns automated checks; this document owns what the device taught us. Say this in the opening, briefly.
- The lifecycle has exactly three statuses and no fourth: `planned` → `run` → `folded in`. A record is created as `planned` with its header, `## Setup` and `## Watching for` pre-written from the plan stage it serves; it becomes `run` once the human who ran the session has filled `## Observed`, `## Asked afterwards` and `## Verdict`; it becomes `folded in` once its `## Actions` have been driven into plan stages or GitHub issues, after which the record is frozen and never edited again.
- Required structure of a record, in this order — Stage 3 of the plan will check exactly this: an H1 of the form `# Table Test — YYYY-MM-DD — <plan> Stage <n>`; a `> **Status:** <status>` blockquote; a bullet header block of Plan, Build, Device, Operators, Content, Previous record; then the headings `## Setup`, `## Watching for`, `## Standing questions`, `## Observed`, `## Asked afterwards`, `## Verdict`, `## Actions`.
- The standing questions are a FIXED block, byte-identical in every record and checked verbatim, which is the whole reason they exist — a reworded question breaks the trend as surely as a dropped one. Session-specific questions have their own home: `## Watching for`. Reproduce the six in the reference exactly as they appear in `docs/table-tests/_example/session-template.md` lines 34-39. Question 6 is deliberately answerable only by the *following* record, which is the product's central claim.
- Division of labour, and the reason for it: Claude pre-writes the header, `## Setup` and `## Watching for` from the plan stage; the human who runs the session fills only `## Observed`, `## Asked afterwards` and `## Verdict`; `## Actions` is written when the record is folded in. A format that asks a tired DM to write structured prose at 9pm will not survive its second use.
- Two content rules the reference must state: `## Observed` is append-only and is never edited for tone, because the value is the raw thing that was noticed rather than the tidy version of it; and the `## Actions` table fixes nothing itself, every row pointing outward at a plan stage or a GitHub issue, which is what stops a record becoming a second parallel plan.
- Records live at `docs/table-tests/YYYY-MM-DD-<slug>.md`, where the date is the date the session was played and the slug names the plan and stage it serves. To start one, copy `docs/table-tests/_example/session-template.md`. That `_example/` folder is a template only, holds no session data, and is excluded from the record index. Records live outside `plans/` on purpose, so archiving a completed plan never buries the evidence that shaped it.
- Link `docs/table-tests/2026-07-23-player-app-skeleton-stage-6.md` (Status `run`) as the worked example. Do NOT rewrite or restate its contents — link to it and say in a sentence or two what it demonstrates: a full set of Setup boxes ticked, crossed or marked N/A with the reason inline, `## Watching for` answered in a fourth column, and an `## Actions` table whose every row names the plan stage that finding went to.
- The record index is a plain hand-written table in this document for now; Stage 3 of the plan replaces it with a generated block and a staleness check, so keep it simple and do not invent a `GENERATED:` marker. Its two rows, verbatim (order 01 has already set the second record's status to `planned`):
  - <code>&#124; &#91;2026-07-23&#93;(table-tests/2026-07-23-player-app-skeleton-stage-6.md) &#124; run &#124; Player App Skeleton Stage 6 &#124;</code>
  - <code>&#124; &#91;2026-07-27&#93;(table-tests/2026-07-27-kid-map-viewer-stage-9.md) &#124; planned &#124; Kid Map Viewer Stage 9 &#124;</code>
- The `## Document Inventory` table in `docs/INVENTORY.md` runs from line 8 to line 24 and is hand-maintained; only the `### Area guides and plans` block below it is generated. `docs/table-tests/` already has a row there — do not add a second one for the directory. Insert this row verbatim immediately after the row whose Document cell links the plan template, and immediately before the row whose Document cell links the `table-tests/` directory:
  - <code>&#124; &#91;docs/TABLE_TESTING.md&#93;(docs/TABLE_TESTING.md) &#124; Reference &#124; Canonical &#124; Active &#124; Running or recording a real session at the table, the record format, or its lifecycle &#124; The table-test format, lifecycle, standing questions, or checks change &#124;</code>
- The `## Task Router` table in `docs/README.md` runs from line 13 to line 32. Insert this row verbatim immediately after the `| Documentation maintenance |` row:
  - <code>&#124; Running or recording a real session at the table &#124; &#91;Infra&#93;(areas/infra.md) &#124; `docs/TABLE_TESTING.md`, `docs/table-tests/_example/session-template.md`, then the plan the session serves &#124;</code>
- Both `docs/INVENTORY.md` (86 lines) and `docs/README.md` (34 lines) are short — reading each whole is the scope. `docs/table-tests/_example/session-template.md` is 72 lines.
- `scripts/check_docs.py --check` is green on this branch as of 2026-07-29, so any failure it reports is yours.

START IN:
- docs/table-tests/_example/session-template.md — the blank form; its headings are the required headings and its lines 34-39 are the six standing questions
- docs/INVENTORY.md — the hand-maintained `## Document Inventory` table, lines 8-24
- docs/README.md — the `## Task Router` table, lines 13-32

DO:
- Create `docs/TABLE_TESTING.md` covering, in this order: what a table test is and why, the three-status lifecycle, the required record structure, the fixed standing questions, who fills what and when, where records live and how to start one, the worked example, and the record index — all from KNOWN STATE, inventing no rule it does not give
- Insert the verbatim `docs/TABLE_TESTING.md` row into the `## Document Inventory` table in `docs/INVENTORY.md` at the position named in KNOWN STATE
- Insert the verbatim table-test row into the `## Task Router` table in `docs/README.md` after the `| Documentation maintenance |` row

STOP WHEN: `test -f docs/TABLE_TESTING.md && grep -q 'TABLE_TESTING.md' docs/INVENTORY.md && grep -q 'TABLE_TESTING.md' docs/README.md && .venv\Scripts\python.exe scripts/check_docs.py --check`

STATUS: DONE

DEVIATIONS:
- KNOWN STATE re-verified or wrong: none
