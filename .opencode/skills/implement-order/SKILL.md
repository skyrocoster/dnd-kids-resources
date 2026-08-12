---
name: implement-order
description: Execute exactly one canonical work order from docs/plans/active/<feature>/orders/. Use only when handed one checked order artifact.
---

# implement-order — execute one reviewed boundary

Read the order once. The embedded canonical JSON packet is the immutable compile envelope.

1. Trust `known_facts`; do not re-derive them.
2. Read only `context` paths and scopes. Context permits reading, not editing.
3. Touch only `authorization.creates`, `authorization.edits`, and `authorization.removes` through the
   ordered file actions. Explicit non-file actions do not authorize file changes.
4. Perform `actions` in order. Do not redesign, add paths, or start adjacent work.
5. Run each exact `proof` command, in order, from its declared `cwd`. Do not synthesize extra checks.
6. If one proof fails, make at most one in-scope repair and rerun the failed proof once. Escalate at the
   packet's `escalate_if` boundaries; never widen the order.
7. Fill only `STATUS` and the `EXECUTOR RESULT` values. Leave compiled Markdown and packet JSON unchanged.
   Use `DONE`, `FAILED - <reason>`, or `BLOCKED - <reason>`. Record proof results, dirty paths,
   authorization audit, guard events, attempts, deviations, and escalation truthfully.
8. Stop. One order per context.

The read guard still denies reflexive post-edit rereads. `new_order.py`, `check_orders.py`,
`order_check.py`, `stage_check.py`, and `check_docs.py` are invoke-only.
