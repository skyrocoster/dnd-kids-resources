# Production Nightly Deploys — ship every night without losing what you authored

> **Status:** Not next for Infra; second in the Infra queue, after Table Testing Records. Resumes after Field-Test Readiness. **Part of Stage 1 has already shipped out of band** — see *Landed early* below. First remaining stage: the rest of Stage 1 — the schema as data.

## Landed early (outside this plan)

The export half of Stage 1 shipped ahead of this plan, because authoring dungeon content was blocked
without it:

- `scripts/generate_export_schema.py` derives `data/generated/export_schema.json` from the
  `CREATE TABLE` statements in `init_database.py`. `--write` regenerates, `--check` runs in CI,
  `--check-db` reports drift against the live database.
- `export_db_seeds.py` takes its column lists from that manifest instead of a hand-written list,
  now covers `dungeons`, `map_layout` and `map_session_state`, fails loudly on a column mismatch
  instead of printing `[WARNING] Skipping export`, and refuses to overwrite a populated seed file
  from an empty table without `--allow-empty`. Every schema table must be classified as exported or
  excluded.
- `seed_database.py` gained `--dungeons` to restore the three dungeon tables.

**Still open in this plan:** `check_demo_database.py`'s hand-maintained `REQUIRED_COLUMNS`, additive
migrations, and the deploy path. `--check-db` currently reports one real drift — the live database
carries a `quests` table `init_database.py` has never heard of.

- **Area guide:** [Infra](../../../areas/infra.md)

## Touches

- `scripts/{check_demo_database,generate_export_schema,init_database}.py`
- `scripts/demo_up.ps1`
- `data/generated/export_schema.json`
- `backend/tests/**`

## What we're building & why

The repo is about to start serving real games, which changes what a deploy is allowed to cost. Today
it can cost everything: `scripts/init_database.py` drops all 23 tables before recreating them, and it
is the only path a schema change has into a running database. There is no migration system —
`migrate_spells.py`, `migrate_monsters.py` and `migrate_loom_v2.py` are one-off scripts with no
version table and no record of what has run. The evidence is already in the repo root:
`dnd_kids_resources.pre-demo-schema-20260721-123305.db`, a panic backup from the last time a schema
change met a live database.

The escape hatch does not hold either. `export_db_seeds.py` is the round-trip that is supposed to
carry authored data across a rebuild, but its `EXPORT_DEFINITIONS` omits `dungeons`, `map_layout`,
`map_session_state` and `quests` — precisely the tables nobody can regenerate. And because
`load_json_schema` catches `sqlite3.OperationalError` and prints `[WARNING] Skipping export`, a
renamed column drops an entire table from the seeds without failing the run. You would find out later.

That list was written by hand and fell behind. So was `check_demo_database.py`'s `REQUIRED_COLUMNS`,
which validates exactly one table. Both are hand-maintained restatements of a schema that already
exists in code, and both have drifted. The live database proves it: it carries a `quests` table
`init_database.py` has never heard of, and is missing `map_session_state`, which the in-progress
session-state router needs.

So this plan does two things. It stops restating the schema by hand — the schema becomes data,
derived from `init_database.py` and regenerated the way `check_docs.py` regenerates its inventories,
with `--check` failing when it goes stale. And it replaces the drop-and-recreate deploy with additive
migrations, so shipping a schema change stops being an event you take a backup before.

### Settled decisions

**`init_database.py` stays the canonical schema and the dev/test reset path.** `CLAUDE.md` requires
backend tests to build from the real schema rather than hand-copied fixture DDL, and that rule is
what keeps the tests honest. Migrations do not replace it — they are how an *existing* database
catches up to it. A freshly initialised database is already current and must be stamped as such, so
the runner never replays history onto a new file.

**The derived schema is parsed from `init_database.py`, never read from the live database.** Reading
the live database would encode the drift as truth — it would teach the tooling that `quests` is
canonical and `map_session_state` does not exist, which is exactly backwards. The generator's input
is the code; the live database is the thing being checked against it.

**Generated sections follow the existing `check_docs.py` mechanism, not a new one.** Same
`GENERATED:<marker>:START/END` markers, same stale-fails-on-`--check`, same `--write-generated`
refresh. There is one regeneration habit in this repo and this should not become the second.

**Export failures become fatal.** A skipped table is a data-loss event reported as a warning. The
whole reason the export exists is to be trusted at the moment a database is about to be rebuilt.

**Migrations are additive and idempotent by default.** Destructive schema changes — a real column
rename, a table split, a drop — are rare enough to be worth writing deliberately, with the backup in
hand, rather than giving the runner a general power it would only ever use by accident. A migration
that destroys data says so in its name and archives what it removes first.

**A timestamped backup is taken before migrations run, by the deploy, not by hand.** The panic backup
in the repo root is what taking backups by hand looks like.

**No Alembic, but borrow its vocabulary deliberately.** Alembic's autogenerate — the feature that
earns its config surface — works by diffing SQLAlchemy models against the live database, and this
data layer is raw `sqlite3` with no models (`backend/app/db.py`). Adopting it would mean either
hand-writing every migration anyway, or defining models for all 23 tables and thereby creating a
second canonical schema beside `init_database.py` — the exact drift this plan exists to end.

The concepts are still the right ones, so the runner uses Alembic's names rather than inventing its
own: a migration is a **revision**, the newest one is **head**, writing a version without running
anything is a **stamp** (what `init_database.py` does to a fresh database), and applying pending
revisions is an **upgrade**. This costs nothing and means the model transfers intact to Alembic,
Django migrations, or Flyway later. Ordered integer revisions are fine — the parent-pointer chain
Alembic uses exists to merge migrations written on parallel branches, which is not a problem a
single-author repo has.

**`quests` gets dropped — the feature was superseded by the Loom.** Confirmed orphaned: nothing in
`backend/`, `frontend/src/` or `scripts/` references the table, a quests router, or a quests schema.
It is the deliberate destructive case the decision above carves out, so the migration archives the
table's contents to JSON before dropping it. That matters for one row — "Lost Puppy in the Village",
with authored objectives, detail prose, and a `quest_giver` reference to an NPC — which exists
nowhere else and is the kind of content the Loom may want to re-express as a thread.

## Stages

1. **The schema as data.** *Mostly shipped early — see [Landed early](#landed-early-outside-this-plan).*
   `scripts/generate_export_schema.py` now derives the schema from `init_database.py`'s
   `CREATE TABLE` statements into `data/generated/export_schema.json`; `export_db_seeds.py` consumes
   it, export failures are fatal, and `dungeons`, `map_layout` and `map_session_state` are covered.
   **What remains in this stage:** regenerate `check_demo_database.py`'s `REQUIRED_COLUMNS` from the
   same manifest, so the last hand-maintained restatement of the schema goes away too.

2. **The migration runner.** A `schema_version` table, an ordered directory of revisions, and an
   upgrade that applies only what is pending and is safe to run twice. `init_database.py` stamps a
   fresh database at head so revisions never replay onto it. The first revisions settle the known
   drift — add `map_session_state`, and archive-then-drop the superseded `quests` table. That
   unblocks the in-progress session-state router, which currently needs a table the live database
   does not have.

3. **The deploy path.** Wire backup-then-migrate into `demo_up.ps1` ahead of the existing database
   check, so a nightly ship is one command that cannot silently skip the schema step. Document what
   to do when a migration fails and the backup is the way back. Fold the panic backup in the repo
   root into whatever backup location this establishes, and make sure it and its kin are ignored.

## Shipped

| Stage | What shipped (≤2 sentences) |
|-------|------------------------------|
