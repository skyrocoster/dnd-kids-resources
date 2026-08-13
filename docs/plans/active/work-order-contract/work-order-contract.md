# Work-Order Contract — preserve reviewed compile envelopes losslessly

> **Status:** Not started. One ordered bootstrap stage remains.

- **Read trigger:** Replacing the work-order artifact contract, compiler, checker, or authoring guidance

## What we're building & why

Replace the current work-order format and production authoring tooling from first principles. A reviewed
frontier compile packet must become one canonical, human-readable executor order without inferred paths,
compressed actions, artificial size limits, synthesized proof commands, or compatibility parsing.

Because no experimental ordered implementation skill exists, and that skill cannot be designed until this
artifact contract is settled, the frontier separately authorizes direct coordinator implementation of this
Plan as a one-time bootstrap exception. This does not authorize browser-harness execution, dispatch,
reconcile, commit, or a general ordered-execution route.

## Stages

1. **ORDERED — Replace and regenerate the work-order contract.** Replace the tooling and canonical
   documentation, remove the invalid legacy artifact, regenerate the Browser Validation Harness order at
   its canonical path without implementing or executing it, and leave active Plan state coherent.

## Shipped

| Stage | What shipped (≤2 sentences) |
|-------|------------------------------|

## Touches

- `scripts/new_order.py`
- `scripts/check_orders.py`
- `scripts/check_docs.py`
- `docs/PLAN_TEMPLATE.md`
- `docs/README.md`
- `docs/ARCHITECTURE.md`
- `docs/TESTING.md`
- `.opencode/skills/to-orders/SKILL.md`
- `.opencode/skills/author-workorders/SKILL.md`
- `.opencode/skills/implement-order/SKILL.md`
- `.opencode/skills/dispatch-orders/SKILL.md`
- `.opencode/skills/reconcile/SKILL.md`
- `docs/plans/_example/99-creature-row-ac.md`
- `backend/tests/test_new_order.py`
- `backend/tests/test_check_orders.py`
- `backend/tests/test_docs_contract.py`
- `backend/tests/test_experimental_order_authoring_contract.py`
- `backend/tests/test_work_order_packet_contract.py`

No dependency is required. No other active Plan has compiled orders or an ordering prerequisite for this
shared tooling replacement. The generated active index is verification output, not a hand-edited Touches
entry.

## Canonical packet and artifact contract

The only accepted order location is:

`docs/plans/active/<feature>/orders/<NN>-<slug>.md`

The generator receives one JSON packet. `output_path` is mandatory and authoritative; output placement is
never inferred. The packet shape is:

```json
{
  "output_path": "docs/plans/active/<feature>/orders/<NN>-<slug>.md",
  "identity": {"number": "01", "slug": "...", "title": "...", "goal": "..."},
  "depends_on": ["docs/plans/active/<feature>/orders/00-<slug>.md"],
  "required_strength": {"level": "Light", "reason": null},
  "authorization": {"creates": [], "edits": [], "removes": []},
  "context": [{"path": "...", "scope": {"kind": "anchor", "value": "..."}, "purpose": "..."}],
  "known_facts": ["..."],
  "actions": [{"kind": "file", "paths": ["..."], "instruction": "..."}],
  "proof": [{"cwd": ".", "command": "...", "purpose": "..."}],
  "acceptance_handoff": {"coordinator": {"requirements": ["..."]}, "validator": null},
  "exclusions": ["..."],
  "escalate_if": ["..."]
}
```

`context.scope.kind` is exactly `anchor`, `lines`, or `whole_file`; line scopes carry `start`, `end`, and
an exact anchor. File actions name exact authorized paths. Non-file actions, when required, use an explicit
structured marker such as `{"kind":"non_file","operation":"documentation_update","paths":[],"instruction":"..."}`;
they are never inferred from prose. Proof entries require exact `cwd`, `command`, and `purpose`, and render
the command verbatim in a fenced block. Coordinator requirements are mandatory; validator is either `null`
or an object with non-empty requirements. Dependencies are canonical order paths. No count limits apply.

The renderer appends the deterministic executor-owned shape:

```text
STATUS: PENDING

EXECUTOR RESULT:
- DEVIATIONS: none
- PROOF RESULTS: pending
- DIRTY PATHS: pending
- AUTHORIZATION AUDIT: pending
- GUARD EVENTS: none
- ATTEMPTS: 0
- ESCALATION: none
```

Compiled sections are immutable to the executor; only result/evidence values may be filled.

## Generator and checker decisions

Replace `scripts/new_order.py` and `scripts/check_orders.py` in place. The only authoring transports are:

```powershell
$packet | ConvertTo-Json -Depth 20 | .venv\Scripts\python.exe scripts/new_order.py --packet -
.venv\Scripts\python.exe scripts/new_order.py --packet path\to\packet.json
```

There are no repeated authoring flags, inferred output paths, implicit wrappers, lifecycle assertions,
co-located-suite inference, anchor derivation, action splitting, or proof rewriting. Paths convert Windows
separators to `/` but preserve root dots exactly. Exit `0` writes the requested file; exit `1` reports a
contract/render diagnostic and writes nothing; exit `2` reports transport/JSON failure. Existing output is
not overwritten without explicit `--force`.

