# Generated Documentation — the docs a script can derive stop being written by hand

> **Status:** Complete — all seven stages shipped 2026-07-29. 33 generated blocks across 15 documents, up from 7 across 7.

- **Area guide:** [Infra](../../../areas/infra.md)
- **Read trigger:** Generated documentation blocks, the `GENERATED:` marker mechanism, what `--write-generated` refreshes, or whether a doc section should be hand-written at all


## What we're building & why

Seven documentation sections already generate themselves from source and fail `check_docs.py --check`
when they go stale. Everything else is typed by a model, and a large share of it is derivable:
`API_REFERENCE.md` hand-maintains ~280 lines of endpoint tables that sit directly above a generated
block covering the same 91 routes; `INVENTORY.md` hand-lists all 37 archived plans that
`plans/done/INDEX.md` already generates; every area guide's `## Work queue` restates plan Status lines
that `plans/active/INDEX.md` already generates. The same facts are stated three and four times, and a
model rewrites them at every reconcile.

This plan pushes the generated boundary as far as it honestly goes. The test for each section is
whether a script can derive it from a fact that is *authored once somewhere else* — a route's
docstring, a plan's Status line, a script's `--help`. Where that fact doesn't exist in code yet, we
create a home for it there rather than accept a hand-written copy: 21 undocumented routes get
docstrings, and every plan gains a `**Read trigger:**` line so the manifest can be generated from the
plans instead of describing them from outside. What stays hand-written is what genuinely needs
judgement — why a plan supersedes another, what a contract means, which reference to read first.

**Settled decisions**

- **The Purpose column comes from the route docstring.** 70 of 91 routes already have one; the other
  21 (mostly `loom.py`) get one backfilled. A route with no docstring becomes a checker failure, so
  the column can never generate blank.
- **Each router keeps its hand-written note.** The prose above a router's table carries facts the
  code doesn't state — the `quick_rules` validation rule on Spells, for instance. Only the table
  generates.
- **`**Read trigger:**` is authored in the plan.** It moves into the plan header, where the person
  who understands the plan is already writing, and generates outward into `INVENTORY.md`. The 42
  existing plans are backfilled from their current manifest rows.
- **Generated status, hand-written reasoning.** Area-guide work queues get a generated plan table
  (link, state, status) with the human bullets kept below it. The bullets carrying real judgement —
  "supersedes Kid Map Legibility, which shipped three stages against a wrong diagnosis", "gear and
  weapons are an open branch with no plan" — are exactly what a script cannot derive and must not
  lose.
- **`docs/README.md`'s Task Router column names the area, not the stage.** Its per-plan stage
  suffixes ("Stage 1 next", "shipped") are a fourth copy of a fact now stated in two generated
  places. They are removed rather than generated; the Task and Read-first columns stay editorial.
- **This plan goes first.** Production Nightly Deploys and Table Testing Records both gain a
  `**Depends on:**` line pointing here, because both build on what Stage 1 reshapes.

## Stages

1. **Let a document hold more than one generated block.** The marker mechanism is currently one
   marker per file, which is why nothing can generate per-router or per-area sections. Extend it to
   any number of named blocks per document, keyed by name, with `--check` naming each stale block
   individually. The seven existing blocks keep working unchanged and nothing new generates yet.

2. **The API reference generates its own tables.** Backfill docstrings on the 21 routes that lack
   one, then replace every hand-typed per-router endpoint table with a generated block whose Purpose
   column reads from the docstring. Each router's hand-written note survives above its table. The
   checker fails a route with no docstring, and the old bottom-of-file generated inventory is
   retired now that the per-router tables supersede it.

3. **Read triggers move into the plans.** Add `**Read trigger:**` to the plan header contract in
   `PLAN_TEMPLATE.md` and the `plan` skill, backfill it across all 42 active and archived plans by
   seeding from their existing `INVENTORY.md` rows, and make the checker require it on every plan.
   Ends with the fact authored where the plan is written and nowhere else.

4. **The manifest generates its plan and area rows.** `INVENTORY.md`'s archived-plan, active-plan and
   area-guide rows generate from the plan files themselves. The canonical-reference rows and the
   Entry Points table stay hand-written, because their read and update triggers are editorial.

5. **Area guides stop restating plan status.** Each area guide gets a generated plan table, keyed by
   the plan's `**Area guide:**` link, carrying link, state and Status line. The hand-written bullets
   below it keep only what a script can't derive. `docs/README.md`'s router column drops its stage
   suffixes in the same change.

6. **Architecture and testing inventories.** The script table in `ARCHITECTURE.md` generates from
   each script's `--help` output and module docstring; the test-location prose in `TESTING.md`
   generates from the test tree. Both are lower-churn than the earlier stages and are cheap once the
   mechanism from Stage 1 exists.

7. **Wire it into the workflow.** Update `reconcile` so closeout runs `--write-generated` instead of
   hand-editing the manifest, area queues and API tables, and so its "what stays yours" list matches
   what is actually still hand-written. Update `CLAUDE.md`'s documentation contract to name the new
   generated sections. Ends with no skill instructing a model to type something a command derives.

## Shipped

| Stage | What shipped (≤2 sentences) |
|-------|------------------------------|
| 1 | A document can now hold any number of generated blocks, each addressed by a colon-segmented marker (`API:spells`) and staleness-checked on its own, so a failure names the block rather than the file. The seven pre-existing blocks were untouched. |
| 2 | Every per-router endpoint table and the schema inventory in `API_REFERENCE.md` now generate from the app's OpenAPI contract, with `Purpose` read from each route's docstring; 15 undocumented `loom.py` routes were backfilled so all 91 `/api/` routes carry one. Two new checks fail a route without a docstring and a router without a section — the latter immediately caught the `knowledge` router, which had never been documented. |
| 3 | Every plan carries `**Area guide:**` and `**Read trigger:**`, enforced by `check_plan_headers`. Backfilling revealed that every area-guide link in the repo was already broken (`../../areas/` resolves to a directory that does not exist) and several pointed at guides renamed in an earlier restructure; 39 plans were repaired. |
| 4 | `docs/INVENTORY.md`'s area-guide and plan rows generate from each document's own header fields and Status line. The hand-maintained table had been missing six plans entirely. |
| 5 | Each area guide's `## Work queue` opens with a generated in-flight plan table keyed by the plan's `**Area guide:**` link, with the hand-written bullets trimmed to what no script can derive. `docs/README.md`'s router column now names the area only. |
| 6 | The script inventory in `ARCHITECTURE.md` generates from each script's module docstring or leading comment — it had listed 6 of 25 scripts — and `TESTING.md` gained a generated test-location inventory. |
| 7 | `PLAN_TEMPLATE.md`, the `plan` skill, the `reconcile` skill and `CLAUDE.md` now state where each fact is authored and that a generated block is never hand-edited. `reconcile` no longer instructs anyone to write a manifest row or an area-guide status by hand. |

## Touches

- `scripts/check_docs.py`
- `backend/app/routers/**`
- `backend/tests/test_docs_contract.py`
- `docs/API_REFERENCE.md`
- `docs/ARCHITECTURE.md`
- `docs/TESTING.md`
- `docs/INVENTORY.md`
- `docs/README.md`
- `docs/PLAN_TEMPLATE.md`
- `docs/areas/*.md`
- `docs/plans/**`
- `.claude/skills/plan/SKILL.md`
- `.claude/skills/reconcile/SKILL.md`
- `CLAUDE.md`

