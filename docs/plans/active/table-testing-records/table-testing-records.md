# Table Testing Records — real sessions become a comparable, checked record

> **Status:** Stage 1 shipped — the format is documented in `docs/TABLE_TESTING.md` and routable, and both existing records conform to it. Next is Stage 2, hooking records to plans via `PLAN_TEMPLATE.md` and the `to-orders` skill so sessions produce records by default rather than by remembering to.

- **Area guide:** [Infra](../../../areas/infra.md)
- **Read trigger:** Recording a real session, the table-test format, or its lifecycle and checks


## Touches

- `docs/README.md`
- `docs/table-tests/**`

## What we're building & why

`TESTING.md` owns automated checks. Nothing owns *what the device taught us* — and that is the
expensive gap, not the cheap one. The Loom drag-and-drop bug shipped with green unit tests and a drop
target that was a sliver in a real browser; automated tests assert what is shown, never what a child
does with it. The Player App plans make this structural rather than occasional: every one of them
ends at something playable, and Plan 0's final stage is literally "run a real session and record what
the device taught us".

Right now that recording is ad hoc. Work order `03-session-run` asks for prose under a
`## Stage 6 learnings` heading inside the plan. Three plans from now that produces three
differently-shaped learnings sections, no way to compare session one to session six, and observations
that decay into the plan they were written in.

So this plan makes a **table test** a first-class document type: one real session, run with the real
operators on the real device, recorded once in `docs/table-tests/`, folded into a plan, then frozen.
Each record carries a small set of **standing questions** asked identically every time, so the
answers form a trend instead of an anecdote — including one question that can only be answered by the
*following* session's record, which is the product's central claim: did they remember something
because of the app?

**Settled decisions**

- **"Table test", not "playtest".** It pairs with the `at_the_table` pointer and the "the table is
  where the game is played" principle, and distinguishes this from software playtesting.
  `scratch/dm-player-split-intent.md` says "To watch in playtest"; that phrasing is reconciled, not
  adopted.
- **The record is a record.** Its `## Actions` table points outward at a plan stage or a GitHub
  issue and fixes nothing itself. This is what stops it becoming a second, parallel plan — the
  failure mode `MEMORY.md` was already corrected for.
- **`## Observed` is append-only and never edited for tone.** The value is the raw thing that was
  noticed, not the tidy version.
- **The human fills three sections.** Setup, Watching for, and the header are pre-written from the
  plan by Claude; the human who runs the session fills only Observed, Asked afterwards, and Verdict.
  A format that asks a tired DM to write structured prose at 9pm will not survive its second use.
- **Records outlive their plans.** They live in `docs/table-tests/`, not under `plans/`, so archiving
  a completed plan never buries the evidence that shaped it.
- **Exactly three statuses: `planned` → `run` → `folded in`.** No fourth state. The
  `2026-07-27-kid-map-viewer-stage-9.md` record's `pending` is the same thing as `planned` and is
  corrected to it, rather than the vocabulary growing to accommodate one record.
- **The standing questions are a fixed block, identical in every record, checked verbatim.** That is
  the whole reason they exist — a reworded question breaks the trend as surely as a dropped one.
  Session-specific questions have a home already: `## Watching for`. The 2026-07-27 record replaced
  all six with seven of its own; those seven move to `Watching for`, which is where they belonged.

## Stages

1. **Cut the reference.** Write `docs/TABLE_TESTING.md` — what a table test is, the
   `planned → run → folded in` lifecycle, the required headings, the standing questions, and the
   record index. Add its manifest row and a Task Router row for "running or recording a real
   session". `docs/table-tests/_example/` and the first record already exist and become the
   reference's worked example rather than being rewritten. Also normalises
   `2026-07-27-kid-map-viewer-stage-9.md` to the settled format — status word, the fixed standing
   block, and the stray work-order footer it still carries — so the Stage 3 checker lands on
   conforming data. Ends with the format documented and
   routable.

2. **Hook it to plans.** One addition to `PLAN_TEMPLATE.md`: a plan stage that ends at something
   playable names its table test, and its Shipped row links the record rather than restating it.
   Update the `to-orders` skill so a session-run order's stop condition is "the record exists with
   Status `run`" instead of "prose exists in the plan". Retrofit Player App Skeleton Stage 6 to the
   new shape. Ends with the workflow producing records by default rather than by remembering to.

3. **Enforce it.** Extend `scripts/check_docs.py`: every record under `docs/table-tests/` (excluding
   `_example/`) carries a Status from the allowed set and the required headings; a record with Status
   `folded in` is frozen; and the record index is **generated** into `TABLE_TESTING.md` with a
   staleness check, in the same shape as the existing reference inventories, so no one hand-maintains
   a list that restates the directory. Ends with the contract checked in CI rather than trusted.

4. **Fold in the first record.** Take the real Stage 6 session's Verdict and Actions, drive them into
   Plan 1's scope and into issues, set that record to `folded in`, and confirm the loop closes — a
   session produces changes, and the record shows exactly which. Ends with the system proven on real
   data rather than on its own description.

## Shipped

| Stage | What shipped (≤2 sentences) |
|-------|------------------------------|
| 1 | `docs/TABLE_TESTING.md` defines the table test as a document type — the `planned → run → folded in` lifecycle, the required headings, the fixed standing questions, who fills what and when, and a hand-written record index — with routing rows in the manifest and the Task Router. The second record, `2026-07-27-kid-map-viewer-stage-9.md`, was normalised to that format: status word `planned`, the fixed six standing questions restored, its seven session-specific ones moved to `## Watching for` or dropped as duplicates, and its stray work-order footer removed. |
