# Infra Area Guide

- **Read trigger:** Shared backend infra, documentation governance, or repo-wide test tooling

## Scope

Owns work that is generic to the repository rather than owned by one product area: shared backend
infrastructure (`backend/app/db.py`, `backend/app/main.py`), cross-cutting test coverage and test
tooling, and other repo-wide plumbing that does not belong to a single feature's area guide. It does
not own any product behavior, API contract, or data model — those stay with their owning area guide.

## Read first

`../TESTING.md`, `../ARCHITECTURE.md`, and `../README.md`.

## Source map

- Backend infra: `backend/app/db.py`, `backend/app/main.py`.
- Database lifecycle: `scripts/init_database.py` (canonical schema), `scripts/seed_database.py`
  (restore), `scripts/export_db_seeds.py` (backup), `scripts/generate_export_schema.py` (schema
  generator).
- Tests: `backend/tests/` broadly, plus `pytest.ini`.

## Change map

| Change type | Source globs |
|---|---|
| Backend plumbing | `backend/app/{__init__,db,main,schemas}.py`<br>`backend/app/routers/__init__.py` |
| Backend root | `backend/__init__.py`<br>`backend/requirements.txt` |
| Backend test plumbing | `backend/tests/conftest.py`<br>`backend/tests/routers/__init__.py` |
| API and test plumbing | `frontend/src/api/**`<br>`frontend/src/test/**` |
| Database lifecycle | `scripts/init_database.py`<br>`scripts/seed_database.py`<br>`scripts/export_db_seeds.py`<br>`scripts/generate_export_schema.py` |
| Documentation and work-order tooling | `scripts/check_docs.py`<br>`scripts/check_orders.py`<br>`scripts/new_order.py`<br>`scripts/order_telemetry.py`<br>`scripts/model_prices.json`<br>`backend/tests/test_new_order.py`<br>`backend/tests/test_order_telemetry.py` |
| Check wrappers (summarise instead of dumping full tool output) | `scripts/stage_check.py`<br>`scripts/order_check.py`<br>`backend/tests/test_check_wrappers.py` |
| Read discipline enforced by the harness (executor: no re-reading an edited file; compiler: no unbounded read of a large file) | `scripts/read_guard.py`<br>`scripts/large_read_guard.py`<br>`backend/tests/test_read_guard.py`<br>`backend/tests/test_large_read_guard.py`<br>`.opencode/plugin/**` |
| Work-order telemetry record | `docs/plans/telemetry.jsonl`<br>`docs/plans/telemetry-archive/**`<br>`docs/plans/telemetry-paused.md` (`docs/plans/telemetry-log.md` is generated from the sidecar — never hand-edited; **collection is paused** while the paused marker exists, and every recording command is a no-op until `order_telemetry.py --resume` deletes it) |
| CI | `.github/**` |
| Generated data | `data/generated/**` |
| Frontend config | `frontend/package.json`<br>`frontend/package-lock.json`<br>`frontend/tsconfig.json`<br>`frontend/tsconfig.app.json`<br>`frontend/tsconfig.node.json`<br>`frontend/vite.config.ts`<br>`frontend/.gitignore`<br>`frontend/.oxlintrc.json`<br>`frontend/index.html`<br>`frontend/README.md`<br>`frontend/known-test-failures.json`<br>`frontend/public/**` |
| Shell scripts and tooling | `scripts/demo_up.ps1`<br>`scripts/demo_down.ps1`<br>`scripts/start_server.ps1`<br>`scripts/stop_server.ps1`<br>`scripts/open_responsive_checks.ps1`<br>`scripts/opencode_remote.ps1` |
| Unclaimed helper scripts | `scripts/check_demo_database.py`<br>`scripts/generate_spell_quick_rules.py`<br>`scripts/generate_weapon_quick_rules.py` |
| Database binary | `data/kids_resources.db` |
| Seed corrections | `data/seeds/_generate_corrections.py`<br>`data/seeds/weapon_quick_rules_review.json` |

## Tooling

**`scripts/generate_export_schema.py` — the schema generator.** `init_database.py` is the canonical
schema; this derives `data/generated/export_schema.json` from its `CREATE TABLE` statements so that
nothing downstream restates the schema by hand.

| Command | Use |
|---|---|
| `--write` | Regenerate the manifest after any schema change. |
| `--check` | Fail if the manifest is stale. Runs in CI on every PR and push to `main`. |
| `--check-db` | Report drift between the canonical schema and the live database. |

Reach for `--check-db` first when an export fails or a table looks wrong — it names the mismatch
directly. Anything that needs a table or column list should read the manifest rather than repeat it;
see [../DATA_MODEL.md](../DATA_MODEL.md#rebuilding-the-database).

## Invariants

- This guide never claims ownership of a router or feature that already has an owning area guide;
  it only covers what's genuinely cross-cutting or otherwise homeless.
- **The schema is stated once, in `init_database.py`.** Table and column lists elsewhere are
  generated from it and staleness-checked; do not hand-maintain a second copy.
- `data/generated/export_schema.json` is generated and committed — CI checks it on a fresh checkout.
  Never hand-edit it.

## Deferred

- Shared backend infra and repo-wide test tooling remain deferred and need a design phase before changes.

## Cross-references

`../TESTING.md` and `../README.md`.
