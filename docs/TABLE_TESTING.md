# Table Testing — Running and Recording Real Sessions

## What a table test is and why

A table test is one real session of the game, run with the real operators on the real device, recorded once. It exists because automated tests assert what is shown and never what a child does with it. The Loom drag-and-drop bug shipped with green unit tests and a drop target that was a sliver on real glass — the evidence that shaped the feature came from the table, not from a test suite. Table tests capture what the device taught us.

`docs/TESTING.md` owns automated checks; this document owns what the device taught us.

## Lifecycle

A table test record has exactly three statuses:

- **`planned`** — The record is created with its header, `## Setup` and `## Watching for` sections pre-written from the plan stage it serves. The planner writes these before the session.
- **`run`** — The human who ran the session has filled `## Observed`, `## Asked afterwards`, and `## Verdict`. The session is complete and the findings are recorded.
- **`folded in`** — The record's `## Actions` table has been driven into plan stages or GitHub issues. Once folded in, the record is frozen and never edited again.

## Required structure

A table test record must have the following structure, in this exact order:

1. An H1 title of the form: `# Table Test — YYYY-MM-DD — <plan> Stage <n>`
2. A status blockquote: `> **Status:** <status>`
3. A bullet header block with these five or six items:
   - **Plan:** Link to the plan and stage
   - **Build:** Git SHA or build reference
   - **Device:** What device was used and how it was launched
   - **Operators:** Names and ages of participants
   - **Content:** What was at the table
   - **Previous record:** Link to the earlier session record (if this is not the first)
4. Eight required heading sections in order: `## Setup`, `## Watching for`, `## Standing questions`, `## Observed`, `## Asked afterwards`, `## Verdict`, `## Actions`

## Standing questions

The standing questions are identical in every table test so the answers form a trend rather than an anecdote. They must appear verbatim in every record:

| # | Question | Answer |
|---|---|---|
| 1 | Did anyone pick the device up unprompted? | |
| 2 | Did it pull attention **off** the table? | |
| 3 | Could the older child use it without help? The younger? | |
| 4 | Did anyone ask you to refresh it, or say it was wrong? | |
| 5 | Did anyone know something the fiction never told them? | |
| 6 | *(answered in the **next** record)* Did they remember something because of the app? | |

## Division of labour

- **The planner pre-writes:** The header, `## Setup` (with checkboxes ticked as you go, or marked N/A with reason), and `## Watching for` (questions derived from the plan's open questions and provisional decisions).
- **The session runner fills:** `## Observed` (raw bullets, written within 24 hours; append-only and never edited for tone), `## Asked afterwards` (responses from the older child first, then the younger separately), and `## Verdict` (three lines: Worked, Broke, Surprised me).
- **During fold-in:** `## Actions` is written, pointing each finding outward at a plan stage or a GitHub issue.

This division exists because a format that asks a tired DM to write structured prose at 9pm will not survive its second use.

## Content rules

**`## Observed` is append-only.** The section is never edited for tone or tense because the value is the raw thing that was noticed, not the tidy version of it. Capture findings on paper at the table; transcribe them after with minimal editing.

**`## Actions` table points outward only.** Every row names a plan stage or a GitHub issue, which is what stops a record becoming a second, parallel plan. Nothing is fixed inside a table test record.

## Where records live and how to start one

Records live at `docs/table-tests/YYYY-MM-DD-<slug>.md`, where the date is the date the session was played and the slug names the plan and stage it serves. To start a new record, copy `docs/table-tests/_example/session-template.md` and fill in the header and pre-written sections.

The `docs/table-tests/_example/` folder is a template only and holds no session data. It is excluded from the record index. Records live outside `docs/plans/` on purpose, so archiving a completed plan never buries the evidence that shaped it.

## Worked example

[2026-07-23 — Player App Skeleton Stage 6](table-tests/2026-07-23-player-app-skeleton-stage-6.md) is a complete, shipped record. It demonstrates a full set of Setup boxes ticked, crossed, or marked N/A with reasons inline; `## Watching for` answered in a fourth column; and an `## Actions` table whose every row names the plan stage that finding went to.

## Record index

| Date | Status | Plan and Stage |
|---|---|---|
| [2026-07-23](table-tests/2026-07-23-player-app-skeleton-stage-6.md) | run | Player App Skeleton Stage 6 |
| [2026-07-27](table-tests/2026-07-27-kid-map-viewer-stage-9.md) | planned | Kid Map Viewer Stage 9 |
