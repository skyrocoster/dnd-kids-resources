# Telemetry collection is paused

Paused 2026-07-27 18:53.

Collection is paused by request after the 2026-07-27 cycle close. The mechanism is intact and the record is complete: nine cycles of order shape, cost and fault attribution live in docs/plans/telemetry-log.md and docs/plans/telemetry-archive/, and every lesson the log paid for is already enforced in scripts/check_orders.py, scripts/read_guard.py, scripts/order_check.py and the workflow skills. What is paused is the measuring, not the enforcement.

While this file exists, `scripts/order_telemetry.py` records nothing: `--snapshot`,
`--order`, `--reconcile` and `--planner-run` print one line and exit 0, so the telemetry
steps in `dispatch-orders`, `implement-order`, `reconcile` and `to-orders` stay in place
and stay harmless. Reading still works — `--render`, `--close-cycle` and `--import-log`
are unaffected, and `docs/plans/telemetry-log.md` plus `docs/plans/telemetry.jsonl`
remain the record of everything measured up to the pause.

To resume:

    .venv\Scripts\python.exe scripts/order_telemetry.py --resume

That deletes this file and nothing else. Nothing has to be reinstalled, and the next
entry lands in the same sidecar and renders into the same log.
