# Active plans

The sole queue/status view: every in-flight plan, which areas it touches, what it waits on, and the
state of its work orders. **This file is generated** by `scripts/check_docs.py` and checked for
staleness on every run — do not hand-edit it. Refresh with
`.venv\Scripts\python.exe scripts/check_docs.py --write-generated`. Area guides no longer carry per-area
plan tables; this is the only place a plan's queue/status state is shown.

Point a skill at a row and it has what it needs to start.

- **Areas** comes from the plan's `**Areas:**` header line — the stable area-guide slugs it owns.
- **Depends on** comes from the plan's `## Touches` section (a `**Depends on:**` bullet linking the other plan). Rows
  are sorted so a plan always appears after the plans it depends on.
- **State** is `blocked` while any plan it depends on is still active, and `ready` once they have all
  been archived. Archiving a plan is what unblocks its dependents.
- **Orders** counts the `NN-slug.md` files in the plan's directory and the `STATUS:` line each
  executor wrote into one.
- **Next** is derived from those STATUS values by a fixed rule — no orders compiled → `to-orders`,
  any order unrun → `dispatch-orders`, any `FAILED`/`BLOCKED` → `dispatch-orders` to triage, all
  `DONE` → `reconcile`.
- **Nothing here ranks the ready plans.** Several can be ready at once, and which one to pick up is
  decided per session rather than recorded in a file. `State` says what *can* start, never what
  *should*.

<!-- GENERATED:ACTIVE_INDEX:START -->
| Plan | Areas | Depends on | State | Orders | Next | Status |
| --- | --- | --- | --- | --- | --- | --- |
| [Production Nightly Deploys](production-nightly-deploys/production-nightly-deploys.md) | [infra](../../areas/infra.md) | — | ready | none compiled | `to-orders` | Part of Stage 1 has already shipped out of band — see *Landed early* below. |
| [Table Testing Contract](table-testing-contract/table-testing-contract.md) | [infra](../../areas/infra.md) | — | ready | none compiled | `to-orders` | Stage 3 shipped — the independent candidate ideas bank and evidence-linked card format are documented, and legacy table-test records are clearly marked as historical. |
| [Table Testing Records](table-testing-records/table-testing-records.md) | [infra](../../areas/infra.md) | — | ready | none compiled | `to-orders` | Superseded by the Table Testing Contract plan; do not compile further orders from this plan. |
<!-- GENERATED:ACTIVE_INDEX:END -->
