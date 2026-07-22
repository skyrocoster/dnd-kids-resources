# Repo Infra Area Guide

> **Active plan:** [Production Nightly Deploys](../plans/active/production-nightly-deploys.md) — next up.

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
- Create a focused plan before repo-wide tooling or coverage work.
- **The schema is stated once, in `init_database.py`.** Table and column lists elsewhere are
  generated from it and staleness-checked; do not hand-maintain a second copy.
- `data/generated/export_schema.json` is generated and committed — CI checks it on a fresh checkout.
  Never hand-edit it.

## Work queue

- [Production Nightly Deploys](../plans/active/production-nightly-deploys.md) — schema-as-data
  generation, additive migrations, and a deploy that backs up before it migrates.
- Create a focused plan before changing shared backend infra or repo-wide test tooling.

## Cross-references

`../TESTING.md` and `../README.md`.
