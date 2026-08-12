---
name: to-orders
description: Compile one settled Plan stage into one or more lossless canonical work-order packets and artifacts.
---

# to-orders — compile one Plan stage

The strong coordinator owns product coherence, order boundaries, dependencies, strength, scope, proof,
acceptance, exclusions, and escalation. A Plan stage is a human-visible shipment; orders are executor
boundaries. A one-order Plan is valid. Use multiple orders only for genuine independent or sequential
executor boundaries, never because of file/action counts.

For each approved order, build one JSON packet matching `docs/PLAN_TEMPLATE.md`. Keep these concerns
separate and explicit:

- exact canonical `output_path` under `docs/plans/active/<feature>/orders/`;
- identity, canonical dependency paths, and strength rationale;
- authorized creates, edits, and removes;
- bounded context inputs (not edit authorization);
- settled known facts and ordered structured actions;
- exact proof commands with working directories and purposes;
- coordinator and optional validator acceptance;
- exclusions and escalation boundaries.

Do not infer or compress. A new file belongs in authorization without a fake context entry. Root
dot-directory paths remain exact. Exact proof commands are preserved; wrappers are used only when the
frontier explicitly selected that exact command. There are no mechanical size caps—the frontier reviews
coherence.

Invoke `scripts/new_order.py --packet -` or `--packet <path>`, then invoke
`scripts/check_orders.py <exact paths>`. Both are invoke-only. Review the rendered order semantically;
checker success is necessary but not sufficient. Do not dispatch or implement while compiling unless a
separate workflow explicitly authorizes that lifecycle.
