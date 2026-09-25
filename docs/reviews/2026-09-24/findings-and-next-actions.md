# Findings and next actions

**Review date:** 2026-09-24  
**Scope:** Prioritized findings, documentation/operations evidence, code-cleanup decisions, and preservation boundaries. This is not an implementation plan or authorization.

## Summary

Prioritize potential data loss, then API behavior and unresolved ownership/security questions. Documentation corrections are lower-risk work that can be scoped independently. Performance measurement and code cleanup are optional and need a concrete reason to proceed.

This is the collection's single priority list. Technical evidence lives in [backend and data](backend-and-data.md) or [frontend data flow](frontend-data-flow.md); documentation findings are recorded here. Evidence labels follow the [overview](README.md#how-to-read-the-findings). Priority reflects potential impact and evidence strength—not a claim that every risk is occurring.

## Ranked follow-up

### 1. Establish safe database reset and restore behavior

**Evidence:** The initializer and force-clear lists omit two state tables. Force-seeding clears the listed database tables even when only one import group is selected; missing or malformed inputs can become empty lists after clearing. The exporter includes `revealed_cells` and `at_the_table`, but the importer does not load them. See [reset-path findings](backend-and-data.md#destructive-and-incomplete-reset-paths) and [export/import differences](backend-and-data.md#data-tooling-pipeline).

**Decision needed:** Agree on reset scope, partial-selection force behavior, input-failure handling, and whether the two state tables must be restorable or explicitly excluded.

**Bounded verification:** After settling that contract, use a **disposable SQLite database only** to cover repeat initialization, partial `--force`, missing/malformed inputs before clearing, and the two tables' export/import behavior. Assert the intended safety behavior, not merely command completion. Never use an existing campaign database for proof.

### 2. Verify the list and nested player-spell contracts

**Evidence:** Spell and monster list endpoints default to 100 records; the inspected frontend calls supply no pagination arguments, while the test fixture has larger collections. Two nested player-spell projections omit optional fields. These are verified source facts, not demonstrated deployed defects. See [pagination](backend-and-data.md#cross-layer-pagination-risk--static-observation-not-a-confirmed-defect) and [spell projections](backend-and-data.md#player-spell-projections--verify-before-asserting-response-behavior).

**Decision needed:** Confirm whether browser lists must be complete or paginated, and which optional spell values belong in the nested endpoint responses.

**Bounded verification:** Use controlled fixtures with more than 100 list rows and assigned spells containing non-null `quick_rules` and `alternate_description`. Inspect the actual JSON, including defaults and omissions, and verify the relevant frontend consumer. Do not infer deployed database contents from fixture counts or treat default-valued assertions as sufficient proof.

### 3. Resolve data, contract, and deployment ownership

**Evidence:** Seed provenance/version/license/review history and the OpenAPI snapshot refresh process remain unknown. No authorization checks were found in the reviewed backend paths. Local Compose binds services to loopback, but that does not establish exposure in another deployment. See [unresolved data boundaries](backend-and-data.md#external-and-unresolved-data-boundaries), [generated contract](frontend-data-flow.md#api-boundary-and-contract-ownership), and [backend risks](backend-and-data.md#other-risks-and-unknowns).

**Decision needed:** Identify the owners of seed provenance and redistribution approval, OpenAPI refresh, and the intended deployment/access policy. These are separate questions; one answer does not settle the others.

**Bounded verification:** Trace declared seed-generation inputs and the snapshot refresh path, then inspect the intended deployment's actual trust boundary. Record remaining unknowns explicitly. Do not export live campaign data or infer a production authorization design from the reviewed source alone.

### 4. Correct documentation and clarify setup

The full-test guide has confirmed drift; the E2E install sequence needs clarification rather than manifest removal. A machine-specific config comment is optional, lower-priority cleanup. The evidence and correction boundaries are grouped below.

**Decision needed:** Keep warning-policy ownership and E2E install ownership explicit where unresolved. Correcting descriptions does not authorize changing exceptions, manifests, or service configuration.

#### Full-test guide drift

**Verified; high confidence.** Four descriptions in `docs/FULL_TEST_PROCESS.md` need reconciliation:

1. The guide says the runner does not exist and must be ported (`:112-117`). [`src/tools/full_test_process.py`](../../../src/tools/full_test_process.py) exists and documents invocation at lines 1-12; the [tools README](../../../src/tools/README.md#repository-tools) and `.opencode/agents/test-fixer.md:27-33` reference it.
2. The guide lists 17 checks and proceeds from shared-service health directly to the frontend build (`:44-67`). The runner defines 18, including `Frontend real-backend API tests` between those checks (`src/tools/full_test_process.py:64-86`).
3. The guide says no check drives live services and that real-backend coverage is outstanding (`:125-128`). The latter claim is stale because the runner includes `test:api`. That does not prove the test drives persistent development services: the [baseline](test-baseline.md#test-entrypoints) records a temporary database and bounded Uvicorn fixture.
4. The guide attributes two warning exceptions to `AGENTS.md` (`:87-93`) and later says they still need recording there (`:129-130`). The inspected testing/safety sections do not list them (`AGENTS.md:24-32,60-65`); the runner implements exception handling (`src/tools/full_test_process.py:40-51,139-153`).

**Bounded correction:** Reconcile existence, inventory, API coverage, and policy references from the checked-in runner. Do not invoke the aggregate process, alter its checks/exceptions, or silently decide the warning policy's long-term home.

#### E2E install ownership

**Verified package split; fresh-install behavior unknown.** Root `package.json:8-11` declares `@playwright/test` and `@axe-core/playwright` but has no scripts. `tests/e2e/playwright.config.ts:1` imports `@playwright/test`, while `frontend/package.json:17` supplies the command pointing to that root-level configuration. `frontend/README.md:18-29` describes Chromium installation and execution without clearly explaining the root package's role.

Dependencies resolved in the [recorded checkout](test-baseline.md#dependencies-and-preconditions), not a fresh install. Establish the supported install sequence before documenting it; retain both manifests unless separate evidence supports consolidation. Keep [Storybook launch contexts](README.md#service-lifecycle-and-operational-entrypoints) distinct: Compose `6007`, local script/Playwright `6006`.

#### External-path comment

`pyproject.toml:1` says its Ruff/pytest settings mirror `G:\ChessMoveTrainer\pyproject.toml`. The note is machine-specific, but its provenance and usefulness are unknown; the external path was not inspected. If no longer useful, remove only the comment or replace it with an in-repository explanation. The path alone does not establish configuration drift or justify changing settings.

### 5. Measure performance only for a defined decision

**Evidence:** The [test baseline](test-baseline.md#measured-finite-run) contains one passing run per selected surface, with exact commands and wall times. It is historical evidence, not a stable benchmark or regression threshold.

**Decision needed:** Choose a target surface, the performance question, and a comparable environment before running anything.

**Bounded verification:** Take three comparable sequential samples of only that surface. Preserve the baseline's runtime, locked dependencies, inputs, and finite command/tool timeouts; record every sample and a median separately from runner-reported duration. Do not rerun all suites merely to create a benchmark. See [reproduction guidance](test-baseline.md#reproduction-and-interpretation).

### 6. Consider code cleanup after behavior and ownership checks

**Evidence:** The [frontend candidates](frontend-data-flow.md#frontend-code-candidates) cover `StubPage`, `deriveTokensStub`, query helpers without observed app use, and repeated polling mechanics. The [player-spell finding](backend-and-data.md#player-spell-projections--verify-before-asserting-response-behavior) covers repeated SQL expressions and the response-test limits. No unused maintenance script was confirmed.

**Decision needed:** Confirm whether the placeholders and query helpers are intentional and whether a polling extraction is worth its behavior risk. Projection edits depend on the contract verification in action 2.

**Bounded verification:** Use response tests for projection changes, caller/component checks for approved placeholder removal, and both player-hook suites for any polling extraction. Do not expand cleanup into a cache redesign, new route, dependency removal, or broad abstraction. Among optional cleanup candidates, the original review ranked the narrow SQL duplication first, then `StubPage`, `deriveTokensStub`, query helpers, and finally polling extraction; that order is not deletion approval.

## Script disposition and preservation

**No unused or obsolete script was confirmed.** Lack of app imports is expected for operator-invoked tools. Keep the following distinctions when considering future cleanup:

| Surface | Classification and evidence |
| --- | --- |
| `src/tools/full_test_process.py` | Manually invoked repository runner with README/agent references, as recorded in the [guide-drift finding](#full-test-guide-drift). Stale documentation does not make it unused. |
| Schema/export, quick-rule, and legacy conversion tools | Manual data maintenance, documented in `src/tools/README.md:6-14` and imported by persistence/migration tests. [Backend and data](backend-and-data.md#data-tooling-pipeline) retains the invocation, transformation, and write-risk evidence. |
| `backend/migrations/migrate_map_obstacle_state.py`, `migrate_loom_v2.py` | One-time operator migrations, each documenting a `python -m` command (`:2-10` and `:2-20`, respectively). They are not part of API router registration (`backend/app/main.py:65-81`). Verify target schema and backups; [migration effects](backend-and-data.md#other-risks-and-unknowns) include destructive map resets and a legacy Loom target. |
| `ComponentDemoPage`, frontend test/theme tools | Intentional development route, active package entrypoint, and manual generators—not unreachable production features. See [frontend usage evidence](frontend-data-flow.md#intentional-development-surfaces). |

Preserve database-volume protections in `dev.ps1`, the root README, and `docs/DEVELOPMENT_SERVICES.md`. Preserve completed Plans, grilling/master-plan records, and user-owned `scratch/` (`AGENTS.md:62-65`). No generated builds, dependencies, or secrets were inspected for cleanup. The [automation observation](README.md#commands-and-maintenance-tools) does not authorize adding CI or deleting tooling.

## Boundaries for later work

The review's source observations and historical passes remain distinct from future behavioral proof. Settle material product, data, security, provenance, and ownership choices with the user or responsible owner. Scope each implementation separately, protect existing data, and use finite verification focused on the agreed behavior. No application changes or operational commands are authorized by this list.
