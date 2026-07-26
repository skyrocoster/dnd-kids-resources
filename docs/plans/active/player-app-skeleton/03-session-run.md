WORK ORDER 03 — Run a real session and record learnings as Plan 1 input
GOAL: A Widdershins Academy session is run on a real tablet; what the device taught us is written into `docs/plans/active/player-app-skeleton.md` under a `## Stage 6 learnings` heading as the input to Plan 1.
DEPENDS ON: 01, 02
REQUIRED STRENGTH: High
CREATES: none
REMOVES: none

KNOWN STATE (already true — do NOT redo or re-derive):
- Orders 01 and 02 are both DONE: polling survives sleep/wake, `--kid-control-height: 64px` is in the theme, destination buttons meet the floor, copy is verified, no-exit audit passes.
- The seeded school and annex are fully loadable (`python scripts/seed_database.py --dungeons`).
- The tablet at `/play/map` shows the live school map, pans, zooms, and polls the at-the-table pointer every 5 seconds.
- The shell at `/play` has one destination (Map) linking to `/play/map`. There is no back/home/DM link anywhere.
- The DM sets the at-the-table dungeon from a "Put at the table" / "At the table" control in the
  Map Lab session view's Session toolbar tray
  (frontend/src/features/dungeons/maplab/MapLabPage.tsx). This control did not exist until
  Stage 5.4 — before that fix, `setAtTheTable` was wired end-to-end (backend, API client, tests) but
  no UI ever called it, so `/play/map` could only ever show "No map yet." Use this control to put
  Widdershins Academy at the table before starting the session.
- Kid operators are ages four and six. The four-year-old is "only beginning to read" (plan line 49).
- The session record already exists, pre-filled with Setup, Watching for, and Standing questions:
  `docs/table-tests/2026-07-23-player-app-skeleton-stage-6.md`. It is the deliverable — do NOT write
  learnings prose into the plan. The format is templated at `docs/table-tests/_example/` and will be
  formalised by `docs/plans/active/table-testing-records.md`.

START IN:
- docs/table-tests/2026-07-23-player-app-skeleton-stage-6.md
- docs/plans/active/player-app-skeleton/player-app-skeleton.md

DO:
- Work the record's `## Setup` checklist, then run a Widdershins Academy session on a real tablet with a 4- and 6-year-old at the table.
- Observe against the record's `## Watching for` and `## Standing questions` tables. Capture on paper at the table; transcribe within 24 hours.
- Fill the record's `## Observed`, `## Asked afterwards`, and `## Verdict` sections, set its Status to `run`, and add a one-line Shipped row to the plan linking the record.

STOP WHEN: the record's Status is `run` and its `## Observed` and `## Verdict` sections are filled. Then stop — do not modify any code.

STATUS: BLOCKED - requires physically running a Widdershins Academy session on a real tablet with 4- and 6-year-old children, which an AI cannot perform.

FAILURE REPORT:
- TRIED: nothing — the order's DO steps require a human at the table; no code or record edits were attempted.
- FAILING COMMAND: none — STOP WHEN is a human-run condition (record Status set to `run` with Observed/Verdict filled), not a runnable command.
- OUTPUT: n/a
- SUSPECT: the order needs the user, not a model. The user must run the session and fill the record at `docs/table-tests/2026-07-23-player-app-skeleton-stage-6.md`, or hand the observations back to this order. A blocking gap found ahead of this run — no UI ever called `setAtTheTable`, so the tablet could never show a dungeon — is now fixed as plan Stage 5.4; use the Map Lab session view's "Put at the table" control to start the session.
- WORKTREE: clean — no changes made by this order.
