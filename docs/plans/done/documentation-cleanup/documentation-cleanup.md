# Documentation Cleanup — a fresh, mechanically truthful documentation system

> **Status:** Shipped. The one ORDERED stage is complete and all closeout checks are green; awaiting human acceptance before commit.

- **Read trigger:** Rebuilding documentation routing, canonical references, generated documentation, or Plan/order discovery

## What we're building & why

Replace the current documentation system with a small, direct router and six authored canonical
references, while preserving useful current facts and the existing Plan/order and master-plan bodies.
Generated output must be derived from authoritative sources, and folder-local Plan/order metadata must
remain sufficient for discovery without central inventory or Plan indexes.

The result is one coherent repository outcome: a fresh reader can route from the root README to the
right reference or orchestration template, and the documentation checker is a deterministic writer whose
read-only check verifies the resulting mechanical truth.

## Stages

1. **ORDERED — Fresh documentation system.** Deliver the complete cleanup as one shipment. Internally, work orders may sequence (a) topology/consolidation and approved deletions, (b) checker and Plan/order discovery contract changes, and (c) surviving-link, instruction, test, generated-output, and full-proof repair. No internal step is independently shippable: until all three sequences complete, routes or checker contracts may be temporarily inconsistent.

## Shipped

| Stage | What shipped (≤2 sentences) |
|-------|------------------------------|
| 1 | Fresh documentation system: six authored canonical references plus the generated README under `docs/canonical/`, direct routing from root README and `docs/README.md`, folder-local Plan/order discovery without central indexes, approved deletions, and a mechanical checker with a deterministic writer. `check_docs --check`, `check_orders`, focused/backend tests, and the prior frontend gates are all green; writer is idempotent. |

## Touches

- `README.md`
- `AGENTS.md`
- `docs/README.md`
- `docs/canonical/ARCHITECTURE.md`
- `docs/canonical/API_REFERENCE.md`
- `docs/canonical/DATA_MODEL.md`
- `docs/canonical/DESIGN_SYSTEM.md`
- `docs/canonical/UX_PATTERNS.md`
- `docs/canonical/TESTING.md`
- `docs/canonical/README.md`
- `docs/ARCHITECTURE.md`
- `docs/API_REFERENCE.md`
- `docs/DATA_MODEL.md`
- `docs/DESIGN_SYSTEM.md`
- `docs/UX_PATTERNS.md`
- `docs/TESTING.md`
- `docs/PLAN_TEMPLATE.md`
- `docs/MASTER_PLAN_TEMPLATE.md`
- `docs/INVENTORY.md`
- `docs/plans/active/INDEX.md`
- `docs/plans/done/INDEX.md`
- `docs/plans/active/table-testing-contract/**`
- `docs/plans/active/table-testing-records/**`
- `docs/plans/active/production-nightly-deploys/*.md`
- `docs/plans/active/work-order-contract/*.md`
- `docs/plans/done/**/*.md`
- `docs/master-plans/*.md`
- `docs/areas/**`
- `docs/grilling-docs/**`
- `docs/Analysis/**`
- `docs/table-tests/**`
- `docs/ideas/**`
- `docs/FL-05-maplab-navigation-acceptance.md`
- `docs/plans/_example/**`
- `archive/ingestion/parse_dungeon_README.md`
- `frontend/README.md`
- `MEMORY.md`
- `.github/pull_request_template.md`
- `scripts/check_docs.py`
- `scripts/check_orders.py`
- `backend/tests/test_docs_contract.py`
- `backend/tests/test_new_order.py`
- `backend/tests/test_check_orders.py`
- `.opencode/skills/create-plan/SKILL.md`
- `.opencode/skills/to-plan/SKILL.md`
- `.opencode/skills/dispatch-orders/SKILL.md`
- `.opencode/skills/reconcile/SKILL.md`
- `.opencode/skills/write-focused-plan-test/SKILL.md`
- `.github/workflows/**`

## Compiler handoff

### Internal sequence A — topology and consolidation

- **Verified edit sites:** `README.md` — current 120-line identity/features/data/documentation page; reduce to identity, corrected quick start, license, and docs link.
- **Verified edit sites:** `docs/README.md` — current manifest routes through `INVENTORY.md`, area guides, and active index; replace with direct canonical-reference and orchestration routing.
- **Verified edit sites:** `docs/ARCHITECTURE.md`, `docs/API_REFERENCE.md`, `docs/DATA_MODEL.md`, `docs/DESIGN_SYSTEM.md`, `docs/UX_PATTERNS.md`, `docs/TESTING.md` — current root references containing useful prose and generated sections; move under `docs/canonical/` and add front matter with `title`, `purpose`, and `read-when`.
- **Verified sources to consolidate before removal:** `docs/areas/*.md`, `docs/areas/*.words.md`, `docs/grilling-docs/`, `docs/Analysis/`, `docs/table-tests/`, `docs/ideas/`, `docs/FL-05-maplab-navigation-acceptance.md`, and obsolete READMEs. Preserve only facts that meet the retention test; do not preserve historical evidence or redirects.
- **Verified deletion:** `docs/plans/active/table-testing-contract/` and `docs/plans/active/table-testing-records/` are active Plan folders and are explicitly deleted, not archived or redirected. Preserve unrelated active/done Plan bodies and nested orders.
- **Settled contracts:** six authored canonical references are exactly `ARCHITECTURE.md`, `API_REFERENCE.md`, `DATA_MODEL.md`, `DESIGN_SYSTEM.md`, `UX_PATTERNS.md`, and `TESTING.md`; `docs/canonical/README.md` is the generated seventh file and has no self-catalogue metadata requirement.
- **Constraints:** no archive folder, redirects, synthesized generated prose, product-contract redesign, or Plan/order semantic redesign.
- **Open questions:** bounded lookup of all current unique facts and surviving-link consumers before deletion; exact obsolete README/archive paths must be enumerated during compilation.