The checker is strict and discovers only `docs/plans/active/*/orders/[0-9][0-9]-*.md`. It rejects malformed
identity/output paths, invalid or contradictory authorization, unauthorized actions, malformed non-file
markers, invalid context scopes, unresolved placeholders, missing exact proof, malformed dependencies,
missing coordinator acceptance, absent exclusions/escalation, and missing deterministic executor evidence.
It applies no arbitrary path/action/proof ceilings. `scripts/order_check.py` remains unchanged; proof
commands are executor-visible exact commands and are not routed through it unless the packet explicitly says so.

## Acceptance

1. A packet containing `.opencode/skills/browser-validation-invoke/SKILL.md`, Windows separators, absent
   creates, many actions/paths/proofs, exclusions, escalation rules, and an optional validator compiles.
2. The exact nested `output_path` is written; dot paths, commands, `cwd`, purposes, action order, and paths
   round-trip without inference or rewriting.
3. New files require no fabricated context anchor, and non-file actions require explicit structure.
4. No caps, existence checks, wrapper synthesis, action compression, or command rewriting appear.
5. The checker deterministically rejects missing/ambiguous/contradictory authorization, unauthorized action
   paths, invalid context, unresolved placeholders, malformed identity/dependencies/output, missing proof,
   acceptance, exclusions, escalation, or evidence.
6. Sibling-location orders are not discovered or accepted. The legacy Browser Validation Harness order is
   removed and regenerated only at `docs/plans/active/browser-validation-harness/orders/01-browser-validation-harness.md`.
7. Documentation generation and checking pass without implementing or executing the browser harness.

## Proof contract

```powershell
.venv\Scripts\python.exe -m pytest --no-cov backend/tests/test_new_order.py backend/tests/test_check_orders.py backend/tests/test_docs_contract.py backend/tests/test_experimental_order_authoring_contract.py backend/tests/test_work_order_packet_contract.py
.venv\Scripts\python.exe scripts/check_orders.py
.venv\Scripts\python.exe scripts/check_docs.py --write-generated
.venv\Scripts\python.exe scripts/check_docs.py --check
```

If context validation changes guard integration, also run the focused read-guard and large-read-guard
suites. The packet contract test is `backend/tests/test_work_order_packet_contract.py`.

## Exclusions

- No browser harness implementation, execution, or live validation.
- No dispatch, executor implementation, reconcile, commit, or push.
- No legacy parser, fallback, migration adapter, sibling discovery, or old executor compatibility.
- No change to `scripts/order_check.py`.
- No automatic proof wrappers, lifecycle assertions, co-located-suite inference, action splitting, or
  semantic rewriting.
- No artificial order-size policy and no weakening of read-guard or large-read-guard safety.
- Archived/done orders are historical and are not migrated.

## Compiler handoff

### Stage 1

- **Verified edit sites:** `scripts/new_order.py` — `json_argv`, `build`, `render`, and CLI `main`; current
  implementation expands repeated legacy fields, derives ranges/co-located suites/lifecycle assertions,
  rewrites proof through `order_check.py`, applies caps, and infers sibling output at line 480.
- **Verified edit sites:** `scripts/check_orders.py` — path normalization, section parsing, authorization
  derivation, cap constants, and order discovery near lines 1372-1375; replace the old parser/discovery with
  strict canonical packet-order validation and preserve only exact root-dot normalization behavior.
- **Verified edit sites:** `scripts/check_docs.py` — generated active-index/order discovery integration;
  it must consume only nested canonical orders and generated output must be refreshed, never hand-edited.
- **Verified tests:** `backend/tests/test_new_order.py` and `backend/tests/test_check_orders.py` — rewrite
  legacy generator tests around packet rendering, rejection invariants, and losslessness.
  `backend/tests/test_work_order_packet_contract.py` covers dot paths, Windows separators,
  command strings, output location, structured authorization, optional validator, unlimited collections,
  and every rejection invariant.
- **Verified documentation consumers:** `docs/PLAN_TEMPLATE.md`, `docs/README.md`, `docs/ARCHITECTURE.md`,
  `docs/TESTING.md`, `.opencode/skills/to-orders/SKILL.md`, `.opencode/skills/author-workorders/SKILL.md`,
  `.opencode/skills/implement-order/SKILL.md`, `.opencode/skills/dispatch-orders/SKILL.md`,
  `.opencode/skills/reconcile/SKILL.md`, and `docs/plans/_example/99-creature-row-ac.md` all state the
  old sibling location or legacy fields and require canonical-contract updates.
- **Settled contracts:** one JSON packet; mandatory authoritative output; nested `orders/`; explicit
  authorization/context/actions/proof/acceptance/exclusions/escalation/evidence; no compatibility; unchanged
  `order_check.py`; no arbitrary limits; exact proof preservation; Browser Harness regeneration only.
- **Constraints:** ordinary agents continue invoke-only source rules; generated indexes are regenerated with
  `check_docs.py --write-generated`; the bootstrap exception authorizes only direct coordinator implementation
  of this Plan and never browser-harness execution or general ordered execution.
- **Open questions:** none.
