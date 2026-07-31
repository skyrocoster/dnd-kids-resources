# Active plans

Every in-flight plan, what it waits on, and the state of its work orders. **This file is generated**
by `scripts/check_docs.py` and checked for staleness on every run — do not hand-edit it. Refresh with
`.venv\Scripts\python.exe scripts/check_docs.py --write-generated`.

Point a skill at a row and it has what it needs to start.

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
| Plan | Depends on | State | Orders | Next | Status |
| --- | --- | --- | --- | --- | --- |
| [Kid Map Viewer](kid-map-viewer/kid-map-viewer.md) | — | ready | none compiled | `to-orders` | Complete and archived. |
| [Map Obstacle State](map-obstacle-state/map-obstacle-state.md) | — | ready | 2 · 0 done · 2 unrun | `dispatch-orders` | Stage 1 shipped — all 21 orders landed. |
| [Production Nightly Deploys](production-nightly-deploys/production-nightly-deploys.md) | — | ready | none compiled | `to-orders` | Not next for Infra; second in the Infra queue, after Table Testing Records. |
| [Table Testing Records](table-testing-records/table-testing-records.md) | — | ready | none compiled | `to-orders` | Stages 1–2 shipped — the format is documented in `docs/TABLE_TESTING.md`, and the workflow now produces records by default: `PLAN_TEMPLATE.md` teaches the `**Table test:**` stage line, `to-orders` stops session-run orders at a record, and Player App Skeleton Stage 6 demonstrates the shape. |
<!-- GENERATED:ACTIVE_INDEX:END -->