### Internal sequence B — checker and discovery contracts

- **Verified edit sites:** `scripts/check_docs.py` — current manifest completeness, area-guide, active/archive-index, inventory, generated-section, and Plan metadata checks; replace central representations and broad prose/ownership coverage with mechanical path, link, YAML, generated-freshness, and folder-local discovery checks.
- **Verified edit sites:** `backend/tests/test_docs_contract.py` — directly constructs/asserts `INVENTORY.md` and archive-index behavior; rewrite assertions for canonical metadata, generated canonical README, default writer idempotence, read-only `--check`, and direct Plan/order discovery.
- **Verified consumers:** `AGENTS.md`, `.opencode/skills/create-plan/SKILL.md`, `.opencode/skills/to-plan/SKILL.md`, `.opencode/skills/dispatch-orders/SKILL.md`, `.opencode/skills/reconcile/SKILL.md`, and surviving templates/Plans reference `**Areas:**`, area guides, or central indexes; remove those semantics without replacing them with free-form labels or canonical-reference links.
- **Settled contracts:** Plans retain title/location, `Status`, `Read trigger`, `Touches`, dependencies, and local order metadata as routing inputs. Remove `**Areas:**` from the Plan contract, checker, templates, surviving Plans, workflow skills/instructions, and generated behavior.
- **Settled contracts:** Plan/order discovery scans active and done folders and nested `orders/` directly; central `docs/INVENTORY.md`, `docs/plans/active/INDEX.md`, and `docs/plans/done/INDEX.md` are absent.
- **Constraints:** preserve existing order packet/artifact semantics and nested canonical order locations; do not redesign Plan lifecycle or order compilation.
- **Open questions:** bounded lookup of every checker test and workflow consumer that encodes removed central representations; identify exact generated blocks that remain justified after path moves.

### Internal sequence C — repair and proof

- **Verified consumers:** `docs/master-plans/**`, surviving `docs/plans/active/**`, surviving `docs/plans/done/**`, `docs/PLAN_TEMPLATE.md`, `docs/MASTER_PLAN_TEMPLATE.md`, `.github/workflows/**`, and surviving canonical references require path/link updates after Stage 1–2.
- **Verified generated truth:** API endpoint/schema sections and architecture script/registration inventories are generated from authoritative source; preserve and regenerate justified script, test, data-model, design-token, API, and schema outputs after moves.
- **Settled proof contract:** default invocation writes deterministic output; a second normal invocation produces no further diff; `--check` is read-only and passes immediately afterward. No generated block is hand-edited.
- **Focused commands supported by evidence:** `./.venv/Scripts/python.exe scripts/check_docs.py --help`; `./.venv/Scripts/python.exe scripts/check_docs.py --write-generated`; `./.venv/Scripts/python.exe scripts/check_docs.py --check`; `./.venv/Scripts/python.exe scripts/check_orders.py`.
- **Full proof commands:** use the configured commands in surviving `docs/canonical/TESTING.md` and `.github/workflows/**`; compiler must perform a bounded lookup and record the exact commands before orders are compiled. Include focused documentation/order contract tests and the repository’s configured backend/frontend gates, without inventing commands.
- **Constraints:** final diff/path audit must prove all named obsolete documentation, PR template, central inventory/indexes, area guides, and obsolete active table-testing Plans are absent; unrelated active/done Plan bodies and nested orders remain.
- **Open questions:** bounded lookup of current CI and testing commands, then record exact invocations and expected pre-existing failures (if any) for order proof.

## Acceptance

1. A fresh reader follows the root README and `docs/README.md` directly to the correct canonical reference or orchestration template without area guides or inventory/index indirection.
2. The six authored canonical references and generated `docs/canonical/README.md` exist under `docs/canonical/`; the six references expose valid `title`, `purpose`, and `read-when` YAML metadata.
3. One normal checker invocation writes deterministic output; a second normal invocation produces no further diff; `--check` is read-only and passes immediately afterward.
4. Justified generated API/schema/script/test/token inventories remain correct after path moves.
5. Active/done Plans and nested orders are discovered from folders and local metadata without either Plan index or `INVENTORY.md`; surviving Plans have no `**Areas:**` metadata or area-guide semantics.
6. All approved obsolete documentation, the PR template, and both table-testing active Plan folders are absent; useful current facts were consolidated first.
7. Surviving documentation links, AI entry instructions, CI commands, and setup instructions point to surviving paths and pass applicable checks.
8. Root README quick-start commands use actual repository paths and remain within the approved minimal scope.

## Exclusions

- No product behavior, API contract, data schema, visual design, UX contract, or test-policy redesign.
- No Plan/order workflow redesign beyond deleting unnecessary central representations and removing area metadata/semantics as explicitly approved.
- No redirects, archive folder, historical evidence preservation, commit, or push.
- Unrelated active/done Plan bodies, nested orders, and master plans must not be deleted or behaviorally rewritten. Bounded mechanical removal of `**Areas:**` metadata and repair of broken documentation links in those surviving files is authorized where required by this cleanup.
- No deletion or rewriting of `PLAN_TEMPLATE.md` or `MASTER_PLAN_TEMPLATE.md`; they are retained and mechanically updated only as required by the approved contract.
- No synthesized explanatory prose presented as generated truth.
- No adjacent documentation cleanup outside the explicitly approved deletion and consolidation set.
